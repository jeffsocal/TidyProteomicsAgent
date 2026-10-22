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
    currentPhaseTag = "";
    logPath = "";
    consoleLogPath = "";
    pipelineLogPath = "";
    writeQueue = Promise.resolve();
    constructor(workspaceRoot, initialPhase = "") {
        this.workspaceRoot = workspaceRoot;
        this.workspaceRoot = workspaceRoot || "";
        if (initialPhase) {
            this.setPhase(initialPhase);
        }
        else {
            this.pipelineLogPath = this.resolveLogPath("logs/pipeline.md");
        }
    }
    setWorkspaceRoot(newRoot) {
        this.workspaceRoot = newRoot || "";
        if (this.currentPhaseTag) {
            this.setPhase(this.currentPhaseTag);
        }
        else {
            this.pipelineLogPath = this.resolveLogPath("logs/pipeline.md");
        }
    }
    /**
     * Switches the active logging context to a specific phase directory:
     *   logs/<phaseTag>/chat.md      -> Phase chat & LLM reasoning trace
     *   logs/<phaseTag>/console.log  -> Raw R / command stdout and stderr
     */
    setPhase(phaseFileNameOrTag) {
        if (!phaseFileNameOrTag)
            return;
        let tag = path.basename(phaseFileNameOrTag).replace(/\.md$/i, "").toLowerCase();
        if (tag.startsWith("instruct")) {
            tag = "00_install";
        }
        this.currentPhaseTag = tag;
        this.logPath = this.resolveLogPath(`logs/${tag}/chat.md`);
        this.consoleLogPath = this.resolveLogPath(`logs/${tag}/console.log`);
        this.pipelineLogPath = this.resolveLogPath("logs/pipeline.md");
    }
    getPhaseTag() {
        return this.currentPhaseTag;
    }
    getLogPath() {
        return this.logPath || this.pipelineLogPath;
    }
    getConsoleLogPath() {
        return this.consoleLogPath;
    }
    getPipelineLogPath() {
        return this.pipelineLogPath;
    }
    resolveLogPath(fileName) {
        if (path.isAbsolute(fileName)) {
            return fileName;
        }
        if (!this.workspaceRoot)
            return "";
        return path.join(this.workspaceRoot, fileName);
    }
    async appendToFile(targetPath, text) {
        if (!this.workspaceRoot || !targetPath)
            return;
        this.writeQueue = this.writeQueue.then(async () => {
            try {
                const dir = path.dirname(targetPath);
                await fs.mkdir(dir, { recursive: true });
                await fs.appendFile(targetPath, text + "\n", "utf-8");
            }
            catch (err) {
                console.error(`[ChatLogger] Failed to write to ${targetPath}:`, err);
            }
        });
        return this.writeQueue;
    }
    async append(text) {
        const target = this.logPath || this.pipelineLogPath;
        return this.appendToFile(target, text);
    }
    /**
     * Initializes or updates the master logs/pipeline.md summary table.
     */
    async ensurePipelineSummaryHeader() {
        if (!this.workspaceRoot || !this.pipelineLogPath)
            return;
        try {
            await fs.stat(this.pipelineLogPath);
        }
        catch {
            const header = [
                "# TidyProteomics Pipeline Execution Summary",
                "",
                "> Master index of autonomous reasoning traces and raw execution logs per phase.",
                "",
                "| Phase | Title | Status | Duration | Total Tokens | Logs |",
                "| :--- | :--- | :--- | :--- | :--- | :--- |",
            ].join("\n");
            await this.appendToFile(this.pipelineLogPath, header);
        }
    }
    /**
     * Logs phase initialization. Documents WHICH prompts were sent into the persistent system frame
     * and dynamic input directives WITHOUT dumping their entire text contents, keeping the log lean.
     */
    async logPhaseStart(params) {
        this.setPhase(params.phaseFileName);
        await this.ensurePipelineSummaryHeader();
        // Touch console.log so it exists immediately on disk
        if (this.consoleLogPath) {
            await this.writeQueue.then(async () => {
                try {
                    await fs.mkdir(path.dirname(this.consoleLogPath), { recursive: true });
                    await fs.appendFile(this.consoleLogPath, `=== Phase Started: ${params.phaseTitle} [${new Date().toISOString()}] ===\n`, "utf-8");
                }
                catch { }
            });
        }
        const timestamp = new Date().toISOString();
        const systemFiles = params.systemPromptFiles || [
            "agent/PROTOCOL.md",
            "docs/experiment.md",
            "agent/TIDYPROTEOMICS_CORE.md",
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
            `# [${timestamp}] Phase Start: ${params.phaseTitle}`,
            `- **Phase Directive**: \`${params.phaseFileName}\``,
            `- **Model**: \`${params.model}\` | **Provider**: \`${params.provider}\``,
            `- **Console Output**: [\`logs/${this.currentPhaseTag}/console.log\`](./console.log)`,
            "",
            "### Persistent System Frame (Sent & Cached Prefix)",
            ...systemFiles.map((f) => `- \`${f}\``),
            "",
            "### Input Prompts & Blackboard Directives (Turn 1)",
            ...inputFiles.map((f) => `- \`${f}\``),
            "",
        ];
        await this.append(lines.join("\n"));
    }
    async logAssistantResponse(turn, content, toolCalls, usage) {
        const timestamp = new Date().toISOString();
        const lines = [
            `### [${timestamp}] Assistant (Turn ${turn})`,
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
            `> **WARNING (Turn ${turn})**: Generation hit output token limit (\`finish_reason: "${finishReason}"\`, completion tokens: **${completionTokens.toLocaleString()}**). Response or pending tool calls were truncated mid-stream!`,
            "",
        ];
        await this.append(lines.join("\n"));
    }
    /**
     * Logs tool results. For `execute_command` (especially R scripts), writes the complete, unvarnished
     * stdout and stderr to `logs/<phaseTag>/console.log` while inserting a lean "Execution Card" into `chat.md`.
     */
    async logToolResult(toolName, callId, result, isError, toolArgs) {
        const timestamp = new Date().toISOString();
        const status = isError ? "FAILED" : "SUCCESS";
        const cleanResult = result ? result.trim() : "(No output)";
        // 1. Special Handling for execute_command: Keeps R console noise OUT of chat.md
        if (toolName === "execute_command") {
            const command = toolArgs?.command || "(command string unavailable)";
            // Persist full unvarnished terminal output to logs/<phaseTag>/console.log
            if (this.consoleLogPath) {
                const consoleEntry = [
                    "================================================================================",
                    `[${timestamp}] Command: ${command}`,
                    `Status: ${status} (id: ${callId})`,
                    "================================================================================",
                    cleanResult,
                    "",
                ].join("\n");
                await this.appendToFile(this.consoleLogPath, consoleEntry);
            }
            // Author lean Execution Card in chat.md
            const relConsole = `./console.log`;
            const lines = [
                `#### [${timestamp}] Tool Result: \`${toolName}\` [${status}] (id: \`${callId}\`)`,
                `- **Command**: \`${command}\``,
                `- **Status**: ${isError ? "❌ Command failed" : "✓ Command executed successfully"}`,
                `- **Console Output**: Logged to [\`logs/${this.currentPhaseTag}/console.log\`](${relConsole})`,
            ];
            if (isError) {
                // Extract up to 10 lines of salient error / traceback so LLM reasoning remains clear
                const rawLines = cleanResult.split("\n");
                const errorLines = rawLines.filter((l) => /error|failed|exception|cannot|fatal/i.test(l));
                const snippetLines = errorLines.length > 0 ? errorLines.slice(-10) : rawLines.slice(-10);
                lines.push("- **Error Excerpt**:");
                lines.push("  ```text");
                for (const el of snippetLines) {
                    lines.push(`  ${el.trim()}`);
                }
                lines.push("  ```");
            }
            else {
                // Highlight any checkpoint pass lines if found
                const passLines = cleanResult
                    .split("\n")
                    .filter((l) => /CHECKPOINT.*PASS|ALL_CHECKPOINTS_PASSED|PHASE_.*_PASS/i.test(l))
                    .slice(0, 3);
                if (passLines.length > 0) {
                    for (const pl of passLines) {
                        lines.push(`- **Checkpoint Highlight**: \`${pl.trim()}\``);
                    }
                }
                else {
                    const lineCount = cleanResult.split("\n").length;
                    lines.push(`- **Console Volume**: ${lineCount.toLocaleString()} lines captured in console.log`);
                }
            }
            lines.push("");
            await this.append(lines.join("\n"));
            return;
        }
        // 2. Special Handling for write_file: Keep lean confirmation without echoing file body
        if (toolName === "write_file") {
            const filePath = toolArgs?.filePath || "";
            const lines = [
                `#### [${timestamp}] Tool Result: \`${toolName}\` [${status}] (id: \`${callId}\`)`,
                `- **Target File**: \`${filePath}\``,
                `- **Result**: ${cleanResult}`,
                "",
            ];
            await this.append(lines.join("\n"));
            return;
        }
        // 3. Special Handling for read_file: If large, keep a truncated preview
        if (toolName === "read_file") {
            const filePath = toolArgs?.filePath || "";
            const rawLines = cleanResult.split("\n");
            const lines = [
                `#### [${timestamp}] Tool Result: \`${toolName}\` [${status}] (id: \`${callId}\`)`,
                `- **Inspected File**: \`${filePath}\``,
            ];
            if (rawLines.length > 25) {
                const preview = rawLines.slice(0, 15).join("\n");
                lines.push("```");
                lines.push(preview);
                lines.push(`\n... [${(rawLines.length - 15).toLocaleString()} lines omitted in chat log for economy] ...`);
                lines.push("```");
            }
            else {
                lines.push("```");
                lines.push(cleanResult);
                lines.push("```");
            }
            lines.push("");
            await this.append(lines.join("\n"));
            return;
        }
        // 4. Default for other tools
        const lines = [
            `#### [${timestamp}] Tool Result: \`${toolName}\` [${status}] (id: \`${callId}\`)`,
            "```",
            cleanResult,
            "```",
            "",
        ];
        await this.append(lines.join("\n"));
    }
    async logPhaseEnd(params) {
        const timestamp = new Date().toISOString();
        const statusIcon = params.success ? "✓" : "❌";
        const statusText = params.success ? "COMPLETED" : "FAILED";
        const cached = params.tokensUsed.cachedPromptTokens || 0;
        const banner = [
            `### [${timestamp}] ${statusIcon} Phase ${statusText}: ${params.phaseTitle}`,
            `- **Duration**: ${params.durationSeconds}s | **Total Turns**: ${params.turnCount}`,
            `- **Cumulative Tokens**: Total: **${params.tokensUsed.totalTokens.toLocaleString()}** | Prompt: ${params.tokensUsed.promptTokens.toLocaleString()} | Completion: ${params.tokensUsed.completionTokens.toLocaleString()} | Cached: ${cached.toLocaleString()}`,
            `- **Logs**: [\`chat.md\`](./chat.md) | [\`console.log\`](./console.log)`,
            "",
            `**Summary**:`,
            params.summary,
            "",
            "---",
            "",
        ].join("\n");
        await this.append(banner);
        // Update master pipeline.md index table
        if (this.pipelineLogPath) {
            const summaryRow = `| ${statusIcon} **${this.currentPhaseTag}** | ${params.phaseTitle} | ${statusText} | ${params.durationSeconds}s | ${params.tokensUsed.totalTokens.toLocaleString()} | [Chat](./${this.currentPhaseTag}/chat.md) \\| [Console](./${this.currentPhaseTag}/console.log) |`;
            await this.appendToFile(this.pipelineLogPath, summaryRow);
        }
    }
}
exports.ChatLogger = ChatLogger;
//# sourceMappingURL=ChatLogger.js.map