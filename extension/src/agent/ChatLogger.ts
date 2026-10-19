import * as fs from "fs/promises";
import * as path from "path";
import { TokenUsage, ToolCall } from "../types";

export class ChatLogger {
  private logPath: string;
  private writeQueue: Promise<void> = Promise.resolve();

  constructor(private workspaceRoot: string, logFileName = "logs/llm_chat.md") {
    this.workspaceRoot = workspaceRoot || "";
    this.logPath = this.resolveLogPath(logFileName);
  }

  public setWorkspaceRoot(newRoot: string) {
    this.workspaceRoot = newRoot || "";
    this.logPath = this.resolveLogPath("logs/llm_chat.md");
  }

  public getLogPath(): string {
    return this.logPath;
  }

  private resolveLogPath(fileName: string): string {
    if (path.isAbsolute(fileName)) {
      return fileName;
    }
    if (!this.workspaceRoot) return "";
    return path.join(this.workspaceRoot, fileName);
  }

  private async append(text: string): Promise<void> {
    if (!this.workspaceRoot || !this.logPath) return;
    this.writeQueue = this.writeQueue.then(async () => {
      try {
        const dir = path.dirname(this.logPath);
        await fs.mkdir(dir, { recursive: true });
        await fs.appendFile(this.logPath, text + "\n", "utf-8");
      } catch (err) {
        console.error(`[ChatLogger] Failed to write to ${this.logPath}:`, err);
      }
    });
    return this.writeQueue;
  }

  /**
   * Logs phase initialization. Documents WHICH prompts were sent into the persistent system frame
   * and dynamic input directives WITHOUT dumping their entire text contents, keeping the log lean.
   */
  public async logPhaseStart(params: {
    phaseTitle: string;
    phaseFileName: string;
    model: string;
    provider: string;
    systemPromptFiles?: string[];
    inputPromptFiles?: string[];
  }): Promise<void> {
    const timestamp = new Date().toISOString();
    const systemFiles = params.systemPromptFiles || [
      "agent/PROTOCOL.md",
      "docs/experiment.md",
      "agent/SKILL.md",
    ];
    const inputFiles = params.inputPromptFiles || [
      params.phaseFileName.includes("/") ? params.phaseFileName : `analysis/${params.phaseFileName}`,
      "docs/notes.md",
      "docs/llm.md",
      "docs/experiment.md",
    ];

    const lines = [
      "",
      "---",
      "",
      `# [${timestamp}] 🚀 Phase Start: ${params.phaseTitle}`,
      `- **Phase File**: \`${params.phaseFileName}\``,
      `- **Model**: \`${params.model}\` | **Provider**: \`${params.provider}\``,
      "",
      "### ⚙️ Persistent System Frame (Sent & Cached Prefix)",
      ...systemFiles.map((f) => `- \`${f}\``),
      "",
      "### 📥 Input Prompts & Blackboard Directives (Turn 1)",
      ...inputFiles.map((f) => `- \`${f}\``),
      "",
    ];

    await this.append(lines.join("\n"));
  }

  public async logAssistantResponse(
    turn: number,
    content: string,
    toolCalls?: ToolCall[],
    usage?: TokenUsage
  ): Promise<void> {
    const timestamp = new Date().toISOString();
    const lines = [
      `### [${timestamp}] 🤖 Assistant (Turn ${turn})`,
    ];

    if (content && content.trim().length > 0) {
      lines.push("");
      lines.push(content.trim());
    }

    if (toolCalls && toolCalls.length > 0) {
      lines.push("");
      lines.push("**Tool Calls**:");
      for (const tc of toolCalls) {
        lines.push(`- **\`${tc.name}\`** (id: \`${tc.id}\`)`);
        lines.push("  ```json");
        lines.push(
          JSON.stringify(tc.args, null, 2)
            .split("\n")
            .map((l) => `  ${l}`)
            .join("\n")
        );
        lines.push("  ```");
      }
    }

    if (usage) {
      const cached = usage.cachedPromptTokens || 0;
      lines.push("");
      lines.push(
        `> **Metrics**: Turn Tokens: **${usage.totalTokens.toLocaleString()}** (Prompt: ${usage.promptTokens.toLocaleString()}, Completion: ${usage.completionTokens.toLocaleString()}, Cached: ${cached.toLocaleString()})`
      );
    }

    lines.push("");
    await this.append(lines.join("\n"));
  }

  public async logTruncationWarning(
    turn: number,
    finishReason: string,
    completionTokens: number
  ): Promise<void> {
    const timestamp = new Date().toISOString();
    const lines = [
      `> ⚠️ **WARNING (Turn ${turn})**: Generation hit output token limit (\`finish_reason: "${finishReason}"\`, completion tokens: **${completionTokens.toLocaleString()}**). Response or pending tool calls were truncated mid-stream!`,
      "",
    ];
    await this.append(lines.join("\n"));
  }

  public async logToolResult(
    toolName: string,
    callId: string,
    result: string,
    isError?: boolean
  ): Promise<void> {
    const timestamp = new Date().toISOString();
    const status = isError ? "❌ ERROR" : "✅ SUCCESS";
    const cleanResult = result ? result.trim() : "(No output)";

    const lines = [
      `#### [${timestamp}] 🔧 Tool Result: \`${toolName}\` [${status}] (id: \`${callId}\`)`,
      "```",
      cleanResult,
      "```",
      "",
    ];

    await this.append(lines.join("\n"));
  }

  public async logPhaseEnd(params: {
    phaseTitle: string;
    phaseFileName: string;
    success: boolean;
    summary: string;
    durationSeconds: number;
    tokensUsed: TokenUsage;
    turnCount: number;
  }): Promise<void> {
    const timestamp = new Date().toISOString();
    const statusIcon = params.success ? "✅" : "❌";
    const statusText = params.success ? "COMPLETED" : "FAILED";
    const cached = params.tokensUsed.cachedPromptTokens || 0;

    const banner = [
      `### [${timestamp}] ${statusIcon} Phase ${statusText}: ${params.phaseTitle}`,
      `- **Duration**: ${params.durationSeconds}s | **Total Turns**: ${params.turnCount}`,
      `- **Cumulative Tokens**: Total: **${params.tokensUsed.totalTokens.toLocaleString()}** | Prompt: ${params.tokensUsed.promptTokens.toLocaleString()} | Completion: ${params.tokensUsed.completionTokens.toLocaleString()} | Cached: ${cached.toLocaleString()}`,
      "",
      `**Summary**:`,
      params.summary,
      "",
      "---",
      "",
    ].join("\n");

    await this.append(banner);
  }
}
