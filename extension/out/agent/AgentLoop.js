"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentLoop = void 0;
class AgentLoop {
    phaseName;
    phaseTitle;
    client;
    tools;
    context;
    onProgress;
    chatLogger;
    isCancelled;
    messages = [];
    totalUsage = {
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        cachedPromptTokens: 0,
    };
    constructor(phaseName, phaseTitle, client, tools, context, onProgress, chatLogger, isCancelled) {
        this.phaseName = phaseName;
        this.phaseTitle = phaseTitle;
        this.client = client;
        this.tools = tools;
        this.context = context;
        this.onProgress = onProgress;
        this.chatLogger = chatLogger;
        this.isCancelled = isCancelled;
    }
    getTotalUsage() {
        return { ...this.totalUsage };
    }
    async run(maxTurns = 25) {
        const startTimeMs = Date.now();
        // 1. Initialize the isolated sub-loop conversation with the dynamic phase directive
        this.messages.push({
            role: "user",
            content: this.context.phasePrompt,
        });
        if (this.chatLogger) {
            const cfg = this.client.getConfig();
            await this.chatLogger.logPhaseStart({
                phaseTitle: this.phaseTitle || this.phaseName,
                phaseFileName: this.phaseName,
                model: cfg.model,
                provider: cfg.provider,
                systemPromptFiles: ["agent/PROTOCOL.md", "docs/experiment.md", "agent/SKILL.md"],
                inputPromptFiles: [
                    this.phaseName.includes("/") ? this.phaseName : `analysis/${this.phaseName}`,
                    "docs/notes.md",
                    "docs/llm.md",
                    "docs/experiment.md",
                ],
            });
        }
        let turn = 0;
        let completedSummary = "";
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
            let lastError = null;
            while (attempt <= maxRetries) {
                attempt++;
                if (this.isCancelled && this.isCancelled()) {
                    break;
                }
                try {
                    response = await this.client.chat({
                        system: this.context.systemPrompt,
                        messages: this.messages,
                        tools: this.tools.getDefinitions(),
                        onToken: (text) => {
                            this.onProgress({ type: "text", data: text });
                        },
                    });
                    lastError = null;
                    break; // Success!
                }
                catch (err) {
                    lastError = err;
                    const isTimeout = err.name === "TimeoutError" ||
                        err.name === "AbortError" ||
                        /timeout|aborted|ETIMEDOUT|ECONNRESET/i.test(err.message || "");
                    if (isTimeout && attempt <= maxRetries && (!this.isCancelled || !this.isCancelled())) {
                        const backoffMs = attempt * 3000;
                        this.onProgress({
                            type: "thought",
                            data: `⚠️ Turn ${turn} timed out on attempt ${attempt}/${maxRetries + 1} (${err.message}). Retrying in ${backoffMs / 1000}s...`,
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
            });
            // Log assistant response to llm_chat.log
            if (this.chatLogger) {
                await this.chatLogger.logAssistantResponse(turn, response.content, response.tool_calls, response.usage);
            }
            // Check for output limit truncation
            if (response.truncationDetected) {
                const warnMsg = `⚠️ Output limit reached (finish_reason: "${response.finishReason || "length"}", tokens: ${response.usage.completionTokens}). Generation was truncated.`;
                this.onProgress({
                    type: "thought",
                    data: warnMsg,
                });
                if (this.chatLogger) {
                    await this.chatLogger.logTruncationWarning(turn, response.finishReason || "length", response.usage.completionTokens);
                }
            }
            // Check if complete_phase tool was called or if finished
            if (response.tool_calls && response.tool_calls.length > 0) {
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
                    // Protect conversation context from massive raw dumps (keep head and tail checkpoints)
                    let toolMessageContent = result.content;
                    const MAX_TOOL_CHARS = 24000;
                    if (toolMessageContent && toolMessageContent.length > MAX_TOOL_CHARS) {
                        const head = toolMessageContent.slice(0, 12000);
                        const tail = toolMessageContent.slice(-10000);
                        const omitted = toolMessageContent.length - 22000;
                        toolMessageContent = `${head}\n\n... [⚠️ Output truncated: ${omitted.toLocaleString()} characters omitted to preserve context economy. See complete output in workspace/logs/ or inspect with 'read_file'] ...\n\n${tail}`;
                    }
                    // Append tool result to messages
                    this.messages.push({
                        role: "tool",
                        tool_call_id: tc.id,
                        tool_name: tc.name,
                        content: toolMessageContent,
                    });
                    // Log tool result to llm_chat.log
                    if (this.chatLogger) {
                        await this.chatLogger.logToolResult(tc.name, tc.id, result.content, result.isError);
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
            }
            else {
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
                }
                else if (response.truncationDetected) {
                    // If response was truncated and tool call failed to parse, notify the model explicitly
                    this.messages.push({
                        role: "user",
                        content: `[System Notice]: Your response reached the maximum output token limit (finish_reason: "${response.finishReason || "length"}", completion tokens: ${response.usage.completionTokens}). Any attempted tool call was truncated before completion and could not be parsed. Please write the output in smaller sections or verify that Max Output Tokens in settings is set sufficiently high.`,
                    });
                }
                else {
                    // If no tool was called and no completion indicated, prompt the agent to proceed
                    this.messages.push({
                        role: "user",
                        content: "Please execute the required tools to fulfill the objectives of this phase, or call complete_phase when finished.",
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
}
exports.AgentLoop = AgentLoop;
//# sourceMappingURL=AgentLoop.js.map