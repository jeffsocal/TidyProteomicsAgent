"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatLogger = void 0;
const fs = __importStar(require("fs/promises"));
const path = __importStar(require("path"));
class ChatLogger {
    workspaceRoot;
    logPath;
    writeQueue = Promise.resolve();
    constructor(workspaceRoot, logFileName = "logs/llm_chat.md") {
        this.workspaceRoot = workspaceRoot;
        this.workspaceRoot = workspaceRoot || "";
        this.logPath = this.resolveLogPath(logFileName);
    }
    setWorkspaceRoot(newRoot) {
        this.workspaceRoot = newRoot || "";
        this.logPath = this.resolveLogPath("logs/llm_chat.md");
    }
    getLogPath() {
        return this.logPath;
    }
    resolveLogPath(fileName) {
        if (path.isAbsolute(fileName)) {
            return fileName;
        }
        if (!this.workspaceRoot)
            return "";
        return path.join(this.workspaceRoot, fileName);
    }
    async append(text) {
        if (!this.workspaceRoot || !this.logPath)
            return;
        this.writeQueue = this.writeQueue.then(async () => {
            try {
                const dir = path.dirname(this.logPath);
                await fs.mkdir(dir, { recursive: true });
                await fs.appendFile(this.logPath, text + "\n", "utf-8");
            }
            catch (err) {
                console.error(`[ChatLogger] Failed to write to ${this.logPath}:`, err);
            }
        });
        return this.writeQueue;
    }
    /**
     * Logs phase initialization. Documents WHICH prompts were sent into the persistent system frame
     * and dynamic input directives WITHOUT dumping their entire text contents, keeping the log lean.
     */
    async logPhaseStart(params) {
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
    async logAssistantResponse(turn, content, toolCalls, usage) {
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
                lines.push(JSON.stringify(tc.args, null, 2)
                    .split("\n")
                    .map((l) => `  ${l}`)
                    .join("\n"));
                lines.push("  ```");
            }
        }
        if (usage) {
            const cached = usage.cachedPromptTokens || 0;
            lines.push("");
            lines.push(`> **Metrics**: Turn Tokens: **${usage.totalTokens.toLocaleString()}** (Prompt: ${usage.promptTokens.toLocaleString()}, Completion: ${usage.completionTokens.toLocaleString()}, Cached: ${cached.toLocaleString()})`);
        }
        lines.push("");
        await this.append(lines.join("\n"));
    }
    async logTruncationWarning(turn, finishReason, completionTokens) {
        const timestamp = new Date().toISOString();
        const lines = [
            `> ⚠️ **WARNING (Turn ${turn})**: Generation hit output token limit (\`finish_reason: "${finishReason}"\`, completion tokens: **${completionTokens.toLocaleString()}**). Response or pending tool calls were truncated mid-stream!`,
            "",
        ];
        await this.append(lines.join("\n"));
    }
    async logToolResult(toolName, callId, result, isError) {
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
    async logPhaseEnd(params) {
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
exports.ChatLogger = ChatLogger;
//# sourceMappingURL=ChatLogger.js.map