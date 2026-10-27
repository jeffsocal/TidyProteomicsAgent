import { ChatMessage, TokenUsage } from "../types";
import { ContextBundle } from "./ContextBuilder";
import { ToolRegistry } from "../tools/ToolRegistry";
import { ProviderClient } from "../llm/ProviderClient";
import { ChatLogger } from "./ChatLogger";

export interface LoopResult {
  success: boolean;
  summary: string;
  tokensUsed: TokenUsage;
  phaseName: string;
  turnCount: number;
}

export class AgentLoop {
  private messages: ChatMessage[] = [];
  private totalUsage: TokenUsage = {
    promptTokens: 0,
    completionTokens: 0,
    totalTokens: 0,
    cachedPromptTokens: 0,
  };

  constructor(
    private phaseName: string,
    private phaseTitle: string,
    private client: ProviderClient,
    private tools: ToolRegistry,
    private context: ContextBundle,
    private onProgress: (event: {
      type: "thought" | "tool_start" | "tool_end" | "text" | "tokens";
      data: any;
    }) => void,
    private chatLogger?: ChatLogger,
    private isCancelled?: () => boolean
  ) {}

  public getTotalUsage(): TokenUsage {
    return { ...this.totalUsage };
  }

  public async run(maxTurns = 30): Promise<LoopResult> {
    const startTimeMs = Date.now();

    // Set active phase on tools for log mirroring and phase scoping
    this.tools.setActivePhase(this.phaseName);

    // 1. Initialize the isolated sub-loop conversation with the dynamic phase directive
    this.messages.push({
      role: "user",
      content: this.context.phasePrompt,
      turn: 0,
    });

    if (this.chatLogger) {
      this.chatLogger.setPhase(this.phaseName);
      const cfg = this.client.getConfig();
      await this.chatLogger.logPhaseStart({
        phaseTitle: this.phaseTitle || this.phaseName,
        phaseFileName: this.phaseName,
        model: cfg.model,
        provider: cfg.provider,
        systemPromptFiles: [
          "agent/PROTOCOL.md",
        ],
        inputPromptFiles: [
          this.phaseName.includes("/") ? this.phaseName : `analysis/${this.phaseName}`,
          ...(this.context.phaseSkillFiles && this.context.phaseSkillFiles.length > 0
            ? this.context.phaseSkillFiles
            : []),
          "docs/experiment.md",
          "Executive Blackboard (Active State & Prior Summary)",
          "docs/llm.md",
        ],
      });
    }

    let turn = 0;
    let completedSummary = "";
    let consecutiveNoToolTurns = 0;

    while (turn < maxTurns) {
      if (this.isCancelled && this.isCancelled()) {
        const stopSummary = "Execution stopped by user.";
        if (this.chatLogger) {
          const durationSeconds = Math.round((Date.now() - startTimeMs) / 1000);
          await this.chatLogger.logPhaseEnd({
            phaseTitle: this.phaseTitle || this.phaseName,
            phaseFileName: this.phaseName,
            success: false,
            summary: stopSummary,
            durationSeconds,
            tokensUsed: this.totalUsage,
            turnCount: turn,
          });
        }
        return {
          success: false,
          summary: stopSummary,
          tokensUsed: this.totalUsage,
          phaseName: this.phaseName,
          turnCount: turn,
        };
      }

      turn++;
      this.onProgress({ type: "thought", data: `Starting Turn ${turn}/${maxTurns}...` });

      // Call LLM with the persistent system prompt (which gets cached) and the local messages
      let response;
      const maxRetries = 2;
      let attempt = 0;
      let lastError: any = null;

      while (attempt <= maxRetries) {
        attempt++;
        if (this.isCancelled && this.isCancelled()) {
          break;
        }

        try {
          response = await this.client.chat({
            system: this.context.systemPrompt,
            messages: this.messages,
            tools: this.tools.getDefinitions(this.phaseName, this.context?.phaseContent),
            onToken: (text) => {
              this.onProgress({ type: "text", data: text });
            },
          });
          lastError = null;
          break; // Success!
        } catch (err: any) {
          lastError = err;
          const isRetryable =
            err.isRetryable === true ||
            err.isTimeout === true ||
            err.isNetworkError === true ||
            err.name === "TimeoutError" ||
            err.name === "AbortError" ||
            (err.status === 429) ||
            (err.status >= 500 && err.status <= 504) ||
            /timeout|aborted|ETIMEDOUT|ECONNRESET|ECONNREFUSED|ENOTFOUND|ConnectTimeoutError|fetch failed|rate limit|temporar/i.test(
              err.message || ""
            ) ||
            (err.cause &&
              /timeout|aborted|ETIMEDOUT|ECONNRESET|ECONNREFUSED|ENOTFOUND|ConnectTimeoutError/i.test(
                (err.cause.name || "") + " " + (err.cause.code || "") + " " + (err.cause.message || "")
              ));

          if (isRetryable && attempt <= maxRetries && (!this.isCancelled || !this.isCancelled())) {
            const backoffMs = attempt * 3000;
            const shortReason = err.message ? (err.message.length > 80 ? err.message.slice(0, 77) + "..." : err.message) : "Network/API glitch";
            this.onProgress({
              type: "thought",
              data: `Turn ${turn} connection/API glitch on attempt ${attempt}/${maxRetries + 1} (${shortReason}). Retrying in ${backoffMs / 1000}s...`,
            });
            await new Promise((r) => setTimeout(r, backoffMs));
            continue;
          }
          break;
        }
      }

      if (!response) {
        const errorSummary = lastError
          ? `LLM API Error during turn ${turn}: ${lastError.message}`
          : "Execution stopped by user.";
        if (this.chatLogger) {
          const durationSeconds = Math.round((Date.now() - startTimeMs) / 1000);
          await this.chatLogger.logPhaseEnd({
            phaseTitle: this.phaseTitle || this.phaseName,
            phaseFileName: this.phaseName,
            success: false,
            summary: errorSummary,
            durationSeconds,
            tokensUsed: this.totalUsage,
            turnCount: turn,
          });
        }

        return {
          success: false,
          summary: errorSummary,
          tokensUsed: this.totalUsage,
          phaseName: this.phaseName,
          turnCount: turn,
        };
      }

      // Accumulate tokens
      this.totalUsage.promptTokens += response.usage.promptTokens;
      this.totalUsage.completionTokens += response.usage.completionTokens;
      this.totalUsage.totalTokens += response.usage.totalTokens;
      this.totalUsage.cachedPromptTokens =
        (this.totalUsage.cachedPromptTokens || 0) + (response.usage.cachedPromptTokens || 0);

      // Real-time token notification for UI updates
      this.onProgress({
        type: "tokens",
        data: {
          turn,
          turnUsage: response.usage,
          totalUsage: { ...this.totalUsage },
        },
      });

      // Append assistant response to local isolated trajectory
      this.messages.push({
        role: "assistant",
        content: response.content,
        tool_calls: response.tool_calls,
        turn,
      });

      // Log assistant response to llm_chat.log
      if (this.chatLogger) {
        await this.chatLogger.logAssistantResponse(
          turn,
          response.content,
          response.tool_calls,
          response.usage
        );
      }

      // Check for output limit truncation
      if (response.truncationDetected) {
        const warnMsg = `Output limit reached (finish_reason: "${response.finishReason || "length"}", tokens: ${response.usage.completionTokens}). Generation was truncated.`;
        this.onProgress({
          type: "thought",
          data: warnMsg,
        });
        if (this.chatLogger) {
          await this.chatLogger.logTruncationWarning(
            turn,
            response.finishReason || "length",
            response.usage.completionTokens
          );
        }
      }

      // Check if complete_phase or fail_phase tool was called or if finished
      if (response.tool_calls && response.tool_calls.length > 0) {
        consecutiveNoToolTurns = 0;
        for (const tc of response.tool_calls) {
          this.onProgress({
            type: "tool_start",
            data: { name: tc.name, args: tc.args },
          });

          // Execute tool
          const result = await this.tools.execute(tc.name, tc.args);

          this.onProgress({
            type: "tool_end",
            data: { name: tc.name, result: result.content, isError: result.isError },
          });

          // Protect conversation context from runaway dumps (preserve full context for intentional file reads)
          let toolMessageContent = result.content;
          let maxChars = 24000;
          if (tc.name === "read_file") {
            // read_file is intentional and bounded by startLine/maxLines; give generous headroom
            maxChars = 60000;
          } else if (tc.name === "execute_command") {
            // Guard against runaway stdout while keeping substantial head and tail diagnostics
            maxChars = 32000;
          } else if ([
            "list_directory",
            "check_checkpoint_gate",
            "tpa_health",
            "tpa_operations",
            "tpa_export_state",
            "file_exists",
          ].includes(tc.name)) {
            maxChars = 8000;
          }

          if (toolMessageContent && toolMessageContent.length > maxChars) {
            const headChars = Math.floor(maxChars * 0.55);
            const tailChars = Math.floor(maxChars * 0.35);
            const head = toolMessageContent.slice(0, headChars);
            const tail = toolMessageContent.slice(-tailChars);
            const omitted = toolMessageContent.length - (headChars + tailChars);
            toolMessageContent = `${head}\n\n... [Output truncated: ${omitted.toLocaleString()} characters omitted to preserve context economy. See complete output in workspace/logs/ or inspect with 'read_file'] ...\n\n${tail}`;
          }

          // Append tool result to messages
          this.messages.push({
            role: "tool",
            tool_call_id: tc.id,
            tool_name: tc.name,
            content: toolMessageContent,
            turn,
          });

          // Log tool result to phase chat log
          if (this.chatLogger) {
            await this.chatLogger.logToolResult(tc.name, tc.id, result.content, result.isError, tc.args);
          }

          if (tc.name === "fail_phase") {
            const failReason = tc.args.reason || "Phase gate or checkpoint failed";
            const actionable = tc.args.actionableInsights || "";
            const summary = actionable
              ? `[Failed] Pre-flight Gate / Checkpoint: ${failReason}\n\nActionable Insights:\n${actionable}`
              : `[Failed] Pre-flight Gate / Checkpoint: ${failReason}`;
            const durationSeconds = Math.round((Date.now() - startTimeMs) / 1000);

            if (this.chatLogger) {
              await this.chatLogger.logPhaseEnd({
                phaseTitle: this.phaseTitle || this.phaseName,
                phaseFileName: this.phaseName,
                success: false,
                summary,
                durationSeconds,
                tokensUsed: this.totalUsage,
                turnCount: turn,
              });
            }

            return {
              success: false,
              summary,
              tokensUsed: this.totalUsage,
              phaseName: this.phaseName,
              turnCount: turn,
            };
          }

          if (tc.name === "complete_phase") {
            completedSummary = tc.args.summary || response.content;
            const durationSeconds = Math.round((Date.now() - startTimeMs) / 1000);

            if (this.chatLogger) {
              await this.chatLogger.logPhaseEnd({
                phaseTitle: this.phaseTitle || this.phaseName,
                phaseFileName: this.phaseName,
                success: true,
                summary: completedSummary,
                durationSeconds,
                tokensUsed: this.totalUsage,
                turnCount: turn,
              });
            }

            return {
              success: true,
              summary: completedSummary,
              tokensUsed: this.totalUsage,
              phaseName: this.phaseName,
              turnCount: turn,
            };
          }
        }
      } else {
        consecutiveNoToolTurns++;
        // If model didn't call any tools, check if text indicates completion
        if (response.content.includes("PHASE_COMPLETED") || response.content.includes("CHECKPOINT_PASSED")) {
          const durationSeconds = Math.round((Date.now() - startTimeMs) / 1000);
          if (this.chatLogger) {
            await this.chatLogger.logPhaseEnd({
              phaseTitle: this.phaseTitle || this.phaseName,
              phaseFileName: this.phaseName,
              success: true,
              summary: response.content,
              durationSeconds,
              tokensUsed: this.totalUsage,
              turnCount: turn,
            });
          }

          return {
            success: true,
            summary: response.content,
            tokensUsed: this.totalUsage,
            phaseName: this.phaseName,
            turnCount: turn,
          };
        } else if (this.isPhaseFailureOrHalt(response.content)) {
          // Model output text indicating a pre-flight gate failure, blocked phase, or halt directive
          const durationSeconds = Math.round((Date.now() - startTimeMs) / 1000);
          if (this.chatLogger) {
            await this.chatLogger.logPhaseEnd({
              phaseTitle: this.phaseTitle || this.phaseName,
              phaseFileName: this.phaseName,
              success: false,
              summary: response.content,
              durationSeconds,
              tokensUsed: this.totalUsage,
              turnCount: turn,
            });
          }

          return {
            success: false,
            summary: response.content,
            tokensUsed: this.totalUsage,
            phaseName: this.phaseName,
            turnCount: turn,
          };
        } else if (consecutiveNoToolTurns >= 2) {
          // Model repeatedly returned conversational text without tool actions; halt to avoid burning tokens in a loop
          const summary = `Execution halted: Agent stopped calling tools and provided instructions to user:\n\n${response.content}`;
          const durationSeconds = Math.round((Date.now() - startTimeMs) / 1000);
          if (this.chatLogger) {
            await this.chatLogger.logPhaseEnd({
              phaseTitle: this.phaseTitle || this.phaseName,
              phaseFileName: this.phaseName,
              success: false,
              summary,
              durationSeconds,
              tokensUsed: this.totalUsage,
              turnCount: turn,
            });
          }

          return {
            success: false,
            summary,
            tokensUsed: this.totalUsage,
            phaseName: this.phaseName,
            turnCount: turn,
          };
        } else if (response.truncationDetected) {
          // If response was truncated and tool call failed to parse, notify the model explicitly
          this.messages.push({
            role: "user",
            content: `[System Notice]: Your response reached the maximum output token limit (finish_reason: "${response.finishReason || "length"}", completion tokens: ${response.usage.completionTokens}). Any attempted tool call was truncated before completion and could not be parsed. Please write the output in smaller sections or verify that Max Output Tokens in settings is set sufficiently high.`,
          });
        } else {
          // If no tool was called and no completion or failure indicated, prompt the agent to proceed
          this.messages.push({
            role: "user",
            content: "Please execute the required tools to fulfill the objectives of this phase, or call complete_phase when finished, or call fail_phase if a prerequisite/gate failed.",
          });
        }
      }
    }

    const failureSummary = `Turn limit reached (${maxTurns} turns) without completing phase checkpoints.`;
    const durationSeconds = Math.round((Date.now() - startTimeMs) / 1000);

    if (this.chatLogger) {
      await this.chatLogger.logPhaseEnd({
        phaseTitle: this.phaseTitle || this.phaseName,
        phaseFileName: this.phaseName,
        success: false,
        summary: failureSummary,
        durationSeconds,
        tokensUsed: this.totalUsage,
        turnCount: maxTurns,
      });
    }

    return {
      success: false,
      summary: failureSummary,
      tokensUsed: this.totalUsage,
      phaseName: this.phaseName,
      turnCount: maxTurns,
    };
  }

  private isPhaseFailureOrHalt(content: string): boolean {
    if (!content) return false;
    const lower = content.toLowerCase();

    // Explicit gate failure, blocked phase, or halt keywords
    const failurePatterns = [
      /pre-flight\s+gate\s+fail/i,
      /specification\s+gate\s+fail/i,
      /checkpoint\s+gate\s+fail/i,
      /\bgate\s+failed\b/i,
      /\bphase\s+(?:[0-9a-zA-Z_]+\s+)?(?:is\s+blocked|remains\s+blocked|cannot\s+be\s+completed|is\s+halted)\b/i,
      /\bphase_failed\b/i,
      /\bphase_blocked\b/i,
      /\bphase_halted\b/i,
      /\bblocked_specification_gate\b/i,
      /\bhalt(?:ed)?\s+(?:immediately\s+)?with\s+status\s+`?failed`?/i,
      /\bhalt\s+directive\b/i,
    ];

    if (failurePatterns.some((pattern) => pattern.test(content))) {
      return true;
    }

    if (
      content.includes("❌") &&
      (lower.includes("placeholder") ||
        lower.includes("blocked") ||
        lower.includes("rerun phase") ||
        lower.includes("gate"))
    ) {
      return true;
    }

    return false;
  }
}

