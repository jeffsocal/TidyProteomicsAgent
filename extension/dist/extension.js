"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/extension.ts
var extension_exports = {};
__export(extension_exports, {
  activate: () => activate,
  deactivate: () => deactivate
});
module.exports = __toCommonJS(extension_exports);
var vscode2 = __toESM(require("vscode"));
var path7 = __toESM(require("path"));
var fs7 = __toESM(require("fs"));

// src/ui/SidebarViewProvider.ts
var vscode = __toESM(require("vscode"));
var path6 = __toESM(require("path"));
var fs6 = __toESM(require("fs"));

// src/orchestrator/PipelineOrchestrator.ts
var fs4 = __toESM(require("fs/promises"));
var path4 = __toESM(require("path"));

// src/agent/ContextBuilder.ts
var fs = __toESM(require("fs/promises"));
var path = __toESM(require("path"));
var ContextBuilder = class {
  constructor(workspaceRoot, promptsDir = "agent", analysisDir = "analysis") {
    this.workspaceRoot = workspaceRoot;
    this.promptsDir = promptsDir;
    this.analysisDir = analysisDir;
  }
  setWorkspaceRoot(newRoot) {
    this.workspaceRoot = newRoot || "";
  }
  async readFileSafe(relPath) {
    try {
      if (!this.workspaceRoot && !path.isAbsolute(relPath))
        return "";
      const fullPath = path.isAbsolute(relPath) ? relPath : path.join(this.workspaceRoot, relPath);
      return await fs.readFile(fullPath, "utf-8");
    } catch {
      return "";
    }
  }
  /**
   * Builds the isolated context bundle for a specific phase.
   * Persistent elements (rules, skills, variables, instructions) form the static prefix.
   * Dynamic elements (blackboard docs/notes.md, experiment.md) and the phase file form the prompt.
   */
  async buildPhaseContext(phaseFileName) {
    let agentDir = this.promptsDir;
    let protocol = await this.readFileSafe(path.join(agentDir, "PROTOCOL.md"));
    if (!protocol && agentDir === "agent") {
      const fallback = await this.readFileSafe(path.join("prompts", "PROTOCOL.md"));
      if (fallback) {
        agentDir = "prompts";
        protocol = fallback;
      }
    }
    if (!protocol) {
      const clinerules = await this.readFileSafe(".clinerules");
      const instruct = await this.readFileSafe(path.join(agentDir, "INSTRUCT.md"));
      protocol = `${clinerules}

${instruct}`.trim();
    }
    const skill = await this.readFileSafe(path.join(agentDir, "SKILL.md"));
    const experiment = await this.readFileSafe(path.join("docs", "experiment.md"));
    let variables = await this.readFileSafe(path.join(agentDir, "VARIABLES.md"));
    if (!variables) {
      variables = experiment || "No dataset parameters provided. See docs/experiment.md.";
    }
    const biology = await this.readFileSafe(path.join(agentDir, "BIOLOGY.md"));
    const biologySection = biology ? `

# CURATED DOMAIN BIOLOGICAL CONTEXT
${biology}` : "";
    const staticPrefixForCache = `
# AUTONOMOUS ANALYSIS PROTOCOL & QUALITY GATES
${protocol}

# INPUT DATASET PARAMETERS & EXPERIMENT SPECIFICATION
${variables}
${biologySection}

# DOMAIN SKILL SPECIFICATION & API CONVENTIONS
${skill}
`.trim();
    const notes = await this.readFileSafe(path.join("docs", "notes.md"));
    const llm = await this.readFileSafe(path.join("docs", "llm.md"));
    const blackboardState = `
## CURRENT RUNTIME STATE (Shared Memory)
### docs/notes.md:
${notes || "No prior execution notes found. Initialize if this is Phase 0 or Phase 1."}

### docs/llm.md (ACTIVE MODEL & AGENT SPECIFICATION - READ ONLY):
${llm || "No active model summary found."}

### docs/experiment.md (USER EXPERIMENT & DATASET SPECIFICATION - READ ONLY):
${experiment || "No user experiment design provided. Note: This file is strictly user-maintained; do not create or overwrite it."}
`.trim();
    let phasePath = phaseFileName;
    if (!phaseFileName.includes("/") && !phaseFileName.includes("\\")) {
      phasePath = path.join(this.analysisDir, phaseFileName);
    }
    const phaseContent = await this.readFileSafe(phasePath);
    const systemPrompt = staticPrefixForCache;
    const normalizedPhaseName = path.basename(phaseFileName).replace(/\.md$/, "").toUpperCase();
    const phasePrompt = `
${blackboardState}

---

## ACTIVE PHASE DIRECTIVE (${phaseFileName})
${phaseContent}

### Execution Instructions:
- Adhere strictly to the guidelines and gate checkpoints for this phase.
- Execute code and commands to make real progress.
- For scripts and documents under 150 lines, always write or overwrite the full file using 'write_file'.
- When authoring or updating any report or document (e.g. in docs/), reference 'docs/llm.md' and place the metadata header immediately beneath the title:
  Title

  Created: YYYY-MM-DD HH:MM
  Author: PROVIDER | LLM-MODEL
  Agent: TidyProteomicsAgent vX.X.X
- Once all checkpoints for this phase are satisfied and verified, invoke complete_phase(phaseName = "${normalizedPhaseName}", summary = "...").
`.trim();
    return {
      systemPrompt,
      phasePrompt,
      blackboardState,
      staticPrefixForCache
    };
  }
};

// src/agent/AgentLoop.ts
var AgentLoop = class {
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
  messages = [];
  totalUsage = {
    promptTokens: 0,
    completionTokens: 0,
    totalTokens: 0,
    cachedPromptTokens: 0
  };
  getTotalUsage() {
    return { ...this.totalUsage };
  }
  async run(maxTurns = 25) {
    const startTimeMs = Date.now();
    this.messages.push({
      role: "user",
      content: this.context.phasePrompt
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
          "docs/experiment.md"
        ]
      });
    }
    let turn = 0;
    let completedSummary = "";
    while (turn < maxTurns) {
      if (this.isCancelled && this.isCancelled()) {
        const stopSummary = "Execution stopped by user.";
        if (this.chatLogger) {
          const durationSeconds2 = Math.round((Date.now() - startTimeMs) / 1e3);
          await this.chatLogger.logPhaseEnd({
            phaseTitle: this.phaseTitle || this.phaseName,
            phaseFileName: this.phaseName,
            success: false,
            summary: stopSummary,
            durationSeconds: durationSeconds2,
            tokensUsed: this.totalUsage,
            turnCount: turn
          });
        }
        return {
          success: false,
          summary: stopSummary,
          tokensUsed: this.totalUsage,
          phaseName: this.phaseName,
          turnCount: turn
        };
      }
      turn++;
      this.onProgress({ type: "thought", data: `Starting Turn ${turn}/${maxTurns}...` });
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
            }
          });
          lastError = null;
          break;
        } catch (err) {
          lastError = err;
          const isTimeout = err.name === "TimeoutError" || err.name === "AbortError" || /timeout|aborted|ETIMEDOUT|ECONNRESET/i.test(err.message || "");
          if (isTimeout && attempt <= maxRetries && (!this.isCancelled || !this.isCancelled())) {
            const backoffMs = attempt * 3e3;
            this.onProgress({
              type: "thought",
              data: `\u26A0\uFE0F Turn ${turn} timed out on attempt ${attempt}/${maxRetries + 1} (${err.message}). Retrying in ${backoffMs / 1e3}s...`
            });
            await new Promise((r) => setTimeout(r, backoffMs));
            continue;
          }
          break;
        }
      }
      if (!response) {
        const errorSummary = lastError ? `LLM API Error during turn ${turn}: ${lastError.message}` : "Execution stopped by user.";
        if (this.chatLogger) {
          const durationSeconds2 = Math.round((Date.now() - startTimeMs) / 1e3);
          await this.chatLogger.logPhaseEnd({
            phaseTitle: this.phaseTitle || this.phaseName,
            phaseFileName: this.phaseName,
            success: false,
            summary: errorSummary,
            durationSeconds: durationSeconds2,
            tokensUsed: this.totalUsage,
            turnCount: turn
          });
        }
        return {
          success: false,
          summary: errorSummary,
          tokensUsed: this.totalUsage,
          phaseName: this.phaseName,
          turnCount: turn
        };
      }
      this.totalUsage.promptTokens += response.usage.promptTokens;
      this.totalUsage.completionTokens += response.usage.completionTokens;
      this.totalUsage.totalTokens += response.usage.totalTokens;
      this.totalUsage.cachedPromptTokens = (this.totalUsage.cachedPromptTokens || 0) + (response.usage.cachedPromptTokens || 0);
      this.onProgress({
        type: "tokens",
        data: {
          turn,
          turnUsage: response.usage,
          totalUsage: { ...this.totalUsage }
        }
      });
      this.messages.push({
        role: "assistant",
        content: response.content,
        tool_calls: response.tool_calls
      });
      if (this.chatLogger) {
        await this.chatLogger.logAssistantResponse(
          turn,
          response.content,
          response.tool_calls,
          response.usage
        );
      }
      if (response.truncationDetected) {
        const warnMsg = `\u26A0\uFE0F Output limit reached (finish_reason: "${response.finishReason || "length"}", tokens: ${response.usage.completionTokens}). Generation was truncated.`;
        this.onProgress({
          type: "thought",
          data: warnMsg
        });
        if (this.chatLogger) {
          await this.chatLogger.logTruncationWarning(
            turn,
            response.finishReason || "length",
            response.usage.completionTokens
          );
        }
      }
      if (response.tool_calls && response.tool_calls.length > 0) {
        for (const tc of response.tool_calls) {
          this.onProgress({
            type: "tool_start",
            data: { name: tc.name, args: tc.args }
          });
          const result = await this.tools.execute(tc.name, tc.args);
          this.onProgress({
            type: "tool_end",
            data: { name: tc.name, result: result.content, isError: result.isError }
          });
          let toolMessageContent = result.content;
          const MAX_TOOL_CHARS = 24e3;
          if (toolMessageContent && toolMessageContent.length > MAX_TOOL_CHARS) {
            const head = toolMessageContent.slice(0, 12e3);
            const tail = toolMessageContent.slice(-1e4);
            const omitted = toolMessageContent.length - 22e3;
            toolMessageContent = `${head}

... [\u26A0\uFE0F Output truncated: ${omitted.toLocaleString()} characters omitted to preserve context economy. See complete output in workspace/logs/ or inspect with 'read_file'] ...

${tail}`;
          }
          this.messages.push({
            role: "tool",
            tool_call_id: tc.id,
            tool_name: tc.name,
            content: toolMessageContent
          });
          if (this.chatLogger) {
            await this.chatLogger.logToolResult(tc.name, tc.id, result.content, result.isError);
          }
          if (tc.name === "complete_phase") {
            completedSummary = tc.args.summary || response.content;
            const durationSeconds2 = Math.round((Date.now() - startTimeMs) / 1e3);
            if (this.chatLogger) {
              await this.chatLogger.logPhaseEnd({
                phaseTitle: this.phaseTitle || this.phaseName,
                phaseFileName: this.phaseName,
                success: true,
                summary: completedSummary,
                durationSeconds: durationSeconds2,
                tokensUsed: this.totalUsage,
                turnCount: turn
              });
            }
            return {
              success: true,
              summary: completedSummary,
              tokensUsed: this.totalUsage,
              phaseName: this.phaseName,
              turnCount: turn
            };
          }
        }
      } else {
        if (response.content.includes("PHASE_COMPLETED") || response.content.includes("CHECKPOINT_PASSED")) {
          const durationSeconds2 = Math.round((Date.now() - startTimeMs) / 1e3);
          if (this.chatLogger) {
            await this.chatLogger.logPhaseEnd({
              phaseTitle: this.phaseTitle || this.phaseName,
              phaseFileName: this.phaseName,
              success: true,
              summary: response.content,
              durationSeconds: durationSeconds2,
              tokensUsed: this.totalUsage,
              turnCount: turn
            });
          }
          return {
            success: true,
            summary: response.content,
            tokensUsed: this.totalUsage,
            phaseName: this.phaseName,
            turnCount: turn
          };
        } else if (response.truncationDetected) {
          this.messages.push({
            role: "user",
            content: `[System Notice]: Your response reached the maximum output token limit (finish_reason: "${response.finishReason || "length"}", completion tokens: ${response.usage.completionTokens}). Any attempted tool call was truncated before completion and could not be parsed. Please write the output in smaller sections or verify that Max Output Tokens in settings is set sufficiently high.`
          });
        } else {
          this.messages.push({
            role: "user",
            content: "Please execute the required tools to fulfill the objectives of this phase, or call complete_phase when finished."
          });
        }
      }
    }
    const failureSummary = `Turn limit reached (${maxTurns} turns) without completing phase checkpoints.`;
    const durationSeconds = Math.round((Date.now() - startTimeMs) / 1e3);
    if (this.chatLogger) {
      await this.chatLogger.logPhaseEnd({
        phaseTitle: this.phaseTitle || this.phaseName,
        phaseFileName: this.phaseName,
        success: false,
        summary: failureSummary,
        durationSeconds,
        tokensUsed: this.totalUsage,
        turnCount: maxTurns
      });
    }
    return {
      success: false,
      summary: failureSummary,
      tokensUsed: this.totalUsage,
      phaseName: this.phaseName,
      turnCount: maxTurns
    };
  }
};

// src/agent/ChatLogger.ts
var fs2 = __toESM(require("fs/promises"));
var path2 = __toESM(require("path"));
var ChatLogger = class {
  constructor(workspaceRoot, logFileName = "logs/llm_chat.md") {
    this.workspaceRoot = workspaceRoot;
    this.workspaceRoot = workspaceRoot || "";
    this.logPath = this.resolveLogPath(logFileName);
  }
  logPath;
  writeQueue = Promise.resolve();
  setWorkspaceRoot(newRoot) {
    this.workspaceRoot = newRoot || "";
    this.logPath = this.resolveLogPath("logs/llm_chat.md");
  }
  getLogPath() {
    return this.logPath;
  }
  resolveLogPath(fileName) {
    if (path2.isAbsolute(fileName)) {
      return fileName;
    }
    if (!this.workspaceRoot)
      return "";
    return path2.join(this.workspaceRoot, fileName);
  }
  async append(text) {
    if (!this.workspaceRoot || !this.logPath)
      return;
    this.writeQueue = this.writeQueue.then(async () => {
      try {
        const dir = path2.dirname(this.logPath);
        await fs2.mkdir(dir, { recursive: true });
        await fs2.appendFile(this.logPath, text + "\n", "utf-8");
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
  async logPhaseStart(params) {
    const timestamp = (/* @__PURE__ */ new Date()).toISOString();
    const systemFiles = params.systemPromptFiles || [
      "agent/PROTOCOL.md",
      "docs/experiment.md",
      "agent/SKILL.md"
    ];
    const inputFiles = params.inputPromptFiles || [
      params.phaseFileName.includes("/") ? params.phaseFileName : `analysis/${params.phaseFileName}`,
      "docs/notes.md",
      "docs/llm.md",
      "docs/experiment.md"
    ];
    const lines = [
      "",
      "---",
      "",
      `# [${timestamp}] \u{1F680} Phase Start: ${params.phaseTitle}`,
      `- **Phase File**: \`${params.phaseFileName}\``,
      `- **Model**: \`${params.model}\` | **Provider**: \`${params.provider}\``,
      "",
      "### \u2699\uFE0F Persistent System Frame (Sent & Cached Prefix)",
      ...systemFiles.map((f) => `- \`${f}\``),
      "",
      "### \u{1F4E5} Input Prompts & Blackboard Directives (Turn 1)",
      ...inputFiles.map((f) => `- \`${f}\``),
      ""
    ];
    await this.append(lines.join("\n"));
  }
  async logAssistantResponse(turn, content, toolCalls, usage) {
    const timestamp = (/* @__PURE__ */ new Date()).toISOString();
    const lines = [
      `### [${timestamp}] \u{1F916} Assistant (Turn ${turn})`
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
          JSON.stringify(tc.args, null, 2).split("\n").map((l) => `  ${l}`).join("\n")
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
  async logTruncationWarning(turn, finishReason, completionTokens) {
    const timestamp = (/* @__PURE__ */ new Date()).toISOString();
    const lines = [
      `> \u26A0\uFE0F **WARNING (Turn ${turn})**: Generation hit output token limit (\`finish_reason: "${finishReason}"\`, completion tokens: **${completionTokens.toLocaleString()}**). Response or pending tool calls were truncated mid-stream!`,
      ""
    ];
    await this.append(lines.join("\n"));
  }
  async logToolResult(toolName, callId, result, isError) {
    const timestamp = (/* @__PURE__ */ new Date()).toISOString();
    const status = isError ? "\u274C ERROR" : "\u2705 SUCCESS";
    const cleanResult = result ? result.trim() : "(No output)";
    const lines = [
      `#### [${timestamp}] \u{1F527} Tool Result: \`${toolName}\` [${status}] (id: \`${callId}\`)`,
      "```",
      cleanResult,
      "```",
      ""
    ];
    await this.append(lines.join("\n"));
  }
  async logPhaseEnd(params) {
    const timestamp = (/* @__PURE__ */ new Date()).toISOString();
    const statusIcon = params.success ? "\u2705" : "\u274C";
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
      ""
    ].join("\n");
    await this.append(banner);
  }
};

// src/orchestrator/ModelSummaryWriter.ts
var fs3 = __toESM(require("fs/promises"));
var path3 = __toESM(require("path"));
function formatDateTime(d = /* @__PURE__ */ new Date()) {
  const pad = (n) => n.toString().padStart(2, "0");
  const year = d.getFullYear();
  const month = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const hours = pad(d.getHours());
  const minutes = pad(d.getMinutes());
  return `${year}-${month}-${day} ${hours}:${minutes}`;
}
function generateActiveModelSummaryMarkdown(config, extensionVersion = "0.1.0", date = /* @__PURE__ */ new Date()) {
  const timestampStr = formatDateTime(date);
  const providerStr = (config.provider || "anthropic").toUpperCase();
  const modelStr = config.model || "claude-3-7-sonnet-20250219";
  const cachingStr = config.provider === "anthropic" || config.provider === "openrouter" ? "Active \u26A1" : "Standard";
  const maxTokensStr = (config.maxTokens || 32768).toLocaleString();
  const timeoutStr = `${config.timeoutSeconds || 600}s`;
  const keyStatusStr = config.apiKey ? "Configured" : config.provider === "ollama" ? "Not Required (Local)" : "Missing";
  const baseUrlStr = config.baseUrl && config.baseUrl.trim() ? config.baseUrl.trim() : "Default";
  const agentStr = `TidyProteomicsAgent v${extensionVersion || "0.1.0"}`;
  const authorStr = `${providerStr} | ${modelStr}`;
  return `# Active Model Summary

Created: ${timestampStr}
Author: ${authorStr}
Agent: ${agentStr}

## Active Configuration

| Configuration Property | Value |
| :--- | :--- |
| **Provider** | ${providerStr} |
| **Model** | ${modelStr} |
| **Author** | ${authorStr} |
| **Agent** | ${agentStr} |
| **Prompt Caching** | ${cachingStr} |
| **Max Output Tokens** | ${maxTokensStr} |
| **Request Timeout** | ${timeoutStr} |
| **Key Status** | ${keyStatusStr} |
| **Base URL** | ${baseUrlStr} |

---

## Agent Document Header Standard
All agent-authored documents and reports (including \`docs/observations.md\`, \`docs/scientific_report.md\`, and any other generated markdown reports) must reference this specification and place the following metadata block immediately below the title:

\`\`\`markdown
Title

Created: YYYY-MM-DD HH:MM
Author: ${authorStr}
Agent: ${agentStr}
\`\`\`
`;
}
async function writeActiveModelSummaryFile(workspaceRoot, config, extensionVersion = "0.1.0") {
  if (!workspaceRoot)
    return "";
  const docsDir = path3.join(workspaceRoot, "docs");
  await fs3.mkdir(docsDir, { recursive: true });
  const llmPath = path3.join(docsDir, "llm.md");
  const markdown = generateActiveModelSummaryMarkdown(config, extensionVersion);
  try {
    const existing = await fs3.readFile(llmPath, "utf-8");
    const stripCreated = (s) => s.replace(/Created:\s*\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}/g, "");
    if (stripCreated(existing) === stripCreated(markdown)) {
      return llmPath;
    }
  } catch {
  }
  await fs3.writeFile(llmPath, markdown, "utf-8");
  return llmPath;
}

// src/orchestrator/PipelineOrchestrator.ts
var PipelineOrchestrator = class {
  constructor(workspaceRoot, client, tools, onStateChange, onLog, extensionVersion = "0.1.0") {
    this.workspaceRoot = workspaceRoot;
    this.client = client;
    this.tools = tools;
    this.onStateChange = onStateChange;
    this.onLog = onLog;
    this.extensionVersion = extensionVersion;
    this.workspaceRoot = workspaceRoot || "";
    this.chatLogger = new ChatLogger(this.workspaceRoot);
    if (this.workspaceRoot) {
      this.rescanPhases().catch((err) => {
        console.error("[PipelineOrchestrator] Error rescanning phases:", err);
      });
    }
  }
  phases = [];
  isRunning = false;
  isFullPipelineRunning = false;
  shouldStop = false;
  chatLogger;
  setExtensionVersion(version) {
    this.extensionVersion = version || "0.1.0";
  }
  async syncModelSummary() {
    if (!this.workspaceRoot)
      return "";
    return await writeActiveModelSummaryFile(this.workspaceRoot, this.client.getConfig(), this.extensionVersion);
  }
  ts() {
    const d = /* @__PURE__ */ new Date();
    return d.toTimeString().split(" ")[0];
  }
  formatToolHeader(name, args) {
    switch (name) {
      case "execute_command":
        return `[Command] ${args?.command || ""}`;
      case "read_file": {
        const range = args?.startLine ? ` (lines ${args.startLine}-${args.startLine + (args.maxLines || 0) - 1})` : "";
        return `[Read] ${args?.filePath || ""}${range}`;
      }
      case "write_file": {
        const len = typeof args?.content === "string" ? ` (${args.content.length} chars)` : "";
        return `[Write] ${args?.filePath || ""}${len}`;
      }
      case "replace_file_content":
        return `[Edit] ${args?.filePath || ""}`;
      case "list_directory":
        return `[List] ${args?.dirPath || "."}`;
      case "check_checkpoint_gate": {
        const files = Array.isArray(args?.requiredFiles) ? args.requiredFiles.join(", ") : "";
        return `[Check Gate] ${files}`;
      }
      case "complete_phase":
        return `[Complete Phase] ${args?.phaseName || ""}`;
      default: {
        const keys = Object.keys(args || {});
        const summary = keys.length > 0 ? ` (${keys.join(", ")})` : "";
        return `[${name}]${summary}`;
      }
    }
  }
  getIsRunning() {
    return this.isRunning;
  }
  getIsFullPipelineRunning() {
    return this.isFullPipelineRunning;
  }
  async setWorkingDirectory(newRoot) {
    if (this.isRunning) {
      this.onLog(`[${this.ts()}] \u26A0\uFE0F [Pipeline] Cannot change working directory while a pipeline or phase is actively running.`);
      return;
    }
    this.workspaceRoot = newRoot || "";
    this.tools.setWorkspaceRoot(this.workspaceRoot);
    this.chatLogger.setWorkspaceRoot(this.workspaceRoot);
    try {
      await this.rescanPhases();
    } catch (err) {
      console.error("[PipelineOrchestrator] Error rescanning phases on directory change:", err);
    }
  }
  getWorkingDirectory() {
    return this.workspaceRoot;
  }
  /**
   * Dynamically inspects the workspace directory for analysis/*.md phases and agent/INSTRUCT.md
   */
  async loadNotesRecords() {
    const map = /* @__PURE__ */ new Map();
    if (!this.workspaceRoot)
      return map;
    try {
      const notesPath = path4.join(this.workspaceRoot, "docs", "notes.md");
      const content = await fs4.readFile(notesPath, "utf-8");
      const sections = content.split(/\n(?=###\s+)/);
      for (const section of sections) {
        const fileMatch = section.match(/- \*\*File\*\*:\s*`([^`]+)`/);
        if (!fileMatch)
          continue;
        const rawFileName = fileMatch[1].trim();
        const durationMatch = section.match(/- \*\*Duration\*\*:\s*(\d+)s/);
        const durationSeconds = durationMatch ? parseInt(durationMatch[1], 10) : void 0;
        const startMatch = section.match(/- \*\*Start\*\*:\s*([^\n\r]+)/);
        const startTime = startMatch ? startMatch[1].trim() : void 0;
        const endMatch = section.match(/- \*\*End\*\*:\s*([^\n\r]+)/);
        const endTime = endMatch ? endMatch[1].trim() : void 0;
        const tokenMatch = section.match(
          /- \*\*Token Usage\*\*:\s*Total:\s*(\d+|N\/A),\s*Prompt:\s*(\d+|N\/A),\s*Completion:\s*(\d+|N\/A)(?:,\s*Cached:\s*(\d+|N\/A))?/i
        );
        let tokenUsage;
        if (tokenMatch) {
          const totalTokens = tokenMatch[1] !== "N/A" ? parseInt(tokenMatch[1], 10) : 0;
          const promptTokens = tokenMatch[2] !== "N/A" ? parseInt(tokenMatch[2], 10) : 0;
          const completionTokens = tokenMatch[3] !== "N/A" ? parseInt(tokenMatch[3], 10) : 0;
          const cachedPromptTokens = tokenMatch[4] && tokenMatch[4] !== "N/A" ? parseInt(tokenMatch[4], 10) : 0;
          tokenUsage = { totalTokens, promptTokens, completionTokens, cachedPromptTokens };
        }
        const isCompleted = section.includes("- COMPLETED");
        const isFailed = section.includes("- FAILED");
        const status = isCompleted ? "completed" : isFailed ? "failed" : "completed";
        const summaryMatch = section.match(/\*\*Summary\*\*:\s*\n([\s\S]*?)(?:\n---|\n###|$)/);
        const summary = summaryMatch ? summaryMatch[1].trim() : void 0;
        const record = { status, durationSeconds, tokenUsage, summary, startTime, endTime };
        map.set(rawFileName, record);
        const base = path4.basename(rawFileName);
        if (!map.has(base)) {
          map.set(base, record);
        }
      }
    } catch {
    }
    return map;
  }
  async forceReloadFromDisk() {
    if (this.isRunning) {
      this.onLog(`[${this.ts()}] \u26A0\uFE0F [Pipeline] Cannot force reload while an active pipeline run is in flight.`);
      return;
    }
    await this.rescanPhases(true);
    this.onLog(`[${this.ts()}] \u21BB [Pipeline] Reloaded all tasks and progress from disk.`);
  }
  async resetAllState() {
    if (this.isRunning) {
      this.onLog(`[${this.ts()}] \u26A0\uFE0F [Pipeline] Cannot reset state while an active run is in flight.`);
      return;
    }
    const notesPath = path4.join(this.workspaceRoot, "docs", "notes.md");
    try {
      const header = `# Autonomous Proteomics Analysis Notes
Model: ${this.client.getConfig().model}

`;
      await fs4.writeFile(notesPath, header, "utf-8");
    } catch {
    }
    for (const p of this.phases) {
      p.status = "pending";
      p.startTime = void 0;
      p.endTime = void 0;
      p.durationSeconds = void 0;
      p.tokenUsage = void 0;
      p.summary = void 0;
      p.error = void 0;
    }
    await this.rescanPhases(true);
    this.onLog(`[${this.ts()}] \u{1F9F9} [Pipeline] State and runtime blackboard reset to initial state.`);
  }
  async rescanPhases(forceReload = false) {
    if (this.isRunning) {
      return;
    }
    if (!this.workspaceRoot) {
      this.phases = [];
      await this.notifyState();
      return;
    }
    const notesRecords = await this.loadNotesRecords();
    const existingMap = forceReload ? /* @__PURE__ */ new Map() : new Map(this.phases.map((p) => [p.fileName, p]));
    const enabledMap = new Map(this.phases.map((p) => [p.fileName, p.enabled]));
    const newPhases = [];
    const analysisDir = path4.join(this.workspaceRoot, "analysis");
    let hasSetupInAnalysis = false;
    try {
      const files = await fs4.readdir(analysisDir);
      const mdFiles = files.filter((f) => f.endsWith(".md")).sort();
      for (let i = 0; i < mdFiles.length; i++) {
        const fileName = mdFiles[i];
        if (fileName.startsWith("00_")) {
          hasSetupInAnalysis = true;
        }
        const prev = existingMap.get(fileName);
        const noteRec = notesRecords.get(fileName) || notesRecords.get(path4.basename(fileName));
        let title = prev?.title;
        if (!title) {
          try {
            const content = await fs4.readFile(path4.join(analysisDir, fileName), "utf-8");
            const firstHeader = content.split("\n").find((l) => l.trim().startsWith("#"));
            if (firstHeader) {
              title = firstHeader.replace(/^#+\s*/, "").trim();
            }
          } catch {
          }
          if (!title) {
            title = fileName.replace(/^[0-9]+_/, "").replace(/\.md$/, "").replace(/_/g, " ");
            title = `Phase: ${title}`;
          }
        }
        const id = fileName.match(/^([0-9]+)/)?.[1] || String(i + 1).padStart(2, "0");
        const isMaster = fileName.startsWith("00_");
        let resolvedStatus = "pending";
        if (prev?.status && prev.status !== "running") {
          resolvedStatus = prev.status;
        } else if (noteRec?.status) {
          resolvedStatus = noteRec.status;
        }
        const isEnabled = enabledMap.has(fileName) ? enabledMap.get(fileName) : prev ? prev.enabled : true;
        newPhases.push({
          id,
          fileName,
          title,
          status: resolvedStatus,
          enabled: isEnabled,
          isMasterSetup: isMaster,
          startTime: prev?.startTime || noteRec?.startTime,
          endTime: prev?.endTime || noteRec?.endTime,
          durationSeconds: prev?.durationSeconds || noteRec?.durationSeconds,
          tokenUsage: prev?.tokenUsage || noteRec?.tokenUsage,
          summary: prev?.summary || noteRec?.summary,
          error: prev?.error
        });
      }
    } catch (e) {
      this.onLog(`[${this.ts()}] \u2139\uFE0F [Pipeline] Note: 'analysis' directory not found in ${this.workspaceRoot}`);
    }
    if (!hasSetupInAnalysis) {
      let instructRel = "agent/INSTRUCT.md";
      let instructPath = path4.join(this.workspaceRoot, "agent", "INSTRUCT.md");
      try {
        await fs4.stat(instructPath);
      } catch {
        instructRel = "prompts/INSTRUCT.md";
        instructPath = path4.join(this.workspaceRoot, "prompts", "INSTRUCT.md");
      }
      try {
        await fs4.stat(instructPath);
        const prev = existingMap.get(instructRel) || existingMap.get("agent/INSTRUCT.md") || existingMap.get("prompts/INSTRUCT.md");
        const noteRec = notesRecords.get(instructRel) || notesRecords.get("agent/INSTRUCT.md") || notesRecords.get("prompts/INSTRUCT.md") || notesRecords.get("INSTRUCT.md");
        let resolvedStatus = "pending";
        if (prev?.status && prev.status !== "running") {
          resolvedStatus = prev.status;
        } else if (noteRec?.status) {
          resolvedStatus = noteRec.status;
        }
        const isEnabled = enabledMap.has(instructRel) ? enabledMap.get(instructRel) : prev ? prev.enabled : true;
        newPhases.unshift({
          id: "00",
          fileName: instructRel,
          title: "Phase 0: Master Setup & Environment",
          status: resolvedStatus,
          enabled: isEnabled,
          isMasterSetup: true,
          startTime: prev?.startTime || noteRec?.startTime,
          endTime: prev?.endTime || noteRec?.endTime,
          durationSeconds: prev?.durationSeconds || noteRec?.durationSeconds,
          tokenUsage: prev?.tokenUsage || noteRec?.tokenUsage,
          summary: prev?.summary || noteRec?.summary,
          error: prev?.error
        });
      } catch {
      }
    }
    this.phases = newPhases;
    await this.notifyState();
  }
  async getPromptFiles() {
    let agentDir = "agent";
    try {
      await fs4.stat(path4.join(this.workspaceRoot, "agent"));
    } catch {
      agentDir = "prompts";
    }
    const list = [
      { name: "Analysis Protocol", relPath: `${agentDir}/PROTOCOL.md` },
      { name: "TidyProteomics Skills", relPath: `${agentDir}/SKILL.md` },
      { name: "Experiment & Dataset Spec", relPath: "docs/experiment.md" },
      { name: "Shared Memory", relPath: "docs/notes.md" },
      { name: "Active Model Summary", relPath: "docs/llm.md" },
      { name: "LLM Chat Log", relPath: "logs/llm_chat.md" }
    ];
    try {
      await fs4.stat(path4.join(this.workspaceRoot, `${agentDir}/BIOLOGY.md`));
      list.splice(1, 0, { name: "Curated Biological Context", relPath: `${agentDir}/BIOLOGY.md` });
    } catch {
    }
    try {
      await fs4.stat(path4.join(this.workspaceRoot, `${agentDir}/VARIABLES.md`));
      list.splice(1, 0, { name: "Legacy Dataset Variables", relPath: `${agentDir}/VARIABLES.md` });
    } catch {
    }
    const result = [];
    for (const item of list) {
      let exists = false;
      try {
        await fs4.stat(path4.join(this.workspaceRoot, item.relPath));
        exists = true;
      } catch {
        exists = false;
      }
      result.push({ ...item, exists });
    }
    return result;
  }
  getPhases() {
    return [...this.phases];
  }
  togglePhase(phaseId, enabled) {
    const phase = this.phases.find((p) => p.id === phaseId);
    if (phase) {
      phase.enabled = enabled;
      this.notifyState();
    }
  }
  async addPhase(fileName, title) {
    const cleanFileName = fileName.endsWith(".md") ? fileName : `${fileName}.md`;
    const analysisDir = path4.join(this.workspaceRoot, "analysis");
    await fs4.mkdir(analysisDir, { recursive: true });
    const fullPath = path4.join(analysisDir, cleanFileName);
    const defaultTitle = title || cleanFileName.replace(/\.md$/, "").replace(/_/g, " ");
    const template = `### Phase: ${defaultTitle}
Construct and execute code for this phase, capturing output to logs.

#### Tasks:
- [ ] Task 1: Initialize step.
- [ ] Task 2: Execute analysis in R or shell.
- [ ] Checkpoint: Verify outputs and log files.
`;
    await fs4.writeFile(fullPath, template, "utf-8");
    await this.rescanPhases();
    return fullPath;
  }
  async removePhase(phaseId) {
    const idx = this.phases.findIndex((p) => p.id === phaseId);
    if (idx !== -1) {
      const phase = this.phases[idx];
      if (!phase.isMasterSetup) {
        try {
          await fs4.unlink(path4.join(this.workspaceRoot, "analysis", phase.fileName));
        } catch {
        }
      }
      this.phases.splice(idx, 1);
      await this.notifyState();
    }
  }
  async getFoldersStatus() {
    let agentFolder = "agent";
    try {
      await fs4.stat(path4.join(this.workspaceRoot, "agent"));
    } catch {
      agentFolder = "prompts";
    }
    const list = [
      { name: "analysis", relPath: "analysis", description: "Phase Prompts (00_INSTALL.md .. 07_SYNTHESIS.md)" },
      { name: agentFolder, relPath: agentFolder, description: "Protocol, Variables & Skills (Cached Prefix)" },
      { name: "code", relPath: "code", description: "Generated Analysis Scripts" },
      { name: "tools", relPath: "tools", description: "Linter & Execution Helper Utilities" },
      { name: "docs", relPath: "docs", description: "Shared Memory (notes.md, llm.md) & Experiment Design" },
      { name: "logs", relPath: "logs", description: "Execution Chat Trace (llm_chat.md)" },
      { name: "data", relPath: "data", description: "Raw Input Proteomics Data" }
    ];
    const result = [];
    if (!this.workspaceRoot)
      return result;
    for (const item of list) {
      const full = path4.join(this.workspaceRoot, item.relPath);
      let exists = false;
      let itemCount = 0;
      try {
        const stat3 = await fs4.stat(full);
        if (stat3.isDirectory()) {
          exists = true;
          const files = await fs4.readdir(full);
          itemCount = files.filter((f) => !f.startsWith(".")).length;
        }
      } catch {
        exists = false;
      }
      result.push({ ...item, exists, itemCount });
    }
    return result;
  }
  async getState() {
    const config = this.client.getConfig();
    let totalPrompt = 0;
    let totalCompletion = 0;
    let totalTokens = 0;
    let totalCached = 0;
    for (const p of this.phases) {
      if (p.tokenUsage) {
        totalPrompt += p.tokenUsage.promptTokens;
        totalCompletion += p.tokenUsage.completionTokens;
        totalTokens += p.tokenUsage.totalTokens;
        totalCached += p.tokenUsage.cachedPromptTokens || 0;
      }
    }
    const promptFiles = await this.getPromptFiles();
    const folders = await this.getFoldersStatus();
    return {
      workingDirectory: this.workspaceRoot,
      workspaceName: this.workspaceRoot ? path4.basename(this.workspaceRoot) : "No Folder Open",
      model: config.model,
      provider: config.provider,
      startTime: (/* @__PURE__ */ new Date()).toISOString(),
      isRunning: this.isRunning,
      isFullPipelineRunning: this.isFullPipelineRunning,
      currentPhaseIndex: this.phases.findIndex((p) => p.status === "running"),
      phases: this.phases,
      promptFiles,
      folders,
      totalTokens: {
        promptTokens: totalPrompt,
        completionTokens: totalCompletion,
        totalTokens,
        cachedPromptTokens: totalCached
      }
    };
  }
  async notifyState() {
    try {
      const state = await this.getState();
      this.onStateChange(state);
    } catch (err) {
      console.error("[PipelineOrchestrator] Error in notifyState:", err);
    }
  }
  stop() {
    this.shouldStop = true;
    this.isFullPipelineRunning = false;
    for (const p of this.phases) {
      if (p.status === "running") {
        p.status = "failed";
        p.error = "Stopped by user";
      }
    }
    this.isRunning = false;
    this.onLog(`[${this.ts()}] \u23F9 [Pipeline] Execution stopped by user.`);
    this.notifyState();
  }
  /**
   * Prunes records from docs/notes.md for a given phase and all downstream phases.
   * This ensures that restarting a step clears obsolete blackboard context for the LLM.
   */
  async pruneNotesFromPhase(startIndex) {
    if (!this.workspaceRoot)
      return;
    const targetPhases = this.phases.slice(startIndex);
    if (targetPhases.length === 0)
      return;
    const filesToRemove = /* @__PURE__ */ new Set();
    for (const p of targetPhases) {
      filesToRemove.add(p.fileName);
      filesToRemove.add(path4.basename(p.fileName));
      if (p.isMasterSetup) {
        filesToRemove.add("agent/INSTRUCT.md");
        filesToRemove.add("prompts/INSTRUCT.md");
        filesToRemove.add("INSTRUCT.md");
      }
    }
    const notesPath = path4.join(this.workspaceRoot, "docs", "notes.md");
    try {
      const content = await fs4.readFile(notesPath, "utf-8");
      const sections = content.split(/\n(?=###\s+)/);
      const kept = [];
      for (const section of sections) {
        const fileMatch = section.match(/- \*\*File\*\*:\s*`([^`]+)`/);
        if (fileMatch) {
          const rawFileName = fileMatch[1].trim();
          const baseName = path4.basename(rawFileName);
          if (filesToRemove.has(rawFileName) || filesToRemove.has(baseName)) {
            continue;
          }
        }
        kept.push(section);
      }
      const updated = kept.join("\n").replace(/\n{3,}/g, "\n\n").trim() + "\n";
      await fs4.writeFile(notesPath, updated, "utf-8");
    } catch {
    }
  }
  /**
   * Run a single phase in isolation with automatic cascading reset of downstream phases
   */
  async runSinglePhase(phaseId) {
    if (this.isRunning) {
      this.onLog(`[${this.ts()}] \u26A0\uFE0F [Pipeline] Execution busy: A pipeline or phase is already running. Please wait or stop it first.`);
      return;
    }
    const phaseIndex = this.phases.findIndex((p) => p.id === phaseId);
    if (phaseIndex === -1) {
      this.onLog(`[${this.ts()}] \u274C [Pipeline] Phase ID '${phaseId}' not found.`);
      return;
    }
    for (let i = phaseIndex; i < this.phases.length; i++) {
      const p = this.phases[i];
      if (i === phaseIndex) {
        p.status = "running";
        p.startTime = (/* @__PURE__ */ new Date()).toISOString();
        p.endTime = void 0;
        p.durationSeconds = void 0;
        p.tokenUsage = void 0;
        p.summary = void 0;
        p.error = void 0;
      } else {
        p.status = "pending";
        p.startTime = void 0;
        p.endTime = void 0;
        p.durationSeconds = void 0;
        p.tokenUsage = void 0;
        p.summary = void 0;
        p.error = void 0;
      }
    }
    await this.pruneNotesFromPhase(phaseIndex);
    await this.notifyState();
    this.isRunning = true;
    this.isFullPipelineRunning = false;
    this.shouldStop = false;
    try {
      await this.executePhase(phaseIndex);
    } catch (err) {
      this.onLog(`[${this.ts()}] \u274C [Pipeline] Error running phase ${phaseId}: ${err.message}`);
    } finally {
      this.isRunning = false;
      this.isFullPipelineRunning = false;
      await this.notifyState();
    }
  }
  /**
   * Run the complete multi-phase pipeline sequentially
   */
  async runFullPipeline() {
    if (this.isRunning) {
      this.onLog(`[${this.ts()}] \u26A0\uFE0F [Pipeline] Execution busy: A pipeline is already running.`);
      return;
    }
    this.isRunning = true;
    this.isFullPipelineRunning = true;
    this.shouldStop = false;
    this.onLog(`[${this.ts()}] \u{1F680} [Pipeline] Starting autonomous run at ${(/* @__PURE__ */ new Date()).toLocaleTimeString()}`);
    this.onLog(`[${this.ts()}] \u{1F4C1} [Pipeline] Working Directory: ${this.workspaceRoot}`);
    try {
      for (let i = 0; i < this.phases.length; i++) {
        if (this.shouldStop) {
          this.onLog(`[${this.ts()}] \u23F9 [Pipeline] Execution stopped by user.`);
          break;
        }
        const phase = this.phases[i];
        if (!phase.enabled) {
          this.onLog(`[${this.ts()}] \u23ED\uFE0F [Pipeline] Skipping disabled phase: ${phase.title}`);
          continue;
        }
        await this.pruneNotesFromPhase(i);
        const success = await this.executePhase(i);
        if (!success) {
          this.onLog(`[${this.ts()}] \u26A0\uFE0F [Pipeline] Pipeline paused due to checkpoint failure in ${phase.title}`);
          break;
        }
      }
    } catch (err) {
      this.onLog(`[${this.ts()}] \u274C [Pipeline] Full pipeline error: ${err.message}`);
    } finally {
      this.isRunning = false;
      this.isFullPipelineRunning = false;
      this.shouldStop = false;
      await this.notifyState();
    }
  }
  async executePhase(index) {
    const targetId = this.phases[index]?.id;
    const getActivePhase = () => {
      if (targetId) {
        const found = this.phases.find((p) => p.id === targetId);
        if (found)
          return found;
      }
      return this.phases[index];
    };
    const phase = getActivePhase();
    if (!phase)
      return false;
    phase.status = "running";
    phase.startTime = (/* @__PURE__ */ new Date()).toISOString();
    phase.endTime = void 0;
    phase.error = void 0;
    if (!phase.tokenUsage) {
      phase.tokenUsage = { promptTokens: 0, completionTokens: 0, totalTokens: 0, cachedPromptTokens: 0 };
    }
    const startTimeMs = Date.now();
    await this.notifyState();
    this.onLog(`[${this.ts()}] \u{1F680} Starting ${phase.title} (${phase.fileName})`);
    let loop;
    try {
      try {
        await writeActiveModelSummaryFile(this.workspaceRoot, this.client.getConfig(), this.extensionVersion);
      } catch (err) {
        console.warn("[PipelineOrchestrator] Could not write docs/llm.md before phase execution:", err);
      }
      const contextBuilder = new ContextBuilder(this.workspaceRoot);
      const context = await contextBuilder.buildPhaseContext(phase.fileName);
      loop = new AgentLoop(
        phase.fileName,
        phase.title,
        this.client,
        this.tools,
        context,
        async (event) => {
          if (event.type === "thought") {
            this.onLog(`[${this.ts()}] \u{1F504} ${event.data}`);
          } else if (event.type === "text") {
          } else if (event.type === "tool_start") {
            this.onLog(`[${this.ts()}] \u{1F6E0}\uFE0F ${this.formatToolHeader(event.data.name, event.data.args)}`);
          } else if (event.type === "tool_end") {
            this.onLog(`[${this.ts()}] ${event.data.isError ? "\u274C" : "\u2713"} [Result] ${event.data.name} ${event.data.isError ? "failed" : "completed"}`);
          } else if (event.type === "tokens") {
            const currentPhase2 = getActivePhase();
            currentPhase2.tokenUsage = { ...event.data.totalUsage };
            await this.notifyState();
          }
        },
        this.chatLogger,
        () => this.shouldStop
      );
      const result = await loop.run();
      const durationSeconds = Math.max(1, Math.round((Date.now() - startTimeMs) / 1e3));
      const currentPhase = getActivePhase();
      currentPhase.endTime = (/* @__PURE__ */ new Date()).toISOString();
      currentPhase.durationSeconds = durationSeconds;
      currentPhase.tokenUsage = result.tokensUsed;
      currentPhase.summary = result.summary;
      if (result.success) {
        currentPhase.status = "completed";
        this.onLog(
          `[${this.ts()}] \u2705 ${currentPhase.title} completed in ${durationSeconds}s (${result.tokensUsed.totalTokens.toLocaleString()} tokens)`
        );
        await this.appendPhaseRecordToNotes(currentPhase);
        await this.notifyState();
        return true;
      } else {
        currentPhase.status = "failed";
        currentPhase.error = result.summary;
        const firstLine = String(result.summary || "Phase failed").split("\n")[0];
        this.onLog(`[${this.ts()}] \u274C ${currentPhase.title} failed: ${firstLine}`);
        await this.notifyState();
        return false;
      }
    } catch (err) {
      const currentPhase = getActivePhase();
      currentPhase.status = "failed";
      currentPhase.error = err.message;
      if (loop && (!currentPhase.tokenUsage || currentPhase.tokenUsage.totalTokens === 0)) {
        currentPhase.tokenUsage = loop.getTotalUsage();
      }
      this.onLog(`[${this.ts()}] \u274C Error in ${currentPhase.title}: ${err.message}`);
      await this.notifyState();
      return false;
    }
  }
  async appendPhaseRecordToNotes(phase) {
    const notesPath = path4.join(this.workspaceRoot, "docs", "notes.md");
    const entry = `
### ${phase.title} - COMPLETED
- **File**: \`${phase.fileName}\`
- **Duration**: ${phase.durationSeconds}s
- **Start**: ${phase.startTime}
- **End**: ${phase.endTime}
- **Token Usage**: Total: ${phase.tokenUsage?.totalTokens || "N/A"}, Prompt: ${phase.tokenUsage?.promptTokens || "N/A"}, Completion: ${phase.tokenUsage?.completionTokens || "N/A"}, Cached: ${phase.tokenUsage?.cachedPromptTokens || 0}
- **Summary**:
${phase.summary || "Phase checkpoints verified."}

---
`;
    try {
      await fs4.mkdir(path4.dirname(notesPath), { recursive: true });
      let current = "";
      try {
        current = await fs4.readFile(notesPath, "utf-8");
      } catch {
        current = `# Autonomous Proteomics Analysis Notes
Model: ${this.client.getConfig().model}

`;
      }
      await fs4.writeFile(notesPath, current + entry, "utf-8");
    } catch (e) {
      this.onLog(`[${this.ts()}] \u26A0\uFE0F Warning: Failed to update docs/notes.md: ${e}`);
    }
  }
};

// src/llm/ProviderClient.ts
var ProviderClient = class {
  constructor(config) {
    this.config = config;
  }
  updateConfig(config) {
    this.config = { ...this.config, ...config };
  }
  getConfig() {
    return { ...this.config };
  }
  getTimeoutSeconds() {
    return this.config.timeoutSeconds && this.config.timeoutSeconds > 0 ? this.config.timeoutSeconds : 600;
  }
  getTimeoutMs() {
    return this.getTimeoutSeconds() * 1e3;
  }
  async chat(params) {
    switch (this.config.provider) {
      case "anthropic":
        return this.chatAnthropic(params);
      case "gemini":
        return this.chatGemini(params);
      case "openrouter":
        return this.chatOpenRouter(params);
      case "ollama":
        return this.chatOllama(params);
      case "openai":
      default:
        return this.chatOpenAI(params);
    }
  }
  /**
   * Anthropic Messages API with native Prompt Caching enabled on the static system prompt!
   */
  async chatAnthropic(params) {
    const url = "https://api.anthropic.com/v1/messages";
    const anthropicTools = params.tools.map((t) => ({
      name: t.name,
      description: t.description,
      input_schema: t.parameters
    }));
    const rawAnthropic = [];
    let i = 0;
    while (i < params.messages.length) {
      const msg = params.messages[i];
      if (msg.role === "system") {
        i++;
        continue;
      }
      if (msg.role === "tool") {
        const toolResults = [];
        while (i < params.messages.length && params.messages[i].role === "tool") {
          const tm = params.messages[i];
          toolResults.push({
            type: "tool_result",
            tool_use_id: tm.tool_call_id,
            content: tm.content
          });
          i++;
        }
        rawAnthropic.push({
          role: "user",
          content: toolResults
        });
        continue;
      } else if (msg.role === "assistant" && msg.tool_calls && msg.tool_calls.length > 0) {
        const contentBlocks = [];
        if (msg.content) {
          contentBlocks.push({ type: "text", text: msg.content });
        }
        for (const tc of msg.tool_calls) {
          contentBlocks.push({
            type: "tool_use",
            id: tc.id,
            name: tc.name,
            input: tc.args
          });
        }
        rawAnthropic.push({ role: "assistant", content: contentBlocks });
      } else {
        rawAnthropic.push({
          role: msg.role === "assistant" ? "assistant" : "user",
          content: msg.content
        });
      }
      i++;
    }
    const anthropicMessages = [];
    for (const m of rawAnthropic) {
      const last = anthropicMessages[anthropicMessages.length - 1];
      if (last && last.role === m.role) {
        const lastBlocks = Array.isArray(last.content) ? last.content : [{ type: "text", text: String(last.content) }];
        const currBlocks = Array.isArray(m.content) ? m.content : [{ type: "text", text: String(m.content) }];
        last.content = [...lastBlocks, ...currBlocks];
      } else {
        anthropicMessages.push(m);
      }
    }
    const systemPayload = [
      {
        type: "text",
        text: params.system,
        cache_control: { type: "ephemeral" }
      }
    ];
    const maxTokens = this.config.maxTokens || 16384;
    const body = {
      model: this.config.model || "claude-3-7-sonnet-20250219",
      max_tokens: maxTokens,
      temperature: this.config.temperature ?? 0.2,
      system: systemPayload,
      messages: anthropicMessages,
      tools: anthropicTools
    };
    const timeoutSeconds = this.getTimeoutSeconds();
    let res;
    try {
      res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": this.config.apiKey,
          "anthropic-version": "2023-06-01",
          "anthropic-beta": "prompt-caching-2024-07-31"
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(this.getTimeoutMs())
      });
    } catch (err) {
      if (err.name === "TimeoutError" || err.message && err.message.includes("timeout")) {
        throw new Error(`Anthropic API request timed out after ${timeoutSeconds}s. Increase Request Timeout in settings if running large models or heavy synthesis turns.`);
      }
      throw err;
    }
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Anthropic API error (${res.status}): ${errText}`);
    }
    const data = await res.json();
    let textContent = "";
    const toolCalls = [];
    for (const block of data.content || []) {
      if (block.type === "text") {
        textContent += block.text;
        if (params.onToken)
          params.onToken(block.text);
      } else if (block.type === "tool_use") {
        toolCalls.push({
          id: block.id,
          name: block.name,
          args: block.input || {}
        });
      }
    }
    const stopReason = data.stop_reason;
    const isTruncated = stopReason === "max_tokens";
    if (isTruncated) {
      console.warn(`[ProviderClient] Anthropic generation cut off: hit max_tokens limit (${maxTokens}).`);
    }
    const cacheRead = data.usage?.cache_read_input_tokens || 0;
    const cacheCreation = data.usage?.cache_creation_input_tokens || 0;
    const rawInput = data.usage?.input_tokens || 0;
    const completionTokens = data.usage?.output_tokens || 0;
    const promptTokens = rawInput + cacheRead + cacheCreation;
    const totalTokens = promptTokens + completionTokens;
    const usage = {
      promptTokens,
      completionTokens,
      totalTokens,
      cachedPromptTokens: cacheRead
    };
    return {
      content: textContent,
      tool_calls: toolCalls.length > 0 ? toolCalls : void 0,
      usage,
      finishReason: stopReason,
      truncationDetected: isTruncated
    };
  }
  /**
   * Google Gemini API implementation
   */
  async chatGemini(params) {
    const model = this.config.model || "gemini-1.5-pro";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${this.config.apiKey}`;
    const geminiTools = [
      {
        functionDeclarations: params.tools.map((t) => ({
          name: t.name,
          description: t.description,
          parameters: t.parameters
        }))
      }
    ];
    const rawContents = [];
    let j = 0;
    while (j < params.messages.length) {
      const msg = params.messages[j];
      if (msg.role === "system") {
        j++;
        continue;
      }
      if (msg.role === "tool") {
        const functionParts = [];
        while (j < params.messages.length && params.messages[j].role === "tool") {
          const tm = params.messages[j];
          functionParts.push({
            functionResponse: {
              name: tm.tool_name || tm.tool_call_id || "tool_result",
              response: { output: tm.content }
            }
          });
          j++;
        }
        rawContents.push({ role: "user", parts: functionParts });
        continue;
      } else if (msg.role === "assistant" && msg.tool_calls) {
        const parts = [];
        if (msg.content)
          parts.push({ text: msg.content });
        for (const tc of msg.tool_calls) {
          parts.push({
            functionCall: {
              name: tc.name,
              args: tc.args
            }
          });
        }
        rawContents.push({ role: "model", parts });
      } else {
        rawContents.push({
          role: msg.role === "assistant" ? "model" : "user",
          parts: [{ text: msg.content }]
        });
      }
      j++;
    }
    const contents = [];
    for (const c of rawContents) {
      const last = contents[contents.length - 1];
      if (last && last.role === c.role) {
        last.parts.push(...c.parts);
      } else {
        contents.push(c);
      }
    }
    const maxTokens = this.config.maxTokens || 16384;
    const body = {
      systemInstruction: {
        parts: [{ text: params.system }]
      },
      contents,
      tools: geminiTools,
      generationConfig: {
        temperature: this.config.temperature ?? 0.2,
        maxOutputTokens: maxTokens
      }
    };
    const timeoutSeconds = this.getTimeoutSeconds();
    let res;
    try {
      res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(this.getTimeoutMs())
      });
    } catch (err) {
      if (err.name === "TimeoutError" || err.message && err.message.includes("timeout")) {
        throw new Error(`Gemini API request timed out after ${timeoutSeconds}s. Increase Request Timeout in settings if running large models or heavy synthesis turns.`);
      }
      throw err;
    }
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Gemini API error (${res.status}): ${errText}`);
    }
    const data = await res.json();
    const candidate = data.candidates?.[0];
    const finishReason = candidate?.finishReason;
    const isTruncated = finishReason === "MAX_TOKENS";
    if (isTruncated) {
      console.warn(`[ProviderClient] Gemini generation cut off: hit MAX_TOKENS limit (${maxTokens}).`);
    }
    let textContent = "";
    const toolCalls = [];
    for (const part of candidate?.content?.parts || []) {
      if (part.text) {
        textContent += part.text;
        if (params.onToken)
          params.onToken(part.text);
      }
      if (part.functionCall) {
        toolCalls.push({
          id: `call_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          name: part.functionCall.name,
          args: part.functionCall.args || {}
        });
      }
    }
    const promptTokens = data.usageMetadata?.promptTokenCount || 0;
    const completionTokens = data.usageMetadata?.candidatesTokenCount || 0;
    const cachedPromptTokens = data.usageMetadata?.cachedContentTokenCount || 0;
    const totalTokens = data.usageMetadata?.totalTokenCount ?? promptTokens + completionTokens;
    const usage = {
      promptTokens,
      completionTokens,
      totalTokens,
      cachedPromptTokens
    };
    return {
      content: textContent,
      tool_calls: toolCalls.length > 0 ? toolCalls : void 0,
      usage,
      finishReason,
      truncationDetected: isTruncated
    };
  }
  /**
   * OpenAI / Compatible API implementation
   */
  async chatOpenAI(params) {
    const baseUrl = this.config.baseUrl || "https://api.openai.com/v1";
    const url = `${baseUrl}/chat/completions`;
    const openAiTools = params.tools.map((t) => ({
      type: "function",
      function: {
        name: t.name,
        description: t.description,
        parameters: t.parameters
      }
    }));
    const formattedMessages = [{ role: "system", content: params.system }];
    for (const msg of params.messages) {
      if (msg.role === "tool") {
        formattedMessages.push({
          role: "tool",
          tool_call_id: msg.tool_call_id,
          content: msg.content
        });
      } else if (msg.role === "assistant" && msg.tool_calls) {
        formattedMessages.push({
          role: "assistant",
          content: msg.content || null,
          tool_calls: msg.tool_calls.map((tc) => ({
            id: tc.id,
            type: "function",
            function: {
              name: tc.name,
              arguments: JSON.stringify(tc.args)
            }
          }))
        });
      } else {
        formattedMessages.push({
          role: msg.role,
          content: msg.content
        });
      }
    }
    const maxTokens = this.config.maxTokens || 16384;
    const body = {
      model: this.config.model || "gpt-4o",
      messages: formattedMessages,
      tools: openAiTools.length > 0 ? openAiTools : void 0,
      temperature: this.config.temperature ?? 0.2,
      max_tokens: maxTokens
    };
    const timeoutSeconds = this.getTimeoutSeconds();
    let res;
    try {
      res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.config.apiKey}`
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(this.getTimeoutMs())
      });
    } catch (err) {
      if (err.name === "TimeoutError" || err.message && err.message.includes("timeout")) {
        throw new Error(`OpenAI API request timed out after ${timeoutSeconds}s. Increase Request Timeout in settings if running large models or heavy synthesis turns.`);
      }
      throw err;
    }
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`OpenAI API error (${res.status}): ${errText}`);
    }
    const data = await res.json();
    const message = data.choices?.[0]?.message;
    const finishReason = data.choices?.[0]?.finish_reason;
    const isTruncated = finishReason === "length" || finishReason === "max_tokens";
    const textContent = message?.content || "";
    if (textContent && params.onToken) {
      params.onToken(textContent);
    }
    const toolCalls = [];
    for (const tc of message?.tool_calls || []) {
      try {
        toolCalls.push({
          id: tc.id,
          name: tc.function.name,
          args: typeof tc.function.arguments === "string" ? JSON.parse(tc.function.arguments) : tc.function.arguments || {}
        });
      } catch (err) {
        console.error(`[ProviderClient] Failed to parse tool call arguments for ${tc.function?.name}:`, err);
        if (isTruncated) {
          console.error(`[ProviderClient] Output truncated at max_tokens (${maxTokens}) with finish_reason="${finishReason}". Tool call JSON was incomplete.`);
        }
      }
    }
    const promptTokens = data.usage?.prompt_tokens || 0;
    const completionTokens = data.usage?.completion_tokens || 0;
    const cachedPromptTokens = data.usage?.prompt_tokens_details?.cached_tokens || 0;
    const totalTokens = data.usage?.total_tokens ?? promptTokens + completionTokens;
    const usage = {
      promptTokens,
      completionTokens,
      totalTokens,
      cachedPromptTokens
    };
    return {
      content: textContent,
      tool_calls: toolCalls.length > 0 ? toolCalls : void 0,
      usage,
      finishReason,
      truncationDetected: isTruncated
    };
  }
  /**
   * OpenRouter API implementation (Unified gateway for Claude, DeepSeek, Llama, Qwen, etc.)
   */
  async chatOpenRouter(params) {
    const baseUrl = (this.config.baseUrl || "https://openrouter.ai/api/v1").replace(/\/+$/, "");
    const url = `${baseUrl}/chat/completions`;
    const openAiTools = params.tools.map((t) => ({
      type: "function",
      function: {
        name: t.name,
        description: t.description,
        parameters: t.parameters
      }
    }));
    const formattedMessages = [{ role: "system", content: params.system }];
    for (const msg of params.messages) {
      if (msg.role === "tool") {
        formattedMessages.push({
          role: "tool",
          tool_call_id: msg.tool_call_id,
          content: msg.content
        });
      } else if (msg.role === "assistant" && msg.tool_calls) {
        formattedMessages.push({
          role: "assistant",
          content: msg.content || null,
          tool_calls: msg.tool_calls.map((tc) => ({
            id: tc.id,
            type: "function",
            function: {
              name: tc.name,
              arguments: JSON.stringify(tc.args)
            }
          }))
        });
      } else {
        formattedMessages.push({
          role: msg.role,
          content: msg.content
        });
      }
    }
    const maxTokens = this.config.maxTokens || 32768;
    const body = {
      model: this.config.model || "anthropic/claude-3.7-sonnet",
      messages: formattedMessages,
      tools: openAiTools.length > 0 ? openAiTools : void 0,
      temperature: this.config.temperature ?? 0.2,
      max_tokens: maxTokens
    };
    const timeoutSeconds = this.getTimeoutSeconds();
    let res;
    try {
      res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.config.apiKey}`,
          "HTTP-Referer": "https://github.com/tidyproteomicsagent",
          "X-Title": "TidyProteomicsAgent"
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(this.getTimeoutMs())
      });
    } catch (err) {
      if (err.name === "TimeoutError" || err.message && err.message.includes("timeout")) {
        throw new Error(`OpenRouter API request timed out after ${timeoutSeconds}s. Increase Request Timeout in settings if running large models or heavy synthesis turns.`);
      }
      throw err;
    }
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`OpenRouter API error (${res.status}): ${errText}`);
    }
    const data = await res.json();
    const message = data.choices?.[0]?.message;
    const finishReason = data.choices?.[0]?.finish_reason;
    const isTruncated = finishReason === "length" || finishReason === "max_tokens";
    const textContent = message?.content || "";
    if (textContent && params.onToken) {
      params.onToken(textContent);
    }
    const toolCalls = [];
    for (const tc of message?.tool_calls || []) {
      try {
        toolCalls.push({
          id: tc.id,
          name: tc.function.name,
          args: typeof tc.function.arguments === "string" ? JSON.parse(tc.function.arguments) : tc.function.arguments || {}
        });
      } catch (err) {
        console.error(`[ProviderClient] Failed to parse tool call arguments for ${tc.function?.name}:`, err);
        if (isTruncated) {
          console.error(`[ProviderClient] Output truncated at max_tokens (${maxTokens}) with finish_reason="${finishReason}". Tool call JSON was incomplete.`);
        }
      }
    }
    const promptTokens = data.usage?.prompt_tokens || 0;
    const completionTokens = data.usage?.completion_tokens || 0;
    const cachedPromptTokens = data.usage?.prompt_tokens_details?.cached_tokens ?? data.usage?.cache_read_input_tokens ?? 0;
    const totalTokens = data.usage?.total_tokens ?? promptTokens + completionTokens;
    const usage = {
      promptTokens,
      completionTokens,
      totalTokens,
      cachedPromptTokens
    };
    return {
      content: textContent,
      tool_calls: toolCalls.length > 0 ? toolCalls : void 0,
      usage,
      finishReason,
      truncationDetected: isTruncated
    };
  }
  /**
   * Remote Hosted Ollama API implementation (OpenAI-compatible endpoint with function calling)
   */
  async chatOllama(params) {
    let baseUrl = (this.config.baseUrl || "http://localhost:11434").replace(/\/+$/, "");
    if (!baseUrl.endsWith("/v1")) {
      baseUrl += "/v1";
    }
    const url = `${baseUrl}/chat/completions`;
    const openAiTools = params.tools.map((t) => ({
      type: "function",
      function: {
        name: t.name,
        description: t.description,
        parameters: t.parameters
      }
    }));
    const formattedMessages = [{ role: "system", content: params.system }];
    for (const msg of params.messages) {
      if (msg.role === "tool") {
        formattedMessages.push({
          role: "tool",
          tool_call_id: msg.tool_call_id,
          content: msg.content
        });
      } else if (msg.role === "assistant" && msg.tool_calls) {
        formattedMessages.push({
          role: "assistant",
          content: msg.content || null,
          tool_calls: msg.tool_calls.map((tc) => ({
            id: tc.id,
            type: "function",
            function: {
              name: tc.name,
              arguments: JSON.stringify(tc.args)
            }
          }))
        });
      } else {
        formattedMessages.push({
          role: msg.role,
          content: msg.content
        });
      }
    }
    const maxTokens = this.config.maxTokens || 16384;
    const body = {
      model: this.config.model || "llama3.3:70b",
      messages: formattedMessages,
      tools: openAiTools.length > 0 ? openAiTools : void 0,
      temperature: this.config.temperature ?? 0.2,
      max_tokens: maxTokens,
      options: {
        num_predict: maxTokens
      },
      stream: false
    };
    const headers = {
      "Content-Type": "application/json"
    };
    if (this.config.apiKey) {
      headers["Authorization"] = `Bearer ${this.config.apiKey}`;
    }
    const timeoutSeconds = this.getTimeoutSeconds();
    let res;
    try {
      res = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(this.getTimeoutMs())
      });
    } catch (err) {
      if (err.name === "TimeoutError" || err.message && err.message.includes("timeout")) {
        throw new Error(`Remote Ollama API request timed out after ${timeoutSeconds}s at ${url}. For local/remote 70B models, increase Request Timeout in settings.`);
      }
      throw err;
    }
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Remote Ollama API error at ${url} (${res.status}): ${errText}`);
    }
    const data = await res.json();
    const message = data.choices?.[0]?.message;
    const finishReason = data.choices?.[0]?.finish_reason || data.done_reason;
    const isTruncated = finishReason === "length";
    const textContent = message?.content || "";
    if (textContent && params.onToken) {
      params.onToken(textContent);
    }
    const toolCalls = [];
    for (const tc of message?.tool_calls || []) {
      try {
        toolCalls.push({
          id: tc.id || `call_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          name: tc.function.name,
          args: typeof tc.function.arguments === "string" ? JSON.parse(tc.function.arguments) : tc.function.arguments || {}
        });
      } catch (err) {
        console.error(`[ProviderClient] Failed to parse tool call arguments for ${tc.function?.name}:`, err);
        if (isTruncated) {
          console.error(`[ProviderClient] Output truncated at max_tokens (${maxTokens}) with finish_reason="${finishReason}".`);
        }
      }
    }
    const promptTokens = data.usage?.prompt_tokens ?? data.prompt_eval_count ?? 0;
    const completionTokens = data.usage?.completion_tokens ?? data.eval_count ?? 0;
    const totalTokens = data.usage?.total_tokens ?? promptTokens + completionTokens;
    const usage = {
      promptTokens,
      completionTokens,
      totalTokens,
      cachedPromptTokens: 0
    };
    return {
      content: textContent,
      tool_calls: toolCalls.length > 0 ? toolCalls : void 0,
      usage,
      finishReason,
      truncationDetected: isTruncated
    };
  }
};

// src/tools/ToolRegistry.ts
var fs5 = __toESM(require("fs/promises"));
var fsSync = __toESM(require("fs"));
var readline = __toESM(require("readline"));
var path5 = __toESM(require("path"));
var import_child_process = require("child_process");
var import_util = require("util");
var execAsync = (0, import_util.promisify)(import_child_process.exec);
var ToolRegistry = class {
  constructor(workspaceRoot) {
    this.workspaceRoot = workspaceRoot;
    this.workspaceRoot = workspaceRoot || "";
    this.registerDefaultTools();
  }
  tools = /* @__PURE__ */ new Map();
  setWorkspaceRoot(newRoot) {
    this.workspaceRoot = newRoot || "";
  }
  getDefinitions() {
    return Array.from(this.tools.values()).map((t) => t.definition);
  }
  async execute(name, args) {
    const handler = this.tools.get(name);
    if (!handler) {
      return {
        tool_call_id: "",
        content: `Error: Tool '${name}' not found. Available tools: ${Array.from(this.tools.keys()).join(", ")}`,
        isError: true
      };
    }
    try {
      const output = await handler.execute(args);
      return {
        tool_call_id: "",
        content: output,
        isError: false
      };
    } catch (err) {
      return {
        tool_call_id: "",
        content: `Error executing tool '${name}': ${err.message || String(err)}`,
        isError: true
      };
    }
  }
  resolvePath(filePath) {
    const root = this.workspaceRoot || "";
    if (!root) {
      throw new Error("No active workspace directory set.");
    }
    const resolved = path5.isAbsolute(filePath) ? path5.resolve(filePath) : path5.resolve(root, filePath);
    const normalizedRoot = path5.resolve(root);
    if (resolved !== normalizedRoot && !resolved.startsWith(normalizedRoot + path5.sep)) {
      throw new Error(`Security restriction: access to '${filePath}' outside workspace root is denied.`);
    }
    return resolved;
  }
  assertNotProtected(filePath) {
    const root = this.workspaceRoot || "";
    const resolved = path5.isAbsolute(filePath) ? path5.resolve(filePath) : path5.resolve(root, filePath);
    const normalizedRel = root ? path5.relative(path5.resolve(root), resolved).replace(/\\/g, "/") : filePath.replace(/\\/g, "/");
    const PROTECTED_FILES = [
      "docs/experiment.md",
      "docs/llm.md",
      "agent/PROTOCOL.md",
      "agent/SKILL.md",
      "agent/VARIABLES.md"
    ];
    if (PROTECTED_FILES.some((p) => normalizedRel === p || normalizedRel.endsWith("/" + p))) {
      throw new Error(
        `Security Policy Violation: '${filePath}' is a protected user or extension specification file and cannot be modified by the agent. Record runtime logs in 'docs/notes.md' and biological findings in 'docs/observations.md'.`
      );
    }
  }
  registerDefaultTools() {
    this.tools.set("execute_command", {
      definition: {
        name: "execute_command",
        description: "Executes a shell command in the workspace directory (e.g. running Rscript code/01_inspect_dataset.R). Captures stdout and stderr.",
        parameters: {
          type: "object",
          properties: {
            command: {
              type: "string",
              description: "The shell command line to run"
            },
            timeoutMs: {
              type: "number",
              description: "Optional execution timeout in milliseconds (default: 600000ms / 10m)"
            }
          },
          required: ["command"]
        }
      },
      execute: async (args) => {
        const timeout = args.timeoutMs || 6e5;
        try {
          const effectiveCwd = this.workspaceRoot;
          if (!effectiveCwd) {
            throw new Error("Cannot execute command: No active workspace directory is configured.");
          }
          const defaultShell = process.platform === "win32" ? void 0 : process.env.SHELL && fsSync.existsSync(process.env.SHELL) ? process.env.SHELL : fsSync.existsSync("/bin/bash") ? "/bin/bash" : "/bin/sh";
          const { stdout, stderr } = await execAsync(args.command, {
            cwd: effectiveCwd,
            timeout,
            maxBuffer: 10 * 1024 * 1024,
            shell: defaultShell
          });
          let result = "";
          if (stdout)
            result += `STDOUT:
${stdout}
`;
          if (stderr)
            result += `STDERR:
${stderr}
`;
          return result.trim() || "Command executed successfully with no console output.";
        } catch (error) {
          let errOutput = `Command failed with exit code ${error.code ?? "unknown"}
`;
          if (error.stdout)
            errOutput += `STDOUT:
${error.stdout}
`;
          if (error.stderr)
            errOutput += `STDERR:
${error.stderr}
`;
          if (error.message)
            errOutput += `Error message: ${error.message}
`;
          return errOutput;
        }
      }
    });
    this.tools.set("read_file", {
      definition: {
        name: "read_file",
        description: "Reads file content from the workspace with optional startLine and maxLines for context economy.",
        parameters: {
          type: "object",
          properties: {
            filePath: {
              type: "string",
              description: "Relative or absolute path to the file to read"
            },
            startLine: {
              type: "number",
              description: "Optional 1-based start line number"
            },
            maxLines: {
              type: "number",
              description: "Optional maximum lines to read (prevents dumping large logs or tables)"
            }
          },
          required: ["filePath"]
        }
      },
      execute: async (args) => {
        const fullPath = this.resolvePath(args.filePath);
        const start = Math.max(1, args.startLine || 1);
        const max = Math.max(1, args.maxLines || 2e3);
        const fileStream = fsSync.createReadStream(fullPath, { encoding: "utf-8" });
        const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });
        const selected = [];
        let lineIdx = 0;
        let totalLines = 0;
        for await (const line of rl) {
          lineIdx++;
          totalLines = lineIdx;
          if (lineIdx >= start && selected.length < max) {
            selected.push(`${lineIdx}: ${line}`);
          }
        }
        const endLine = selected.length > 0 ? start + selected.length - 1 : start;
        return `File: ${args.filePath} (Lines ${start}-${endLine} of ${totalLines}):
${selected.join("\n")}`;
      }
    });
    this.tools.set("write_file", {
      definition: {
        name: "write_file",
        description: "Creates or overwrites a file in the workspace with new content.",
        parameters: {
          type: "object",
          properties: {
            filePath: {
              type: "string",
              description: "Relative path to the file to write"
            },
            content: {
              type: "string",
              description: "Complete text content to write into the file"
            }
          },
          required: ["filePath", "content"]
        }
      },
      execute: async (args) => {
        this.assertNotProtected(args.filePath);
        const fullPath = this.resolvePath(args.filePath);
        await fs5.mkdir(path5.dirname(fullPath), { recursive: true });
        await fs5.writeFile(fullPath, args.content, "utf-8");
        return `Successfully wrote ${args.content.length} characters to ${args.filePath}`;
      }
    });
    this.tools.set("replace_file_content", {
      definition: {
        name: "replace_file_content",
        description: "Replaces an exact target substring with replacement content in an existing file. Note: For analysis scripts and files under 150 lines, prefer 'write_file' to overwrite the complete file cleanly and avoid whitespace mismatch errors.",
        parameters: {
          type: "object",
          properties: {
            filePath: {
              type: "string",
              description: "Relative path to the file to edit"
            },
            targetContent: {
              type: "string",
              description: "Exact substring to find and replace"
            },
            replacementContent: {
              type: "string",
              description: "New content to replace the target substring with"
            }
          },
          required: ["filePath", "targetContent", "replacementContent"]
        }
      },
      execute: async (args) => {
        this.assertNotProtected(args.filePath);
        const fullPath = this.resolvePath(args.filePath);
        const content = await fs5.readFile(fullPath, "utf-8");
        if (!content.includes(args.targetContent)) {
          throw new Error(`Target content was not found in ${args.filePath}. Ensure exact whitespace and line match.`);
        }
        const updated = content.replace(args.targetContent, () => args.replacementContent);
        await fs5.writeFile(fullPath, updated, "utf-8");
        return `Successfully replaced content in ${args.filePath}`;
      }
    });
    this.tools.set("list_directory", {
      definition: {
        name: "list_directory",
        description: "Lists files and folders inside a given workspace directory.",
        parameters: {
          type: "object",
          properties: {
            dirPath: {
              type: "string",
              description: "Relative path to directory to inspect (e.g. 'data', 'logs', 'code')"
            }
          },
          required: ["dirPath"]
        }
      },
      execute: async (args) => {
        const fullPath = this.resolvePath(args.dirPath || ".");
        const entries = await fs5.readdir(fullPath, { withFileTypes: true });
        const list = entries.map((e) => `${e.isDirectory() ? "[DIR]" : "[FILE]"} ${e.name}`).join("\n");
        return `Directory '${args.dirPath}':
${list || "(empty)"}`;
      }
    });
    this.tools.set("check_checkpoint_gate", {
      definition: {
        name: "check_checkpoint_gate",
        description: "Checks whether required checkpoint files exist, are non-empty, and returns their file size.",
        parameters: {
          type: "object",
          properties: {
            requiredFiles: {
              type: "array",
              description: "Array of relative paths to files that must exist (e.g. ['logs/01_data_quality.log', 'data/tidyproteomics_data.rds'])",
              items: { type: "string" }
            }
          },
          required: ["requiredFiles"]
        }
      },
      execute: async (args) => {
        const results = [];
        let allPassed = true;
        for (const file of args.requiredFiles) {
          const fullPath = this.resolvePath(file);
          if (file.includes("*")) {
            const dir = path5.dirname(fullPath);
            const basePattern = path5.basename(file);
            try {
              const entries = await fs5.readdir(dir);
              const regexStr = "^" + basePattern.replace(/[-/\\^$+?.()|[\]{}]/g, "\\$&").replace(/\\\*/g, ".*") + "$";
              const regex = new RegExp(regexStr);
              const matched = entries.filter((e) => regex.test(e));
              if (matched.length > 0) {
                let anyValid = false;
                for (const m of matched) {
                  const s = await fs5.stat(path5.join(dir, m));
                  if (s.size > 0) {
                    anyValid = true;
                    results.push(`PASS: ${path5.join(path5.dirname(file), m)} (size: ${s.size} bytes)`);
                  }
                }
                if (!anyValid) {
                  results.push(`FAIL: ${file} matched files but all had 0 bytes`);
                  allPassed = false;
                }
              } else {
                results.push(`FAIL: ${file} matched 0 files in directory`);
                allPassed = false;
              }
            } catch {
              results.push(`FAIL: Directory for ${file} does not exist`);
              allPassed = false;
            }
          } else {
            try {
              const stat3 = await fs5.stat(fullPath);
              if (stat3.size > 0) {
                results.push(`PASS: ${file} (size: ${stat3.size} bytes)`);
              } else {
                results.push(`FAIL: ${file} exists but has 0 bytes`);
                allPassed = false;
              }
            } catch {
              results.push(`FAIL: ${file} does not exist`);
              allPassed = false;
            }
          }
        }
        return `Checkpoint Gate Status: ${allPassed ? "ALL CHECKPOINTS PASSED" : "GATE FAILED"}
${results.join("\n")}`;
      }
    });
    this.tools.set("complete_phase", {
      definition: {
        name: "complete_phase",
        description: "Signals that the current phase's objectives, code execution, and quality gates have completed successfully.",
        parameters: {
          type: "object",
          properties: {
            phaseName: {
              type: "string",
              description: "The name or filename of the completed phase"
            },
            summary: {
              type: "string",
              description: "Structured summary of findings, verified outputs, and gate status to update notes.md"
            }
          },
          required: ["phaseName", "summary"]
        }
      },
      execute: async (args) => {
        return `PHASE_COMPLETED: ${args.phaseName}
Summary:
${args.summary}`;
      }
    });
  }
};

// src/ui/SidebarViewProvider.ts
var SidebarViewProvider = class {
  constructor(_extensionUri, context) {
    this._extensionUri = _extensionUri;
    this.context = context;
    this.workspaceRoot = this.getActiveWorkspaceRoot();
    const wsConfig = vscode.workspace.getConfiguration("tidyproteomicsagent");
    const savedBaseUrl = wsConfig.get("baseUrl") || context.globalState.get("tidyproteomicsagent.baseUrl") || "";
    const savedProvider = wsConfig.get("provider") || context.globalState.get("tidyproteomicsagent.provider") || "anthropic";
    const savedModel = wsConfig.get("model") || context.globalState.get("tidyproteomicsagent.model") || "claude-3-7-sonnet-20250219";
    const savedMaxTokens = wsConfig.get("maxTokens") || context.globalState.get("tidyproteomicsagent.maxTokens") || 32768;
    const savedTimeoutSeconds = wsConfig.get("timeoutSeconds") || context.globalState.get("tidyproteomicsagent.timeoutSeconds") || 600;
    const fallbackApiKey = wsConfig.get("apiKey") || context.globalState.get("tidyproteomicsagent.apiKey") || "";
    const config = {
      provider: savedProvider,
      model: savedModel,
      apiKey: fallbackApiKey,
      baseUrl: savedBaseUrl,
      maxTokens: savedMaxTokens,
      timeoutSeconds: savedTimeoutSeconds
    };
    this.client = new ProviderClient(config);
    context.secrets.get("tidyproteomicsagent.apiKey").then(
      (secretKey) => {
        if (secretKey) {
          this.client.updateConfig({ apiKey: secretKey });
          this.syncActiveModelSummary().catch(() => {
          });
          this.refreshState().catch(() => {
          });
        }
      },
      (err) => {
        console.warn("[SidebarViewProvider] Could not load API key from secrets:", err);
      }
    );
    this.tools = new ToolRegistry(this.workspaceRoot);
    this.orchestrator = new PipelineOrchestrator(
      this.workspaceRoot,
      this.client,
      this.tools,
      (state) => this.sendStateUpdate(state),
      (log) => this.sendLog(log),
      this.getExtensionVersion()
    );
    this.syncActiveModelSummary().catch(() => {
    });
    context.subscriptions.push(
      vscode.workspace.onDidChangeConfiguration(async (e) => {
        if (e.affectsConfiguration("tidyproteomicsagent")) {
          const cfg = vscode.workspace.getConfiguration("tidyproteomicsagent");
          const updatedProv = cfg.get("provider");
          this.client.updateConfig({
            ...updatedProv ? { provider: updatedProv } : {},
            model: cfg.get("model"),
            baseUrl: cfg.get("baseUrl"),
            maxTokens: cfg.get("maxTokens"),
            timeoutSeconds: cfg.get("timeoutSeconds")
          });
          await this.syncActiveModelSummary();
          this.refreshState().catch(() => {
          });
        }
      })
    );
  }
  static viewType = "tidyproteomicsagent.sidebarView";
  _view;
  orchestrator;
  client;
  tools;
  workspaceRoot;
  customWorkspaceRoot;
  onFolderChangedCallback;
  getExtensionVersion() {
    try {
      if (this.context.extension?.packageJSON?.version) {
        return this.context.extension.packageJSON.version;
      }
      const pkgPath = path6.join(this._extensionUri.fsPath, "package.json");
      if (fs6.existsSync(pkgPath)) {
        const pkg = JSON.parse(fs6.readFileSync(pkgPath, "utf-8"));
        if (pkg.version)
          return pkg.version;
      }
    } catch (_) {
    }
    return "0.1.0";
  }
  async syncActiveModelSummary() {
    if (!this.workspaceRoot)
      return;
    try {
      const version = this.getExtensionVersion();
      if (this.orchestrator) {
        this.orchestrator.setExtensionVersion(version);
      }
      await writeActiveModelSummaryFile(this.workspaceRoot, this.client.getConfig(), version);
    } catch (err) {
      console.error("[SidebarViewProvider] Error syncing active model summary:", err);
    }
  }
  setCustomWorkspaceRoot(folderPath) {
    this.customWorkspaceRoot = folderPath;
    this.workspaceRoot = folderPath;
  }
  getActiveWorkspaceRoot() {
    if (this.customWorkspaceRoot && fs6.existsSync(this.customWorkspaceRoot)) {
      return this.customWorkspaceRoot;
    }
    const folders = vscode.workspace.workspaceFolders;
    if (folders && folders.length > 0) {
      const activeDoc2 = vscode.window.activeTextEditor?.document;
      if (activeDoc2 && activeDoc2.uri.scheme === "file") {
        const matchingFolder = vscode.workspace.getWorkspaceFolder(activeDoc2.uri);
        if (matchingFolder) {
          const fsPath2 = matchingFolder.uri.fsPath;
          if (fsPath2.endsWith("/extension") || fsPath2.endsWith("\\extension")) {
            const parent = path6.dirname(fsPath2);
            if (fs6.existsSync(path6.join(parent, "agent")) || fs6.existsSync(path6.join(parent, "prompts")) || fs6.existsSync(path6.join(parent, "analysis"))) {
              return parent;
            }
          }
          return fsPath2;
        }
      }
      const fsPath = folders[0].uri.fsPath;
      if (fsPath.endsWith("/extension") || fsPath.endsWith("\\extension")) {
        const parent = path6.dirname(fsPath);
        if (fs6.existsSync(path6.join(parent, "agent")) || fs6.existsSync(path6.join(parent, "prompts")) || fs6.existsSync(path6.join(parent, "analysis"))) {
          return parent;
        }
      }
      return fsPath;
    }
    const activeDoc = vscode.window.activeTextEditor?.document;
    if (activeDoc && activeDoc.uri.scheme === "file") {
      const docDir = path6.dirname(activeDoc.uri.fsPath);
      if (fs6.existsSync(path6.join(docDir, "agent")) || fs6.existsSync(path6.join(docDir, "prompts")) || fs6.existsSync(path6.join(docDir, "analysis"))) {
        return docDir;
      }
      const parentDir = path6.dirname(docDir);
      if (fs6.existsSync(path6.join(parentDir, "agent")) || fs6.existsSync(path6.join(parentDir, "prompts")) || fs6.existsSync(path6.join(parentDir, "analysis"))) {
        return parentDir;
      }
      return docDir;
    }
    return "";
  }
  isScanning = false;
  pendingScan = false;
  async onWorkspaceChanged() {
    try {
      if (this.orchestrator?.getIsRunning()) {
        return;
      }
      this.customWorkspaceRoot = void 0;
      const newRoot = this.getActiveWorkspaceRoot();
      const changed = newRoot !== this.workspaceRoot;
      this.workspaceRoot = newRoot;
      this.tools.setWorkspaceRoot(this.workspaceRoot);
      if (this.orchestrator) {
        if (changed) {
          await this.orchestrator.setWorkingDirectory(this.workspaceRoot);
        } else {
          await this.refreshPhases();
        }
      }
      await this.syncActiveModelSummary();
    } catch (err) {
      console.error("[SidebarViewProvider] Error in onWorkspaceChanged:", err);
    }
  }
  async refreshPhases() {
    if (this.isScanning || this.orchestrator?.getIsRunning()) {
      return;
    }
    this.isScanning = true;
    try {
      if (this.orchestrator) {
        await this.orchestrator.rescanPhases();
        const state = await this.orchestrator.getState();
        this.sendStateUpdate(state);
      }
    } catch (err) {
      console.error("[SidebarViewProvider] Error in refreshPhases:", err);
    } finally {
      this.isScanning = false;
      if (this.pendingScan && !this.orchestrator?.getIsRunning()) {
        this.pendingScan = false;
        this.refreshPhases().catch(() => {
        });
      }
    }
  }
  async refreshState() {
    try {
      if (this.orchestrator) {
        const state = await this.orchestrator.getState();
        this.sendStateUpdate(state);
      }
    } catch (err) {
      console.error("[SidebarViewProvider] Error in refreshState:", err);
    }
  }
  async forceReload() {
    if (this.isScanning || this.orchestrator?.getIsRunning()) {
      return;
    }
    try {
      if (this.orchestrator) {
        await this.orchestrator.forceReloadFromDisk();
      }
    } catch (err) {
      console.error("[SidebarViewProvider] Error in forceReload:", err);
    }
  }
  async resetAllState() {
    if (this.isScanning || this.orchestrator?.getIsRunning()) {
      return;
    }
    try {
      await this.syncActiveModelSummary();
      if (this.orchestrator) {
        await this.orchestrator.resetAllState();
      }
    } catch (err) {
      console.error("[SidebarViewProvider] Error in resetAllState:", err);
    }
  }
  resolveWebviewView(webviewView, _context, _token) {
    this._view = webviewView;
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri]
    };
    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);
    setTimeout(() => {
      this.syncActiveModelSummary().catch(() => {
      });
      this.refreshPhases().catch(() => {
      });
    }, 150);
    webviewView.onDidChangeVisibility(() => {
      if (webviewView.visible) {
        if (!this.orchestrator?.getIsRunning()) {
          this.refreshPhases().catch(() => {
          });
        } else {
          this.refreshState().catch(() => {
          });
        }
      }
    });
    webviewView.webview.onDidReceiveMessage(async (data) => {
      try {
        switch (data.type) {
          case "saveConfig": {
            const maxTokens = Number(data.maxTokens) || 32768;
            const timeoutSeconds = Number(data.timeoutSeconds) || 600;
            this.client.updateConfig({
              provider: data.provider,
              model: data.model,
              apiKey: data.apiKey,
              baseUrl: data.baseUrl,
              maxTokens,
              timeoutSeconds
            });
            if (data.apiKey) {
              await this.context.secrets.store("tidyproteomicsagent.apiKey", data.apiKey);
            } else if (data.apiKey === "") {
              await this.context.secrets.delete("tidyproteomicsagent.apiKey");
            }
            try {
              const wsConfig = vscode.workspace.getConfiguration("tidyproteomicsagent");
              await wsConfig.update("provider", data.provider, vscode.ConfigurationTarget.Global);
              await wsConfig.update("model", data.model, vscode.ConfigurationTarget.Global);
              await wsConfig.update("baseUrl", data.baseUrl, vscode.ConfigurationTarget.Global);
              await wsConfig.update("maxTokens", maxTokens, vscode.ConfigurationTarget.Global);
              await wsConfig.update("timeoutSeconds", timeoutSeconds, vscode.ConfigurationTarget.Global);
            } catch (_) {
            }
            await this.context.globalState.update("tidyproteomicsagent.provider", data.provider);
            await this.context.globalState.update("tidyproteomicsagent.model", data.model);
            await this.context.globalState.update("tidyproteomicsagent.baseUrl", data.baseUrl);
            await this.context.globalState.update("tidyproteomicsagent.maxTokens", maxTokens);
            await this.context.globalState.update("tidyproteomicsagent.timeoutSeconds", timeoutSeconds);
            await this.syncActiveModelSummary();
            if (!data.silent) {
              vscode.window.showInformationMessage("TidyProteomicsAgent: Configuration saved!");
            }
            const state = await this.orchestrator?.getState();
            if (state)
              this.sendStateUpdate(state);
            break;
          }
          case "startPipeline": {
            if (!this.workspaceRoot) {
              vscode.window.showErrorMessage("TidyProteomicsAgent: Please open a workspace folder in VS Code first.");
              return;
            }
            const cfg = this.client.getConfig();
            if (cfg.provider !== "ollama" && !cfg.apiKey) {
              vscode.window.showErrorMessage("TidyProteomicsAgent: Please enter an API key first.");
              return;
            }
            await this.syncActiveModelSummary();
            this.orchestrator?.runFullPipeline().catch((err) => {
              vscode.window.showErrorMessage(`TidyProteomicsAgent: Pipeline error - ${err.message}`);
            });
            break;
          }
          case "runPhase": {
            if (!this.workspaceRoot) {
              vscode.window.showErrorMessage("TidyProteomicsAgent: Please open a workspace folder in VS Code first.");
              return;
            }
            const cfg = this.client.getConfig();
            if (cfg.provider !== "ollama" && !cfg.apiKey) {
              vscode.window.showErrorMessage("TidyProteomicsAgent: Please enter an API key first.");
              return;
            }
            await this.syncActiveModelSummary();
            this.orchestrator?.runSinglePhase(data.phaseId).catch((err) => {
              vscode.window.showErrorMessage(`TidyProteomicsAgent: Phase execution error - ${err.message}`);
            });
            break;
          }
          case "togglePhase": {
            this.orchestrator?.togglePhase(data.phaseId, data.enabled);
            break;
          }
          case "stopPipeline": {
            this.orchestrator?.stop();
            break;
          }
          case "forceReload": {
            await this.forceReload();
            break;
          }
          case "resetState": {
            await this.resetAllState();
            break;
          }
          case "openFile": {
            if (!this.workspaceRoot) {
              vscode.window.showErrorMessage("TidyProteomicsAgent: Please open a workspace folder in VS Code first.");
              return;
            }
            const targetRelPath = data.relPath || "";
            const targetPath = path6.isAbsolute(targetRelPath) ? targetRelPath : path6.join(this.workspaceRoot, targetRelPath);
            try {
              if (!fs6.existsSync(targetPath)) {
                fs6.mkdirSync(path6.dirname(targetPath), { recursive: true });
                fs6.writeFileSync(targetPath, "", "utf-8");
              }
              const doc = await vscode.workspace.openTextDocument(targetPath);
              await vscode.window.showTextDocument(doc);
            } catch (err) {
              vscode.window.showErrorMessage(`TidyProteomicsAgent: Could not open ${targetRelPath}: ${err.message}`);
            }
            break;
          }
          case "openPhase": {
            if (!this.workspaceRoot) {
              vscode.window.showErrorMessage("TidyProteomicsAgent: Please open a workspace folder in VS Code first.");
              return;
            }
            const fileName = data.fileName || "";
            const targetPath = fileName.includes("/") || fileName.includes("\\") ? path6.join(this.workspaceRoot, fileName) : path6.join(this.workspaceRoot, "analysis", fileName);
            try {
              const doc = await vscode.workspace.openTextDocument(targetPath);
              await vscode.window.showTextDocument(doc);
            } catch (err) {
              vscode.window.showErrorMessage(`TidyProteomicsAgent: Could not open ${fileName}: ${err.message}`);
            }
            break;
          }
          case "copyPath": {
            if (this.workspaceRoot) {
              await vscode.env.clipboard.writeText(this.workspaceRoot);
              vscode.window.showInformationMessage("TidyProteomicsAgent: Workspace path copied to clipboard!");
            }
            break;
          }
          case "revealInOS": {
            if (this.workspaceRoot) {
              await vscode.commands.executeCommand("revealFileInOS", vscode.Uri.file(this.workspaceRoot));
            }
            break;
          }
          case "selectDirectory": {
            const chosen = await vscode.window.showOpenDialog({
              canSelectFiles: false,
              canSelectFolders: true,
              canSelectMany: false,
              openLabel: "Select Analysis Folder"
            });
            if (chosen && chosen.length > 0) {
              const selectedPath = chosen[0].fsPath;
              this.customWorkspaceRoot = selectedPath;
              this.workspaceRoot = selectedPath;
              this.tools.setWorkspaceRoot(this.workspaceRoot);
              if (this.orchestrator) {
                await this.orchestrator.setWorkingDirectory(this.workspaceRoot);
              }
              await this.refreshPhases();
              await this.syncActiveModelSummary();
              if (this.onFolderChangedCallback) {
                this.onFolderChangedCallback(this.workspaceRoot);
              }
              vscode.window.showInformationMessage(`TidyProteomicsAgent: Active directory set to ${this.workspaceRoot}`);
            }
            break;
          }
          case "rescanWorkspace": {
            await this.onWorkspaceChanged();
            vscode.window.showInformationMessage("TidyProteomicsAgent: Rescanned workspace folders and phases.");
            break;
          }
          case "createMissingFolders": {
            if (!this.workspaceRoot) {
              vscode.window.showErrorMessage("TidyProteomicsAgent: Please open a workspace folder in VS Code first.");
              return;
            }
            const standardDirs = ["analysis", "agent", "code", "data", path6.join("data", "raw"), "docs", "logs", "tools"];
            for (const d of standardDirs) {
              const fullDir = path6.join(this.workspaceRoot, d);
              if (!fs6.existsSync(fullDir)) {
                fs6.mkdirSync(fullDir, { recursive: true });
              }
            }
            await this.refreshPhases();
            vscode.window.showInformationMessage("TidyProteomicsAgent: Standard project folders initialized!");
            break;
          }
          case "initWorkspace": {
            await this.initWorkspace(data.pipelineId || "differential_expression");
            break;
          }
          case "promptInitWorkspace": {
            await this.promptInitWorkspace();
            break;
          }
          case "requestState": {
            await this.refreshState();
            break;
          }
        }
      } catch (e) {
        vscode.window.showErrorMessage(`TidyProteomicsAgent Error: ${e.message}`);
      }
    });
  }
  async promptInitWorkspace() {
    if (!this.workspaceRoot) {
      const chosen2 = await vscode.window.showOpenDialog({
        canSelectFiles: false,
        canSelectFolders: true,
        canSelectMany: false,
        openLabel: "Select Analysis Folder to Initialize"
      });
      if (chosen2 && chosen2.length > 0) {
        this.workspaceRoot = chosen2[0].fsPath;
        this.customWorkspaceRoot = this.workspaceRoot;
        this.tools.setWorkspaceRoot(this.workspaceRoot);
        if (this.orchestrator) {
          await this.orchestrator.setWorkingDirectory(this.workspaceRoot);
        }
        if (this.onFolderChangedCallback) {
          this.onFolderChangedCallback(this.workspaceRoot);
        }
        await this.syncActiveModelSummary();
      } else {
        return;
      }
    }
    const items = [
      {
        label: "$(symbol-structure) Differential Expression Pipeline",
        description: "Full 8-phase workflow (Install, Inspect, Normalize, Impute, Expression, Enrichment, Observations, Report)",
        id: "differential_expression"
      },
      {
        label: "$(graph) Quality Control & Exploration Pipeline",
        description: "2-phase rapid QC and exploratory data analysis",
        id: "quality_control_only"
      }
    ];
    const chosen = await vscode.window.showQuickPick(items, {
      placeHolder: "Select a pipeline template to initialize this workspace"
    });
    if (chosen) {
      await this.initWorkspace(chosen.id);
    }
  }
  async initWorkspace(pipelineId = "differential_expression") {
    if (!this.workspaceRoot) {
      const chosen = await vscode.window.showOpenDialog({
        canSelectFiles: false,
        canSelectFolders: true,
        canSelectMany: false,
        openLabel: "Select Analysis Folder to Initialize"
      });
      if (chosen && chosen.length > 0) {
        this.workspaceRoot = chosen[0].fsPath;
        this.customWorkspaceRoot = this.workspaceRoot;
        this.tools.setWorkspaceRoot(this.workspaceRoot);
        if (this.orchestrator) {
          await this.orchestrator.setWorkingDirectory(this.workspaceRoot);
        }
        if (this.onFolderChangedCallback) {
          this.onFolderChangedCallback(this.workspaceRoot);
        }
        await this.syncActiveModelSummary();
      } else {
        vscode.window.showErrorMessage("TidyProteomicsAgent: Please open or select a workspace folder first.");
        return false;
      }
    }
    try {
      const candidatePaths = [
        path6.join(this._extensionUri.fsPath, "templates"),
        path6.join(this._extensionUri.fsPath, "extension", "templates"),
        path6.join(this.context.extensionPath, "templates"),
        path6.join(this.context.extensionPath, "extension", "templates"),
        path6.join(__dirname, "..", "templates"),
        path6.join(__dirname, "..", "..", "templates"),
        path6.join(__dirname, "templates"),
        path6.join(this.workspaceRoot, "extension", "templates"),
        path6.join(this.workspaceRoot, "templates")
      ];
      const templateBase = candidatePaths.find((p) => fs6.existsSync(p));
      if (!templateBase) {
        vscode.window.showErrorMessage(
          "TidyProteomicsAgent: Template directory not found in extension or workspace."
        );
        return false;
      }
      const standardDirs = ["analysis", "agent", "code", "data", path6.join("data", "raw"), "docs", "logs", "tools"];
      for (const d of standardDirs) {
        const fullDir = path6.join(this.workspaceRoot, d);
        if (!fs6.existsSync(fullDir)) {
          fs6.mkdirSync(fullDir, { recursive: true });
        }
      }
      const copyFileSafe = (src, dest, overwrite = false) => {
        if (fs6.existsSync(src)) {
          if (overwrite || !fs6.existsSync(dest)) {
            fs6.mkdirSync(path6.dirname(dest), { recursive: true });
            fs6.copyFileSync(src, dest);
          }
        }
      };
      const sharedDir = path6.join(templateBase, "shared");
      if (fs6.existsSync(sharedDir)) {
        copyFileSafe(path6.join(sharedDir, "code", "00_install.R"), path6.join(this.workspaceRoot, "code", "00_install.R"), true);
        copyFileSafe(path6.join(sharedDir, "tools", "lint_tidyproteomics.R"), path6.join(this.workspaceRoot, "tools", "lint_tidyproteomics.R"), true);
        copyFileSafe(path6.join(sharedDir, "agent", "PROTOCOL.md"), path6.join(this.workspaceRoot, "agent", "PROTOCOL.md"), true);
        copyFileSafe(path6.join(sharedDir, "agent", "SKILL.md"), path6.join(this.workspaceRoot, "agent", "SKILL.md"), true);
        copyFileSafe(path6.join(sharedDir, "docs", "experiment.md"), path6.join(this.workspaceRoot, "docs", "experiment.md"), false);
        copyFileSafe(path6.join(sharedDir, "docs", "notes.md"), path6.join(this.workspaceRoot, "docs", "notes.md"), false);
        copyFileSafe(path6.join(sharedDir, "docs", "concept.md"), path6.join(this.workspaceRoot, "docs", "concept.md"), false);
        copyFileSafe(path6.join(sharedDir, ".gitignore"), path6.join(this.workspaceRoot, ".gitignore"), false);
        copyFileSafe(path6.join(sharedDir, "logs", ".gitkeep"), path6.join(this.workspaceRoot, "logs", ".gitkeep"), false);
        copyFileSafe(path6.join(sharedDir, "data", "raw", ".gitkeep"), path6.join(this.workspaceRoot, "data", "raw", ".gitkeep"), false);
      }
      let pipelineDir = path6.join(templateBase, "pipelines", pipelineId);
      if (!fs6.existsSync(pipelineDir)) {
        pipelineDir = path6.join(templateBase, "pipelines", "differential_expression");
      }
      if (fs6.existsSync(pipelineDir)) {
        const pFiles = fs6.readdirSync(pipelineDir).filter((f) => f.endsWith(".md"));
        for (const pf of pFiles) {
          copyFileSafe(path6.join(pipelineDir, pf), path6.join(this.workspaceRoot, "analysis", pf), true);
        }
      } else {
        vscode.window.showWarningMessage(`TidyProteomicsAgent: Pipeline templates not found in ${templateBase}/pipelines.`);
      }
      await this.syncActiveModelSummary();
      await this.refreshPhases();
      const state = await this.orchestrator?.getState();
      if (state)
        this.sendStateUpdate(state);
      const pipelineDisplayName = pipelineId === "quality_control_only" ? "Quality Control & Exploration" : "Standard Differential Expression";
      vscode.window.showInformationMessage(`TidyProteomicsAgent: Workspace initialized with ${pipelineDisplayName} pipeline!`);
      const targetFocusFile = path6.join(this.workspaceRoot, "docs", "experiment.md");
      if (fs6.existsSync(targetFocusFile)) {
        try {
          const doc = await vscode.workspace.openTextDocument(targetFocusFile);
          await vscode.window.showTextDocument(doc);
        } catch (_) {
        }
      }
      return true;
    } catch (err) {
      vscode.window.showErrorMessage(`TidyProteomicsAgent: Failed to initialize workspace - ${err.message}`);
      return false;
    }
  }
  startPipeline() {
    this.syncActiveModelSummary().catch(() => {
    });
    this.orchestrator?.runFullPipeline().catch((err) => {
      vscode.window.showErrorMessage(`TidyProteomicsAgent: Pipeline error - ${err.message}`);
    });
  }
  async runSelectedPhase() {
    if (!this.workspaceRoot) {
      vscode.window.showErrorMessage("TidyProteomicsAgent: Please open a workspace folder in VS Code first.");
      return;
    }
    const cfg = this.client.getConfig();
    if (cfg.provider !== "ollama" && !cfg.apiKey) {
      vscode.window.showErrorMessage("TidyProteomicsAgent: Please enter an API key first.");
      return;
    }
    await this.syncActiveModelSummary();
    if (!this.orchestrator)
      return;
    const phases = this.orchestrator.getPhases();
    if (phases.length === 0) {
      vscode.window.showInformationMessage("TidyProteomicsAgent: No phases found to run.");
      return;
    }
    const current = phases.find((p) => p.status === "running") || phases.find((p) => p.status === "pending" && p.enabled !== false) || phases[0];
    const items = phases.map((p) => ({
      label: p.title,
      description: `(${p.fileName}) - ${p.status.toUpperCase()}`,
      phaseId: p.id,
      picked: p.id === current?.id
    }));
    const chosen = await vscode.window.showQuickPick(items, {
      placeHolder: "Select phase to run in isolation"
    });
    if (chosen) {
      this.orchestrator.runSinglePhase(chosen.phaseId).catch((err) => {
        vscode.window.showErrorMessage(`TidyProteomicsAgent: Error running phase - ${err.message}`);
      });
    }
  }
  sendStateUpdate(state) {
    if (this._view && this._view.webview) {
      try {
        const p = this._view.webview.postMessage({ type: "stateUpdate", state });
        if (p && typeof p.then === "function") {
          p.then(void 0, (err) => {
            console.warn("[SidebarViewProvider] Failed to post stateUpdate:", err);
          });
        }
      } catch (err) {
        console.warn("[SidebarViewProvider] Exception posting stateUpdate:", err);
      }
    }
  }
  sendLog(text) {
    if (this._view && this._view.webview) {
      try {
        const p = this._view.webview.postMessage({ type: "log", text });
        if (p && typeof p.then === "function") {
          p.then(void 0, (err) => {
            console.warn("[SidebarViewProvider] Failed to post log:", err);
          });
        }
      } catch (err) {
        console.warn("[SidebarViewProvider] Exception posting log:", err);
      }
    }
  }
  escapeAttr(str) {
    return String(str || "").replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/'/g, "&#39;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
  _cachedIcons;
  _loadIcons() {
    const icons = {};
    const mediaDir = path6.join(this._extensionUri.fsPath, "media");
    try {
      if (fs6.existsSync(mediaDir)) {
        const files = fs6.readdirSync(mediaDir);
        for (const file of files) {
          if (file.endsWith(".svg")) {
            const key = file.replace(".svg", "");
            let content = fs6.readFileSync(path6.join(mediaDir, file), "utf-8");
            content = content.replace(/<\?xml[^>]*\?>/g, "").trim();
            content = content.replace(/\s(width|height)="[^"]*"/g, "");
            if (key === "robot") {
              content = content.replace("<svg ", `<svg class="svg-icon svg-icon-${key}" `);
            } else {
              content = content.replace("<svg ", `<svg class="svg-icon svg-icon-${key}" fill="currentColor" `);
            }
            icons[key] = content;
          }
        }
      }
    } catch (err) {
      console.error("[SidebarViewProvider] Error loading SVG icons:", err);
    }
    return icons;
  }
  _getIcons() {
    if (!this._cachedIcons) {
      this._cachedIcons = this._loadIcons();
    }
    return this._cachedIcons;
  }
  _getHtmlForWebview(_webview) {
    const config = this.client.getConfig();
    const icons = this._getIcons();
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; font-src data:; img-src https: data:;">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>TidyProteomicsAgent</title>
  <style>
    :root {
      --bg: var(--vscode-sideBar-background, #18181b);
      --fg: var(--vscode-sideBar-foreground, #e4e4e7);
      --card-bg: var(--vscode-editor-background, #27272a);
      --border: var(--vscode-widget-border, rgba(127, 127, 127, 0.25));
      --primary: var(--vscode-button-background, #3b82f6);
      --primary-hover: var(--vscode-button-hoverBackground, #2563eb);
      --success: #10b981;
      --warning: #f59e0b;
      --error: var(--vscode-errorForeground, #ef4444);
      --cached: #8b5cf6;
      --muted: var(--vscode-descriptionForeground, #a1a1aa);
      --terminal-bg: var(--vscode-terminal-background, #09090b);
      --terminal-fg: var(--vscode-terminal-foreground, #22c55e);
    }
    *, *::before, *::after {
      box-sizing: border-box;
    }
    html {
      height: 100%;
    }
    body {
      font-family: var(--vscode-font-family, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif);
      font-size: 12px;
      color: var(--fg);
      background-color: var(--bg);
      padding: 10px;
      line-height: 1.4;
      display: flex;
      flex-direction: column;
      height: 100%;
      min-height: 100%;
      overflow-x: hidden;
      overflow-y: auto;
    }
    h2, h3, h4 { font-weight: 600; margin-bottom: 4px; }
    
    /* Top Header Bar */
    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid var(--border);
      padding-bottom: 8px;
      margin-bottom: 10px;
      flex: 0 0 auto;
    }
    .header-left {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .ws-chip {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 2px 8px;
      font-size: 10px;
      color: #93c5fd;
      cursor: pointer;
      max-width: 140px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      transition: border-color 0.15s ease, background 0.15s ease;
    }
    .ws-chip:hover {
      border-color: var(--primary);
      background: rgba(59, 130, 246, 0.15);
    }

    /* Badges */
    .badge {
      display: inline-block;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 9px;
      text-transform: uppercase;
      font-weight: 700;
      letter-spacing: 0.5px;
    }
    .badge-pending { background: #52525b; color: #fff; }
    .badge-queued { background: #6366f1; color: #fff; }
    .badge-running { background: var(--primary); color: #fff; animation: pulse 1.5s infinite; }
    .badge-completed { background: var(--success); color: #fff; }
    .badge-failed { background: var(--error); color: #fff; }
    .badge-cached { background: var(--cached); color: #fff; }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }

    /* Segmented Tab Bar */
    .tab-bar {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 6px;
      padding: 3px;
      margin-bottom: 12px;
      gap: 3px;
      flex: 0 0 auto;
    }
    .tab-bar button.tab-btn {
      background: transparent !important;
      color: var(--muted) !important;
      border: none !important;
      border-radius: 4px !important;
      padding: 6px 2px !important;
      cursor: pointer;
      display: flex !important;
      flex-direction: column !important;
      align-items: center !important;
      justify-content: center !important;
      gap: 2px !important;
      transition: all 0.15s ease;
      position: relative;
      width: 100% !important;
      box-shadow: none !important;
      font-weight: normal !important;
    }
    .tab-bar button.tab-btn:hover {
      color: var(--fg) !important;
      background: rgba(255, 255, 255, 0.08) !important;
    }
    .tab-bar button.tab-btn.active {
      color: #ffffff !important;
      background: var(--primary) !important;
      font-weight: 600 !important;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3) !important;
    }
    .tab-icon {
      font-size: 13px;
      line-height: 1;
      pointer-events: none;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }
    .tab-label {
      font-size: 9px;
      text-transform: uppercase;
      letter-spacing: 0.3px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      pointer-events: none;
    }
    .tab-indicator {
      position: absolute;
      top: 3px;
      right: 4px;
      width: 6px;
      height: 6px;
      border-radius: 50%;
      display: none;
      pointer-events: none;
    }
    .tab-indicator.running {
      display: block;
      background: var(--success);
      animation: pulse 1.5s infinite;
    }
    .tab-indicator.alert {
      display: block;
      background: var(--warning);
    }

    /* Tab Panes */
    .tab-pane {
      display: none;
      animation: fadeIn 0.15s ease;
    }
    .tab-pane.active {
      display: block !important;
    }
    #pane-pipeline.active {
      display: flex !important;
      flex-direction: column;
      flex: 1 1 auto;
      min-height: 0;
    }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(2px); }
      to { opacity: 1; transform: translateY(0); }
    }

    /* Containers & Cards */
    .section {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 6px;
      padding: 8px 10px;
      margin-bottom: 10px;
      flex: 0 0 auto;
    }
    .terminal-section {
      display: flex !important;
      flex-direction: column;
      flex: 1 1 auto;
      min-height: 150px;
      margin-bottom: 0 !important;
    }
    .terminal-section .section-header {
      flex: 0 0 auto;
    }
    .terminal-section .terminal {
      flex: 1 1 auto;
      height: 100%;
      min-height: 110px;
    }
    .section-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 6px;
    }
    .section-desc {
      font-size: 10px;
      color: var(--muted);
      margin-bottom: 8px;
    }

    .form-group {
      margin-bottom: 8px;
    }
    label {
      display: block;
      font-size: 10px;
      margin-bottom: 3px;
      color: var(--muted);
      text-transform: uppercase;
      font-weight: 600;
    }
    input, select {
      width: 100%;
      background: var(--bg);
      border: 1px solid var(--border);
      color: var(--fg);
      padding: 6px 8px;
      border-radius: 4px;
      font-size: 11px;
      outline: none;
    }
    input:focus, select:focus {
      border-color: var(--primary);
    }

    /* Buttons */
    button {
      background: var(--primary);
      color: #fff;
      border: none;
      border-radius: 4px;
      padding: 6px 10px;
      font-size: 11px;
      font-weight: 500;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 4px;
      transition: background 0.15s;
    }
    button:hover { background: var(--primary-hover); }
    button.btn-stop { background: var(--error); }
    button.btn-stop:hover { background: #dc2626; }
    button.btn-secondary {
      background: #3f3f46;
      color: #fff;
    }
    button.btn-secondary:hover {
      background: #52525b;
    }
    button.btn-sm {
      padding: 3px 8px;
      font-size: 10px;
      background: #3f3f46;
    }
    button.btn-sm:hover {
      background: #52525b;
    }
    button.btn-icon {
      background: transparent;
      border: 1px solid var(--border);
      color: var(--muted);
      border-radius: 4px;
      padding: 1px 6px;
      font-size: 12px;
      line-height: 14px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s ease;
    }
    button.btn-icon:hover {
      color: var(--fg);
      border-color: var(--primary);
      background: rgba(59, 130, 246, 0.15);
    }

    /* Analysis Task Cards */
    .task-card {
      background: var(--bg);
      border: 1px solid var(--border);
      border-radius: 5px;
      padding: 6px 8px;
      margin-bottom: 5px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 6px;
      transition: border-color 0.15s ease, background 0.15s ease;
    }
    .task-card:hover {
      border-color: rgba(59, 130, 246, 0.4);
      background: rgba(255, 255, 255, 0.02);
    }
    .task-card.running {
      border-color: var(--primary);
      background: rgba(59, 130, 246, 0.08);
      box-shadow: 0 0 8px rgba(59, 130, 246, 0.25);
    }
    .task-left {
      display: flex;
      align-items: center;
      gap: 8px;
      min-width: 0;
      flex: 1 1 auto;
    }
    .task-left input[type="checkbox"] {
      width: 13px;
      height: 13px;
      cursor: pointer;
      accent-color: var(--primary);
      margin: 0;
      flex-shrink: 0;
    }
    .task-name {
      font-weight: 600;
      font-size: 11px;
      font-family: var(--vscode-editor-font-family, monospace);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      cursor: pointer;
      color: var(--fg);
      letter-spacing: 0.2px;
    }
    .task-name:hover {
      color: var(--primary);
      text-decoration: underline;
    }
    .task-right {
      display: flex;
      align-items: center;
      gap: 6px;
      flex-shrink: 0;
    }
    .btn-run {
      background: rgba(59, 130, 246, 0.15);
      color: #93c5fd;
      border: 1px solid rgba(59, 130, 246, 0.35);
      border-radius: 3px;
      padding: 2px 7px;
      font-size: 9.5px;
      font-weight: 700;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 2px;
      line-height: 1.2;
      transition: all 0.15s ease;
    }
    .btn-run:hover:not(:disabled) {
      background: var(--primary);
      color: #ffffff;
      border-color: var(--primary);
    }
    .btn-run:disabled {
      opacity: 0.3;
      cursor: not-allowed;
      pointer-events: none;
      background: transparent;
      border-color: rgba(255, 255, 255, 0.1);
      color: var(--muted);
    }
    .task-duration {
      font-size: 9.5px;
      font-family: var(--vscode-editor-font-family, monospace);
      color: var(--muted);
      min-width: 32px;
      text-align: right;
    }

    /* File Cards (Memory & Protocol) */
    .file-card {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 6px 8px;
      background: var(--bg);
      border: 1px solid var(--border);
      border-radius: 4px;
      margin-bottom: 5px;
      font-size: 11px;
      cursor: pointer;
      transition: border-color 0.15s ease, background 0.15s ease;
    }
    .file-card:hover {
      border-color: var(--primary);
      background: rgba(59, 130, 246, 0.08);
    }
    .file-title {
      font-weight: 600;
      font-size: 11px;
    }
    .file-path {
      font-size: 9px;
      color: var(--muted);
      font-family: monospace;
    }

    /* Folder Status Cards (Active Directory) */
    .folder-card {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 6px 8px;
      background: var(--bg);
      border: 1px solid var(--border);
      border-radius: 4px;
      margin-bottom: 5px;
      font-size: 11px;
    }
    .folder-name {
      font-weight: 600;
      font-size: 11px;
      color: #93c5fd;
      font-family: monospace;
    }
    .folder-desc {
      font-size: 9px;
      color: var(--muted);
    }

    /* Info Callout */
    .callout {
      background: rgba(59, 130, 246, 0.08);
      border: 1px solid rgba(59, 130, 246, 0.3);
      border-radius: 5px;
      padding: 8px;
      margin-top: 8px;
      font-size: 10px;
      line-height: 1.4;
      color: #bfdbfe;
    }
    .callout b {
      color: #ffffff;
    }

    /* Tokens Table */
    .tokens-table {
      width: 100%;
      table-layout: fixed;
      border-collapse: separate;
      border-spacing: 0;
      background: var(--bg);
      border: 1px solid var(--border);
      border-radius: 4px;
      overflow: hidden;
      margin-top: 4px;
    }
    .tokens-table th,
    .tokens-table td {
      text-align: center;
      padding: 5px 2px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .tokens-table th {
      font-size: 9px;
      text-transform: uppercase;
      font-weight: 600;
      letter-spacing: 0.4px;
      color: var(--muted);
      background: rgba(127, 127, 127, 0.08);
      border-bottom: 1px solid var(--border);
    }
    .tokens-table td {
      font-size: 13px;
      font-weight: 700;
      color: var(--primary);
      font-variant-numeric: tabular-nums;
      padding: 6px 2px;
    }
    .tokens-table th:not(:last-child),
    .tokens-table td:not(:last-child) {
      border-right: 1px solid var(--border);
    }

    /* Live Feed Terminal */
    .terminal {
      background: var(--terminal-bg);
      border: 1px solid var(--border);
      border-radius: 4px;
      padding: 6px 8px;
      overflow: auto;
      font-family: var(--vscode-editor-font-family, "SF Mono", Monaco, Consolas, monospace);
      font-size: 10.5px;
      line-height: 1.5;
      white-space: pre;
      word-break: normal;
      color: var(--terminal-fg);
      flex: 1 1 auto;
      height: 100%;
      min-height: 110px;
    }

    /* Status Pill */
    .status-pill {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 10px;
      padding: 2px 6px;
      border-radius: 10px;
      background: var(--bg);
      border: 1px solid var(--border);
    }
    .dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
    }
    .dot-green { background: var(--success); }
    .dot-gray { background: #71717a; }

    /* Theme-Adaptive SVG Icons from extension/media */
    .svg-icon {
      display: inline-block;
      width: 13px;
      height: 13px;
      vertical-align: -2px;
      fill: currentColor;
      flex-shrink: 0;
    }
    .svg-icon-robot {
      fill: none !important;
      stroke: currentColor;
    }
    .tab-icon .svg-icon {
      width: 15px;
      height: 15px;
      vertical-align: middle;
    }
    h2 .svg-icon {
      width: 15px;
      height: 15px;
      vertical-align: -2px;
      margin-right: 4px;
    }
    h3 .svg-icon {
      width: 13px;
      height: 13px;
      vertical-align: -2px;
      margin-right: 4px;
    }
    button .svg-icon {
      width: 12px;
      height: 12px;
      vertical-align: -1px;
    }
    .btn-run .svg-icon {
      width: 9px;
      height: 9px;
      vertical-align: -1px;
      margin-right: 2px;
    }
    .callout b {
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }
    .callout b .svg-icon {
      width: 12px;
      height: 12px;
      vertical-align: -1px;
    }
    .ws-chip .svg-icon {
      width: 11px;
      height: 11px;
      vertical-align: -1px;
    }
    .badge .svg-icon {
      width: 9px;
      height: 9px;
      vertical-align: -1px;
      margin-left: 2px;
    }
    .tokens-table th .svg-icon {
      width: 10px;
      height: 10px;
      vertical-align: -1px;
    }
    .spin {
      display: inline-block;
      animation: spin 1s linear infinite;
    }
    @keyframes spin {
      100% { transform: rotate(360deg); }
    }
  </style>
</head>
<body>
  <!-- Header Bar -->
  <div class="header">
    <div class="header-left">
      <h2>${icons["robot"] || ""} TidyProteomicsAgent</h2>
      <span class="badge badge-completed" id="pipelineHeaderBadge">IDLE</span>
    </div>
    <div class="ws-chip" id="wsChip" title="Click to view Active Directory">
      <span>${icons["folder-open"] || ""}</span>
      <span id="wsChipName">Project</span>
    </div>
  </div>

  <!-- Segmented Tab Navigation -->
  <div class="tab-bar">
    <button type="button" class="tab-btn active" data-tab="pipeline" onclick="window.switchTab && window.switchTab('pipeline')" title="Pipeline execution, phases & live feed">
      <span class="tab-icon">${icons["rocket-lunch"] || ""}</span>
      <span class="tab-label">Pipeline</span>
      <span class="tab-indicator" id="pipelineIndicator"></span>
    </button>
    <button type="button" class="tab-btn" data-tab="blackboard" onclick="window.switchTab && window.switchTab('blackboard')" title="Memory notes, protocol & chat log">
      <span class="tab-icon">${icons["ftp"] || ""}</span>
      <span class="tab-label">Memory</span>
    </button>
    <button type="button" class="tab-btn" data-tab="provider" onclick="window.switchTab && window.switchTab('provider')" title="LLM Provider, model & API key">
      <span class="tab-icon">${icons["cube"] || ""}</span>
      <span class="tab-label">Provider</span>
      <span class="tab-indicator" id="providerIndicator"></span>
    </button>
    <button type="button" class="tab-btn" data-tab="directory" onclick="window.switchTab && window.switchTab('directory')" title="Active directory & workspace folder status">
      <span class="tab-icon">${icons["folder-open"] || ""}</span>
      <span class="tab-label">Directory</span>
      <span class="tab-indicator" id="dirIndicator"></span>
    </button>
  </div>

  <!-- TAB 1: PIPELINE -->
  <div class="tab-pane active" id="pane-pipeline">
    <!-- Pipeline Execution Controls -->
    <div class="section">
      <div style="display:flex; gap:4px; margin-bottom:8px;">
        <button id="startPipelineBtn" style="width:100%;">${icons["play"] || ""} Run Active Pipeline</button>
        <button id="stopBtn" class="btn-stop" style="display:none; width:100%;">${icons["stop"] || ""} Stop Pipeline</button>
      </div>

      <div class="section-header">
        <div style="display:flex; align-items:center; gap:6px;">
          <h3>${icons["rocket-lunch"] || ""} Analysis Tasks</h3>
          <button type="button" id="refreshTasksBtn" class="btn-icon" title="Reload tasks and sync progress from disk">${icons["refresh"] || "\u21BB"}</button>
        </div>
        <span style="font-size:9px; color:var(--muted);" id="phaseCountLabel">0 Tasks</span>
      </div>
      <div class="section-desc">Select tasks to execute. Click task name to edit in VS Code.</div>

      <!-- Dynamic Phase Checklist -->
      <div id="phaseContainer">
        <div style="text-align:center; padding:10px; color:var(--muted);">Loading phases...</div>
      </div>
    </div>

    <!-- Tokens -->
    <div class="section">
      <div class="section-header">
        <h3>${icons["coins"] || ""} Tokens</h3>
      </div>
      <table class="tokens-table">
        <thead>
          <tr>
            <th>Prompt</th>
            <th>Cached ${icons["sparkles"] || ""}</th>
            <th>Response</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td id="promptTokens">0</td>
            <td id="cachedTokens" style="color:var(--success);">0</td>
            <td id="responseTokens">0</td>
            <td id="totalTokens">0</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Live Sub-Loop Terminal Feed -->
    <div class="section terminal-section">
      <div class="section-header">
        <h3>${icons["terminal"] || ""} Sub-Loop Live Feed</h3>
        <div style="display:flex; gap:4px;">
          <button class="btn-sm" id="viewChatLogBtn" title="Open logs/llm_chat.md in VS Code">${icons["list"] || ""} Chat Log</button>
          <button class="btn-sm" id="clearLogBtn">Clear</button>
        </div>
      </div>
      <div class="terminal" id="terminalLog">TidyProteomicsAgent ready. Phases discovered from analysis/*.md.</div>
    </div>
  </div>

  <!-- TAB 2: MEMORY & PROTOCOL -->
  <div class="tab-pane" id="pane-blackboard">
    <!-- Persistent Global Context -->
    <div class="section">
      <div class="section-header">
        <h3>${icons["globe"] || ""} Global Context</h3>
        <span class="badge badge-cached">Cached Prefix</span>
      </div>
      <div class="section-desc">System instructions read at the start of every phase and cached in LLM memory.</div>
      <div id="globalFrameContainer">
        <div style="text-align:center; padding:6px; color:var(--muted); font-size:10px;">Loading global files...</div>
      </div>
    </div>

    <!-- Shared Memory -->
    <div class="section">
      <div class="section-header">
        <h3>${icons["ftp"] || ""} Shared Memory</h3>
        <span class="badge badge-completed">Disk State</span>
      </div>
      <div class="section-desc">Cross-phase state on disk. Sub-loops update this scratchpad after each run.</div>
      <div id="blackboardContainer">
        <div style="text-align:center; padding:6px; color:var(--muted); font-size:10px;">Loading memory files...</div>
      </div>
    </div>

    <!-- Logs -->
    <div class="section">
      <div class="section-header">
        <h3>${icons["list-check"] || ""} Logs</h3>
      </div>
      <div class="section-desc">Lean audit trail capturing assistant thoughts, tool executions, and tokens.</div>
      <div id="logsContainer">
        <div style="text-align:center; padding:6px; color:var(--muted); font-size:10px;">Loading logs...</div>
      </div>
    </div>

    <!-- Architecture Callout -->
    <div class="callout">
      <b>${icons["info"] || ""} TidyProteomicsAgent Architecture:</b><br>
      \u2022 <b>Global Context</b> (<code>agent/</code>) is cached across phases to slash token costs.<br>
      \u2022 <b>Ephemeral Sub-Loops</b> run in isolation for each phase, preventing context bloat.<br>
      \u2022 <b>Shared Memory</b> (<code>docs/notes.md</code>) passes findings between phases.
    </div>
  </div>

  <!-- TAB 3: LLM PROVIDER -->
  <div class="tab-pane" id="pane-provider">
    <div class="section">
      <div class="section-header">
        <h3>${icons["cube"] || ""} Provider Configuration</h3>
        <button class="btn-sm" id="saveConfigBtn">Save Settings</button>
      </div>

      <div class="form-group">
        <label>Provider</label>
        <select id="providerSelect">
          <option value="anthropic" ${config.provider === "anthropic" ? "selected" : ""}>Anthropic (Prompt Caching)</option>
          <option value="openrouter" ${config.provider === "openrouter" ? "selected" : ""}>OpenRouter (Unified Gateway)</option>
          <option value="ollama" ${config.provider === "ollama" ? "selected" : ""}>Remote Hosted Ollama</option>
          <option value="gemini" ${config.provider === "gemini" ? "selected" : ""}>Google Gemini</option>
          <option value="openai" ${config.provider === "openai" ? "selected" : ""}>OpenAI</option>
        </select>
      </div>

      <div class="form-group" id="baseUrlGroup">
        <label id="baseUrlLabel">Base URL / Endpoint</label>
        <input type="text" id="baseUrlInput" value="${this.escapeAttr(config.baseUrl || "")}" placeholder="http://remote-host:11434/v1" />
        <span id="baseUrlHint" style="font-size:9px; color:var(--muted); display:block; margin-top:2px;"></span>
      </div>

      <div class="form-group">
        <label id="modelLabel">Model ID</label>
        <input type="text" id="modelInput" value="${this.escapeAttr(config.model || "")}" placeholder="claude-3-7-sonnet-20250219" />
      </div>

      <div class="form-group">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <label id="apiKeyLabel">API Key</label>
          <span id="toggleKeyVisibility" style="font-size:9px; color:var(--primary); cursor:pointer;">Show</span>
        </div>
        <input type="password" id="apiKeyInput" value="${this.escapeAttr(config.apiKey || "")}" placeholder="sk-..." />
      </div>

      <div class="form-group">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <label id="maxTokensLabel">Max Output Tokens</label>
          <span style="font-size:9px; color:var(--muted);">Default: 32,768</span>
        </div>
        <select id="maxTokensSelect">
          <option value="4096" ${config.maxTokens === 4096 ? "selected" : ""}>4,096 (Standard / Minimal)</option>
          <option value="8192" ${config.maxTokens === 8192 ? "selected" : ""}>8,192</option>
          <option value="16384" ${config.maxTokens === 16384 ? "selected" : ""}>16,384 (Recommended for Reports)</option>
          <option value="32768" ${config.maxTokens === 32768 || !config.maxTokens ? "selected" : ""}>32,768 (Full Manuscripts / Long Synthesis)</option>
          <option value="65536" ${config.maxTokens === 65536 ? "selected" : ""}>65,536</option>
          <option value="128000" ${config.maxTokens === 128e3 ? "selected" : ""}>128,000 (OpenRouter Frontier / Luna Max)</option>
        </select>
        <span style="font-size:9px; color:var(--muted); display:block; margin-top:2px;">Prevents tool call JSON truncation during long file generation (e.g. docs/scientific_report.md).</span>
      </div>

      <div class="form-group">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <label id="timeoutSecondsLabel">Request Timeout</label>
          <span style="font-size:9px; color:var(--muted);">Default: 600s (10m)</span>
        </div>
        <select id="timeoutSecondsSelect">
          <option value="180" ${config.timeoutSeconds === 180 ? "selected" : ""}>180s (3m - Fast Cloud Models)</option>
          <option value="300" ${config.timeoutSeconds === 300 ? "selected" : ""}>300s (5m - Standard)</option>
          <option value="600" ${config.timeoutSeconds === 600 || !config.timeoutSeconds ? "selected" : ""}>600s (10m - Recommended for Large / Local Models)</option>
          <option value="900" ${config.timeoutSeconds === 900 ? "selected" : ""}>900s (15m - Extended Reasoning / Heavy Synthesis)</option>
          <option value="1200" ${config.timeoutSeconds === 1200 ? "selected" : ""}>1,200s (20m - Ultra Long / Slow Local Inference)</option>
        </select>
        <span style="font-size:9px; color:var(--muted); display:block; margin-top:2px;">Prevents timeout abortions during complex phases or slow local inference (e.g. 70B models).</span>
      </div>

      <div style="margin-top:10px; display:flex; justify-content:space-between; align-items:center;">
        <span id="saveStatus" style="font-size:10px; color:var(--success); display:none;">\u2713 Settings saved!</span>
      </div>
    </div>

    <!-- Active Provider Summary Card -->
    <div class="section">
      <div class="section-header">
        <h3>${icons["stats"] || ""} Active Model Summary</h3>
        <button class="icon-btn" data-action="openFile" data-path="docs/llm.md" title="Open docs/llm.md" style="font-size:10px; padding:2px 6px;">docs/llm.md \u2197</button>
      </div>
      <div style="display:flex; flex-direction:column; gap:4px; font-size:11px;">
        <div style="display:flex; justify-content:space-between;">
          <span style="color:var(--muted);">Provider:</span>
          <b id="summaryProvider">${(config.provider || "anthropic").toUpperCase()}</b>
        </div>
        <div style="display:flex; justify-content:space-between;">
          <span style="color:var(--muted);">Model:</span>
          <b id="summaryModel" style="font-family:monospace;">${config.model}</b>
        </div>
        <div style="display:flex; justify-content:space-between;">
          <span style="color:var(--muted);">Prompt Caching:</span>
          <span id="summaryCaching" class="badge badge-cached">Active ${icons["sparkles"] || ""}</span>
        </div>
        <div style="display:flex; justify-content:space-between;">
          <span style="color:var(--muted);">Max Output Tokens:</span>
          <b id="summaryMaxTokens" style="font-family:monospace;">${(config.maxTokens || 32768).toLocaleString()}</b>
        </div>
        <div style="display:flex; justify-content:space-between;">
          <span style="color:var(--muted);">Request Timeout:</span>
          <b id="summaryTimeout" style="font-family:monospace;">${config.timeoutSeconds || 600}s</b>
        </div>
        <div style="display:flex; justify-content:space-between;">
          <span style="color:var(--muted);">Key Status:</span>
          <span id="summaryKeyStatus" class="badge ${config.apiKey ? "badge-completed" : "badge-failed"}">${config.apiKey ? "Configured" : "Missing"}</span>
        </div>
      </div>
    </div>
  </div>

  <!-- TAB 4: ACTIVE DIRECTORY -->
  <div class="tab-pane" id="pane-directory">
    <!-- Active Workspace Card -->
    <div class="section">
      <div class="section-header">
        <h3>${icons["folder-open"] || ""} Active VS Code Workspace</h3>
      </div>
      <div class="section-desc">TidyProteomicsAgent automatically operates within the folder currently opened in VS Code.</div>

      <div style="background:var(--bg); border:1px solid var(--border); border-radius:4px; padding:8px; margin-bottom:8px;">
        <div id="dirWsName" style="font-weight:600; font-size:12px; color:#93c5fd; margin-bottom:2px;">Checking workspace...</div>
        <div id="dirWsPath" style="font-size:9px; color:var(--muted); font-family:monospace; word-break:break-all;"></div>
      </div>

      <div style="display:flex; gap:6px;">
        <button type="button" class="btn-secondary btn-sm" id="copyPathBtn" style="flex:1;">${icons["list"] || ""} Copy Path</button>
        <button type="button" class="btn-secondary btn-sm" id="revealOSBtn" style="flex:1;">${icons["folder-open"] || ""} Reveal in OS</button>
        <button type="button" class="btn-secondary btn-sm" id="chooseDirBtn" style="flex:1;">${icons["folder-open"] || ""} Choose Folder...</button>
      </div>
    </div>

    <!-- Project Structure Health Check -->
    <div class="section">
      <div class="section-header">
        <h3>${icons["database"] || ""} Project Structure Health</h3>
      </div>
      <div class="section-desc">Standard directories required for autonomous pipelines:</div>

      <div id="foldersListContainer">
        <div style="text-align:center; padding:6px; color:var(--muted); font-size:10px;">Scanning folders...</div>
      </div>

      <div style="display:flex; gap:6px; margin-top:8px;">
        <button type="button" class="btn-secondary btn-sm" id="rescanDirBtn" style="flex:1;">${icons["refresh"] || ""} Rescan</button>
        <button type="button" class="btn-sm" id="createFoldersBtn" style="flex:1;">${icons["folder-open"] || ""} Create Folders</button>
      </div>
      <div style="margin-top:6px;">
        <button type="button" class="btn-primary btn-sm" id="initPipelineQuickBtn" style="width:100%; padding:6px; font-weight:600;">${icons["sparkles"] || ""} Initialize Pipeline Scaffolding...</button>
      </div>
    </div>

    <!-- Guidance Note on Changing Workspace -->
    <div class="callout" style="line-height:1.5;">
      <b>${icons["info"] || ""} How to Change Analysis Folders:</b><br>
      \u2022 <b>Option 1 (Recommended in-window):</b> Click <b>${icons["folder-open"] || ""} Choose Folder...</b> above. This switches the active project instantly without restarting the window.<br>
      \u2022 <b>Option 2:</b> In VS Code, use <b>File &gt; Add Folder to Workspace...</b> to mount your dataset folder into the Explorer.<br>
      <div style="margin-top:6px; padding:6px; background:rgba(239, 68, 68, 0.1); border-left:3px solid var(--error); border-radius:3px; font-size:10px; color:#fca5a5;">
        <b>${icons["alert"] || ""} Debug Window Note:</b> When debugging this extension (F5), do <b>not</b> use <i>File &gt; Open Folder...</i> because VS Code restarts the window and terminates the debug session. Use <b>Choose Folder...</b> or <b>Add Folder to Workspace...</b> instead.
      </div>
    </div>
  </div>

  <script>
    // Global Error Logger for diagnostics
    window.addEventListener("error", function (e) {
      console.error("[TidyProteomicsAgent Webview Error]", e.error || e.message);
      try {
        if (window.vscode) window.vscode.postMessage({ type: "log", text: "[Webview Error] " + (e.error?.message || e.message) });
      } catch (_) {}
    });

    const vscode = acquireVsCodeApi();
    window.vscode = vscode;
    const ICONS = ${JSON.stringify(icons)};

    // Tab Switching Logic (Defined first so it is available globally immediately)
    function switchTab(tabId) {
      if (!tabId) return;
      try {
        const tabs = document.querySelectorAll(".tab-btn");
        const panes = document.querySelectorAll(".tab-pane");

        tabs.forEach(function (t) {
          if (t.getAttribute("data-tab") === tabId) {
            t.classList.add("active");
          } else {
            t.classList.remove("active");
          }
        });

        panes.forEach(function (p) {
          if (p.id === "pane-" + tabId) {
            p.classList.add("active");
            p.style.display = "block";
          } else {
            p.classList.remove("active");
            p.style.display = "none";
          }
        });

        try {
          const current = vscode.getState() || {};
          vscode.setState(Object.assign({}, current, { activeTab: tabId }));
        } catch (_) {}
      } catch (err) {
        console.error("[TidyProteomicsAgent] Error in switchTab:", err);
      }
    }
    window.switchTab = switchTab;

    // Restore saved tab or default to 'pipeline'
    try {
      const savedState = vscode.getState();
      const initialTab = (savedState && savedState.activeTab) ? savedState.activeTab : "pipeline";
      switchTab(initialTab);
    } catch (_) {
      switchTab("pipeline");
    }

    // Elements
    const pipelineHeaderBadge = document.getElementById("pipelineHeaderBadge");
    const wsChip = document.getElementById("wsChip");
    const wsChipName = document.getElementById("wsChipName");

    const pipelineIndicator = document.getElementById("pipelineIndicator");
    const providerIndicator = document.getElementById("providerIndicator");
    const dirIndicator = document.getElementById("dirIndicator");

    const startPipelineBtn = document.getElementById("startPipelineBtn");
    const stopBtn = document.getElementById("stopBtn");
    const phaseContainer = document.getElementById("phaseContainer");
    const phaseCountLabel = document.getElementById("phaseCountLabel");
    const refreshTasksBtn = document.getElementById("refreshTasksBtn");

    const promptTokensEl = document.getElementById("promptTokens");
    const cachedTokensEl = document.getElementById("cachedTokens");
    const responseTokensEl = document.getElementById("responseTokens");
    const totalTokensEl = document.getElementById("totalTokens");

    const terminalLog = document.getElementById("terminalLog");
    const clearLogBtn = document.getElementById("clearLogBtn");
    const viewChatLogBtn = document.getElementById("viewChatLogBtn");

    const globalFrameContainer = document.getElementById("globalFrameContainer");
    const blackboardContainer = document.getElementById("blackboardContainer");
    const logsContainer = document.getElementById("logsContainer");

    const providerSelect = document.getElementById("providerSelect");
    const modelInput = document.getElementById("modelInput");
    const apiKeyInput = document.getElementById("apiKeyInput");
    const apiKeyLabel = document.getElementById("apiKeyLabel");
    const toggleKeyVisibility = document.getElementById("toggleKeyVisibility");
    const maxTokensSelect = document.getElementById("maxTokensSelect");
    const timeoutSecondsSelect = document.getElementById("timeoutSecondsSelect");
    const baseUrlGroup = document.getElementById("baseUrlGroup");
    const baseUrlInput = document.getElementById("baseUrlInput");
    const baseUrlLabel = document.getElementById("baseUrlLabel");
    const baseUrlHint = document.getElementById("baseUrlHint");
    const saveConfigBtn = document.getElementById("saveConfigBtn");
    const saveStatus = document.getElementById("saveStatus");

    const summaryProvider = document.getElementById("summaryProvider");
    const summaryModel = document.getElementById("summaryModel");
    const summaryCaching = document.getElementById("summaryCaching");
    const summaryMaxTokens = document.getElementById("summaryMaxTokens");
    const summaryTimeout = document.getElementById("summaryTimeout");
    const summaryKeyStatus = document.getElementById("summaryKeyStatus");

    const dirWsName = document.getElementById("dirWsName");
    const dirWsPath = document.getElementById("dirWsPath");
    const copyPathBtn = document.getElementById("copyPathBtn");
    const revealOSBtn = document.getElementById("revealOSBtn");
    const chooseDirBtn = document.getElementById("chooseDirBtn");
    const foldersListContainer = document.getElementById("foldersListContainer");
    const rescanDirBtn = document.getElementById("rescanDirBtn");
    const createFoldersBtn = document.getElementById("createFoldersBtn");

    // Unified Click Handler via event delegation
    document.addEventListener("click", function (e) {
      if (!e.target) return;

      // Tab Buttons
      const tabBtn = e.target.closest ? e.target.closest(".tab-btn") : null;
      if (tabBtn) {
        const tab = tabBtn.getAttribute("data-tab");
        if (tab) switchTab(tab);
        return;
      }

      // Workspace Chip
      if (e.target.closest && e.target.closest("#wsChip")) {
        switchTab("directory");
        return;
      }

      // Initialize Workspace Button
      const initBtn = e.target.closest ? e.target.closest("#initWorkspaceBtn, [data-action='initWorkspace']") : null;
      if (initBtn) {
        const select = document.getElementById("pipelineTemplateSelect");
        const pipelineId = select ? select.value : "differential_expression";
        initBtn.setAttribute("disabled", "true");
        initBtn.innerHTML = '<span class="spin">' + (ICONS["refresh"] || "") + '</span> Initializing...';
        vscode.postMessage({ type: "initWorkspace", pipelineId: pipelineId });
        return;
      }

      // Dynamic data-actions (runPhase, openPhase, openFile)
      const target = e.target.closest ? e.target.closest("[data-action]") : null;
      if (target) {
        const action = target.getAttribute("data-action");
        if (action === "runPhase") {
          const phaseId = target.getAttribute("data-id");
          if (phaseId) vscode.postMessage({ type: "runPhase", phaseId: phaseId });
        } else if (action === "openPhase") {
          const fileName = target.getAttribute("data-file");
          if (fileName) vscode.postMessage({ type: "openPhase", fileName: fileName });
        } else if (action === "openFile") {
          const relPath = target.getAttribute("data-path");
          if (relPath) vscode.postMessage({ type: "openFile", relPath: relPath });
        }
        return;
      }
    });

    // Checkbox Toggle for Phases and Pipeline Template Change
    document.addEventListener("change", function (e) {
      if (e.target && e.target.matches && e.target.matches("input[type='checkbox'][data-phase-id]")) {
        const phaseId = e.target.getAttribute("data-phase-id");
        vscode.postMessage({ type: "togglePhase", phaseId: phaseId, enabled: e.target.checked });
      } else if (e.target && e.target.id === "pipelineTemplateSelect") {
        const descEl = document.getElementById("pipelineDescription");
        const selectEl = e.target;
        if (descEl) {
          if (selectEl.value === "quality_control_only") {
            descEl.innerHTML = "<b>Phases:</b> 00_INSTALL \u2794 01_INSPECT.<br><i>Includes: Workspace readiness, data import, replicate CV analysis, quantifiable fraction evaluation, and PCA separation.</i>";
          } else {
            descEl.innerHTML = "<b>Phases:</b> 00_INSTALL \u2794 01_INSPECT \u2794 02_NORMALIZE \u2794 03_IMPUTE \u2794 04_EXPRESSION \u2794 05_ENRICHMENT \u2794 06_OBSERVATIONS \u2794 07_SYNTHESIS.<br><i>Includes: Environment readiness, QC inspection, normalization benchmarking, imputation, differential expression, pathway enrichment, literature observations, and synthesis report.</i>";
          }
        }
      }
    });

    // Key Visibility Toggle
    if (toggleKeyVisibility && apiKeyInput) {
      toggleKeyVisibility.addEventListener("click", () => {
        if (apiKeyInput.type === "password") {
          apiKeyInput.type = "text";
          toggleKeyVisibility.textContent = "Hide";
        } else {
          apiKeyInput.type = "password";
          toggleKeyVisibility.textContent = "Show";
        }
      });
    }

    // Provider UI updates
    function updateProviderUI(isUserChange) {
      if (!providerSelect) return;
      const prov = providerSelect.value;
      if (baseUrlGroup) {
        if (prov === "ollama") {
          baseUrlGroup.style.display = "block";
          if (baseUrlLabel) baseUrlLabel.textContent = "Remote Ollama Base URL";
          if (baseUrlInput) baseUrlInput.placeholder = "http://192.168.1.100:11434/v1";
          if (baseUrlHint) baseUrlHint.textContent = "Points to remote Ollama host. Suffix /v1 auto-added if omitted.";
          if (apiKeyLabel) apiKeyLabel.textContent = "API Key (Optional / Auth Proxy)";
          if (apiKeyInput) apiKeyInput.placeholder = "Leave blank if unauthenticated";
          if (modelInput) modelInput.placeholder = "llama3.3:70b";
          if (isUserChange && modelInput && (!modelInput.value || modelInput.value.startsWith("claude") || modelInput.value.startsWith("gpt") || modelInput.value.startsWith("gemini"))) {
            modelInput.value = "llama3.3:70b";
          }
        } else if (prov === "openrouter") {
          baseUrlGroup.style.display = "block";
          if (baseUrlLabel) baseUrlLabel.textContent = "OpenRouter Endpoint URL";
          if (baseUrlInput) baseUrlInput.placeholder = "https://openrouter.ai/api/v1 (default)";
          if (baseUrlHint) baseUrlHint.textContent = "Unified frontier gateway with prompt caching support.";
          if (apiKeyLabel) apiKeyLabel.textContent = "OpenRouter API Key";
          if (apiKeyInput) apiKeyInput.placeholder = "sk-or-v1-...";
          if (modelInput) modelInput.placeholder = "anthropic/claude-3.7-sonnet";
          if (isUserChange && modelInput && (!modelInput.value || modelInput.value === "llama3.3:70b" || modelInput.value === "gpt-4o")) {
            modelInput.value = "anthropic/claude-3.7-sonnet";
          }
        } else if (prov === "anthropic") {
          baseUrlGroup.style.display = "none";
          if (apiKeyLabel) apiKeyLabel.textContent = "Anthropic API Key";
          if (apiKeyInput) apiKeyInput.placeholder = "sk-ant-...";
          if (modelInput) modelInput.placeholder = "claude-3-7-sonnet-20250219";
          if (isUserChange && modelInput && (!modelInput.value || modelInput.value.includes("/") || modelInput.value.startsWith("llama"))) {
            modelInput.value = "claude-3-7-sonnet-20250219";
          }
        } else if (prov === "gemini") {
          baseUrlGroup.style.display = "none";
          if (apiKeyLabel) apiKeyLabel.textContent = "Google AI Studio API Key";
          if (apiKeyInput) apiKeyInput.placeholder = "AIzaSy...";
          if (modelInput) modelInput.placeholder = "gemini-2.5-pro";
          if (isUserChange && modelInput && (!modelInput.value || modelInput.value.startsWith("claude") || modelInput.value.startsWith("gpt") || modelInput.value.startsWith("llama"))) {
            modelInput.value = "gemini-2.5-pro";
          }
        } else if (prov === "openai") {
          baseUrlGroup.style.display = "block";
          if (baseUrlLabel) baseUrlLabel.textContent = "OpenAI Base URL (Optional)";
          if (baseUrlInput) baseUrlInput.placeholder = "https://api.openai.com/v1 (default)";
          if (baseUrlHint) baseUrlHint.textContent = "Leave blank for official OpenAI or enter custom proxy.";
          if (apiKeyLabel) apiKeyLabel.textContent = "OpenAI API Key";
          if (apiKeyInput) apiKeyInput.placeholder = "sk-...";
          if (modelInput) modelInput.placeholder = "gpt-4o";
          if (isUserChange && modelInput && (!modelInput.value || modelInput.value.startsWith("claude") || modelInput.value.startsWith("gemini") || modelInput.value.startsWith("llama"))) {
            modelInput.value = "gpt-4o";
          }
        }
      }

      // Update provider summary card
      if (summaryProvider) summaryProvider.textContent = (prov || "ANTHROPIC").toUpperCase();
      if (summaryModel && modelInput) summaryModel.textContent = modelInput.value;
      if (summaryCaching) {
        if (prov === "anthropic" || prov === "openrouter") {
          summaryCaching.innerHTML = "Active " + (ICONS["sparkles"] || "");
          summaryCaching.className = "badge badge-cached";
        } else {
          summaryCaching.textContent = "Standard";
          summaryCaching.className = "badge badge-pending";
        }
      }
    }

    function sendConfigSave(silent) {
      vscode.postMessage({
        type: "saveConfig",
        provider: providerSelect ? providerSelect.value : "anthropic",
        model: modelInput ? modelInput.value.trim() : "",
        apiKey: apiKeyInput ? apiKeyInput.value.trim() : "",
        baseUrl: baseUrlInput ? baseUrlInput.value.trim() : "",
        maxTokens: maxTokensSelect ? parseInt(maxTokensSelect.value, 10) : 32768,
        timeoutSeconds: timeoutSecondsSelect ? parseInt(timeoutSecondsSelect.value, 10) : 600,
        silent: !!silent
      });
      if (!silent && saveStatus) {
        saveStatus.style.display = "inline";
        setTimeout(() => { saveStatus.style.display = "none"; }, 3000);
      }
    }

    if (providerSelect) {
      providerSelect.addEventListener("change", function () {
        updateProviderUI(true);
        sendConfigSave(true);
      });
    }

    if (modelInput) {
      modelInput.addEventListener("input", function () {
        if (summaryModel) summaryModel.textContent = modelInput.value;
      });
      modelInput.addEventListener("change", function () {
        sendConfigSave(true);
      });
      modelInput.addEventListener("blur", function () {
        sendConfigSave(true);
      });
    }

    if (apiKeyInput) {
      apiKeyInput.addEventListener("input", function () {
        const hasKey = !!apiKeyInput.value.trim();
        if (summaryKeyStatus) {
          summaryKeyStatus.textContent = hasKey ? "Configured" : "Missing";
          summaryKeyStatus.className = "badge " + (hasKey ? "badge-completed" : "badge-failed");
        }
        if (providerIndicator && providerSelect) {
          providerIndicator.className = (providerSelect.value !== "ollama" && !hasKey) ? "tab-indicator alert" : "tab-indicator";
        }
      });
      apiKeyInput.addEventListener("change", function () {
        sendConfigSave(true);
      });
      apiKeyInput.addEventListener("blur", function () {
        sendConfigSave(true);
      });
    }

    if (baseUrlInput) {
      baseUrlInput.addEventListener("change", function () {
        sendConfigSave(true);
      });
      baseUrlInput.addEventListener("blur", function () {
        sendConfigSave(true);
      });
    }

    if (maxTokensSelect) {
      maxTokensSelect.addEventListener("change", function () {
        if (summaryMaxTokens) summaryMaxTokens.textContent = Number(maxTokensSelect.value).toLocaleString();
        sendConfigSave(true);
      });
    }

    if (timeoutSecondsSelect) {
      timeoutSecondsSelect.addEventListener("change", function () {
        if (summaryTimeout) summaryTimeout.textContent = timeoutSecondsSelect.value + "s";
        sendConfigSave(true);
      });
    }

    // Initial load: do NOT overwrite modelInput.value!
    updateProviderUI(false);

    // Button Actions
    if (saveConfigBtn) {
      saveConfigBtn.addEventListener("click", function () {
        sendConfigSave(false);
      });
    }

    if (startPipelineBtn) startPipelineBtn.addEventListener("click", () => vscode.postMessage({ type: "startPipeline" }));
    if (stopBtn) stopBtn.addEventListener("click", () => vscode.postMessage({ type: "stopPipeline" }));
    if (refreshTasksBtn) {
      refreshTasksBtn.addEventListener("click", function () {
        refreshTasksBtn.style.transform = "rotate(360deg)";
        refreshTasksBtn.style.transition = "transform 0.4s ease";
        setTimeout(function () {
          refreshTasksBtn.style.transform = "none";
          refreshTasksBtn.style.transition = "none";
        }, 400);
        vscode.postMessage({ type: "forceReload" });
      });
    }
    if (clearLogBtn) clearLogBtn.addEventListener("click", () => { if (terminalLog) terminalLog.textContent = ""; });
    if (viewChatLogBtn) viewChatLogBtn.addEventListener("click", () => vscode.postMessage({ type: "openFile", relPath: "logs/llm_chat.md" }));

    if (copyPathBtn) copyPathBtn.addEventListener("click", () => vscode.postMessage({ type: "copyPath" }));
    if (revealOSBtn) revealOSBtn.addEventListener("click", () => vscode.postMessage({ type: "revealInOS" }));
    if (chooseDirBtn) chooseDirBtn.addEventListener("click", () => vscode.postMessage({ type: "selectDirectory" }));
    if (rescanDirBtn) rescanDirBtn.addEventListener("click", () => vscode.postMessage({ type: "rescanWorkspace" }));
    if (createFoldersBtn) createFoldersBtn.addEventListener("click", () => vscode.postMessage({ type: "createMissingFolders" }));
    const initPipelineQuickBtn = document.getElementById("initPipelineQuickBtn");
    if (initPipelineQuickBtn) initPipelineQuickBtn.addEventListener("click", () => vscode.postMessage({ type: "promptInitWorkspace" }));

    function escapeHtml(str) {
      if (!str) return "";
      return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
    }

    let tickerInterval = null;
    function syncRunTicker(anyRunning) {
      if (anyRunning) {
        if (!tickerInterval) {
          tickerInterval = setInterval(function () {
            const runningCards = document.querySelectorAll(".task-card.running");
            if (!runningCards || runningCards.length === 0) {
              clearInterval(tickerInterval);
              tickerInterval = null;
              return;
            }
            runningCards.forEach(function (card) {
              const startStr = card.getAttribute("data-start-time");
              const durEl = card.querySelector(".task-duration");
              if (durEl && startStr) {
                const startMs = new Date(startStr).getTime();
                if (!isNaN(startMs)) {
                  const sec = Math.max(0, Math.round((Date.now() - startMs) / 1000));
                  durEl.textContent = sec + "s";
                }
              }
            });
          }, 1000);
        }
      } else {
        if (tickerInterval) {
          clearInterval(tickerInterval);
          tickerInterval = null;
        }
      }
    }

    // Render Webview State
    function renderState(state) {
      if (!state) return;

      try {
        const wsName = state.workspaceName || "Project";
        const wsPath = state.workingDirectory || "";

        // Update header & directory tab
        if (wsChipName) wsChipName.textContent = wsName;
        if (dirWsName) {
          if (wsPath) {
            dirWsName.innerHTML = (ICONS["folder-open"] || "") + " " + escapeHtml(wsName);
          } else {
            dirWsName.textContent = "No Workspace Open";
          }
        }
        if (dirWsPath) {
          dirWsPath.textContent = wsPath || "Please open a project directory via File > Open Folder... or click 'Choose Folder...' below";
          dirWsPath.title = wsPath;
        }

        if (dirIndicator) {
          dirIndicator.className = wsPath ? "tab-indicator" : "tab-indicator alert";
        }

        // Provider API Key alert
        if (providerIndicator) {
          const prov = state.provider || (providerSelect ? providerSelect.value : "anthropic");
          const hasKey = apiKeyInput ? !!apiKeyInput.value.trim() : false;
          providerIndicator.className = (prov !== "ollama" && !hasKey) ? "tab-indicator alert" : "tab-indicator";
        }

        // Tokens
        if (state.totalTokens) {
          const prompt = state.totalTokens.promptTokens || 0;
          const cached = state.totalTokens.cachedPromptTokens || 0;
          const response = state.totalTokens.completionTokens || 0;
          const total = state.totalTokens.totalTokens || (prompt + response);

          if (promptTokensEl) promptTokensEl.textContent = prompt.toLocaleString();
          if (cachedTokensEl) cachedTokensEl.textContent = cached.toLocaleString();
          if (responseTokensEl) responseTokensEl.textContent = response.toLocaleString();
          if (totalTokensEl) totalTokensEl.textContent = total.toLocaleString();
        }

        // Pipeline Running State
        const anyRunning = !!state.isRunning || (state.phases && state.phases.some(function(p) { return p && p.status === "running"; }));
        let runningIndex = (typeof state.currentPhaseIndex === "number" && state.currentPhaseIndex >= 0) ? state.currentPhaseIndex : -1;
        if (runningIndex === -1 && state.phases) {
          for (let i = 0; i < state.phases.length; i++) {
            const p = state.phases[i];
            if (p && p.status === "running") {
              runningIndex = i;
              break;
            }
          }
        }

        if (pipelineHeaderBadge) {
          if (anyRunning) {
            pipelineHeaderBadge.innerHTML = "RUNNING " + (ICONS["sparkles"] || "");
            pipelineHeaderBadge.className = "badge badge-running";
          } else {
            pipelineHeaderBadge.textContent = "IDLE";
            pipelineHeaderBadge.className = "badge badge-completed";
          }
        }

        if (pipelineIndicator) {
          pipelineIndicator.className = anyRunning ? "tab-indicator running" : "tab-indicator";
        }

        if (startPipelineBtn) startPipelineBtn.style.display = anyRunning ? "none" : "block";
        if (stopBtn) stopBtn.style.display = anyRunning ? "block" : "none";

        // Render Dynamic Analysis Tasks (Tab 1)
        if (phaseContainer) {
          let phaseHtml = "";
          const phaseCount = state.phases ? state.phases.length : 0;
          if (phaseCountLabel) phaseCountLabel.textContent = phaseCount + " Task" + (phaseCount === 1 ? "" : "s");

          if (!wsPath) {
            phaseHtml = '<div style="text-align:center; padding:15px; color:var(--muted);">No folder opened in VS Code.<br><br>Use <b>File &gt; Open Folder...</b> or the <b>Directory</b> tab to choose a folder.</div>';
          } else if (phaseCount === 0) {
            phaseHtml = '<div style="background:var(--vscode-sideBar-background); border:1px solid var(--vscode-widget-border, #333); border-radius:6px; padding:12px; margin:4px 0;">' +
              '<div style="display:flex; align-items:center; gap:6px; margin-bottom:6px;">' +
                '<span style="font-size:15px; display:inline-flex; align-items:center;">' + (ICONS["rocket-lunch"] || "") + '</span>' +
                '<div style="font-weight:600; font-size:12px; color:var(--vscode-foreground);">Initialize Analysis Pipeline</div>' +
              '</div>' +
              '<div style="font-size:11px; color:var(--muted); line-height:1.4; margin-bottom:10px;">' +
                'No analysis tasks found in this directory. Choose a pipeline to initialize your workspace with subdirectories, R setup scripts, and templates:' +
              '</div>' +
              '<div style="margin-bottom:8px;">' +
                '<label style="font-size:10px; font-weight:600; text-transform:uppercase; letter-spacing:0.5px; color:var(--muted); display:block; margin-bottom:4px;">Pipeline Template</label>' +
                '<select id="pipelineTemplateSelect" style="width:100%; box-sizing:border-box; padding:5px 8px; font-size:11px; background:var(--vscode-input-background, #252526); color:var(--vscode-input-foreground, #cccccc); border:1px solid var(--vscode-input-border, #3c3c3c); border-radius:4px; outline:none;">' +
                  '<option value="differential_expression">Differential Expression (8-Phase Pipeline)</option>' +
                  '<option value="quality_control_only">Quality Control &amp; Exploration (2-Phase QC)</option>' +
                '</select>' +
              '</div>' +
              '<div id="pipelineDescription" style="font-size:10px; color:var(--muted); margin-bottom:12px; background:rgba(255,255,255,0.03); padding:6px 8px; border-radius:4px; border-left:3px solid var(--primary, #007acc); line-height:1.4;">' +
                '<b>Phases:</b> 00_INSTALL \u2794 01_INSPECT \u2794 02_NORMALIZE \u2794 03_IMPUTE \u2794 04_EXPRESSION \u2794 05_ENRICHMENT \u2794 06_OBSERVATIONS \u2794 07_SYNTHESIS.<br>' +
                '<i>Includes environment readiness, QC inspection, normalization benchmarking, imputation, differential expression, pathway enrichment, literature observations, and final synthesis report.</i>' +
              '</div>' +
              '<button type="button" id="initWorkspaceBtn" data-action="initWorkspace" class="btn-primary" style="width:100%; padding:7px 10px; font-size:11px; font-weight:600; display:flex; align-items:center; justify-content:center; gap:6px; cursor:pointer;">' +
                '<span>' + (ICONS["sparkles"] || "") + '</span> Initialize Working Directory' +
              '</button>' +
            '</div>';
          } else {
            for (let i = 0; i < state.phases.length; i++) {
              const p = state.phases[i];
              if (!p) continue;
              const rawStatus = p.status || "pending";
              const checked = p.enabled !== false ? "checked" : "";

              let displayStatus = rawStatus.toUpperCase();
              let badgeClass = "badge badge-" + rawStatus;
              let cardClass = "task-card";
              let durationText = "----";

              if (rawStatus === "running") {
                displayStatus = "RUNNING";
                badgeClass = "badge badge-running";
                cardClass = "task-card running";
                if (p.startTime) {
                  const startMs = new Date(p.startTime).getTime();
                  const elapsedSec = !isNaN(startMs) ? Math.max(0, Math.round((Date.now() - startMs) / 1000)) : 0;
                  durationText = elapsedSec + "s";
                } else {
                  durationText = "0s";
                }
              } else if (rawStatus === "completed") {
                displayStatus = "COMPLETED";
                badgeClass = "badge badge-completed";
                durationText = (p.durationSeconds !== undefined && p.durationSeconds !== null && p.durationSeconds > 0)
                  ? p.durationSeconds + "sec"
                  : "ok";
              } else if (rawStatus === "failed") {
                displayStatus = "FAILED";
                badgeClass = "badge badge-failed";
                durationText = "err";
              } else if (state.isFullPipelineRunning && anyRunning && p.enabled !== false && runningIndex !== -1 && i > runningIndex) {
                displayStatus = "QUEUED";
                badgeClass = "badge badge-queued";
                durationText = "wait";
              } else if (p.durationSeconds !== undefined && p.durationSeconds !== null && p.durationSeconds > 0) {
                durationText = p.durationSeconds + "sec";
              }

              const rawFileName = p.fileName || "";
              let taskName = rawFileName;
              if (taskName.indexOf("/") !== -1) {
                taskName = taskName.substring(taskName.lastIndexOf("/") + 1);
              }
              if (taskName.indexOf(String.fromCharCode(92)) !== -1) {
                taskName = taskName.substring(taskName.lastIndexOf(String.fromCharCode(92)) + 1);
              }
              if (taskName.toLowerCase().endsWith(".md")) {
                taskName = taskName.slice(0, -3);
              }
              if (!taskName) {
                taskName = "TASK " + (i + 1);
              }
              if (p.isMasterSetup && taskName === "INSTRUCT") {
                taskName = "00_INSTALL";
              }

              const safeTaskName = escapeHtml(taskName);
              const safeFileName = escapeHtml(rawFileName);
              const runDisabled = anyRunning ? "disabled" : "";
              const runBtnTitle = anyRunning ? "Pipeline is currently executing" : ("Run " + safeTaskName);
              const startTimeAttr = (rawStatus === "running" && p.startTime) ? (' data-start-time="' + escapeHtml(p.startTime) + '"') : '';

              phaseHtml += '<div class="' + cardClass + '"' + startTimeAttr + '>' +
                '<div class="task-left">' +
                  '<input type="checkbox" ' + checked + ' data-phase-id="' + escapeHtml(p.id) + '" title="Include in pipeline" ' + (anyRunning ? "disabled" : "") + ' />' +
                  '<span class="task-name" data-action="openPhase" data-file="' + safeFileName + '" title="Click to edit ' + safeFileName + ' in VS Code">' + safeTaskName + '</span>' +
                '</div>' +
                '<div class="task-right">' +
                  '<button type="button" class="btn-run" data-action="runPhase" data-id="' + escapeHtml(p.id) + '" ' + runDisabled + ' title="' + escapeHtml(runBtnTitle) + '">' + (ICONS["play"] || "") + ' RUN</button>' +
                  '<span class="' + badgeClass + '">' + escapeHtml(displayStatus) + '</span>' +
                  '<span class="task-duration">' + escapeHtml(durationText) + '</span>' +
                '</div>' +
              '</div>';
            }
          }
          phaseContainer.innerHTML = phaseHtml;
          syncRunTicker(anyRunning);
        }

        // Render Memory & Protocol Files (Tab 2)
        if (state.promptFiles) {
          let globalHtml = "";
          let bbHtml = "";
          let logsHtml = "";

          for (const pf of state.promptFiles) {
            if (!pf) continue;
            const badgeClass = pf.exists ? "badge badge-completed" : "badge badge-pending";
            const badgeText = pf.exists ? "OPEN" : "CREATE";
            const safeName = escapeHtml(pf.name || "");
            const safeRelPath = escapeHtml(pf.relPath || "");

            const card = '<div class="file-card" data-action="openFile" data-path="' + safeRelPath + '" title="Click to open ' + safeRelPath + ' in VS Code">' +
              '<div>' +
                '<div class="file-title">' + safeName + '</div>' +
                '<div class="file-path">' + safeRelPath + '</div>' +
              '</div>' +
              '<span class="' + badgeClass + '">' + badgeText + '</span>' +
            '</div>';

            if (pf.relPath && (pf.relPath.startsWith("agent/") || pf.relPath.startsWith("prompts/"))) {
              globalHtml += card;
            } else if (pf.relPath && pf.relPath.startsWith("docs/")) {
              bbHtml += card;
            } else if (pf.relPath && pf.relPath.startsWith("logs/")) {
              logsHtml += card;
            }
          }

          if (globalFrameContainer) globalFrameContainer.innerHTML = globalHtml || '<div style="color:var(--muted); font-size:10px;">None</div>';
          if (blackboardContainer) blackboardContainer.innerHTML = bbHtml || '<div style="color:var(--muted); font-size:10px;">None</div>';
          if (logsContainer) logsContainer.innerHTML = logsHtml || '<div style="color:var(--muted); font-size:10px;">None</div>';
        }

        // Render Folder Status (Tab 4)
        if (foldersListContainer && state.folders) {
          let fHtml = "";
          for (const f of state.folders) {
            const badgeClass = f.exists ? "badge badge-completed" : "badge badge-pending";
            const badgeText = f.exists ? (f.itemCount !== undefined ? f.itemCount + " FILES" : "FOUND") : "MISSING";
            fHtml += '<div class="folder-card">' +
              '<div>' +
                '<div class="folder-name">' + escapeHtml(f.relPath) + '/</div>' +
                '<div class="folder-desc">' + escapeHtml(f.description) + '</div>' +
              '</div>' +
              '<span class="' + badgeClass + '">' + badgeText + '</span>' +
            '</div>';
          }
          foldersListContainer.innerHTML = fHtml;
        }

      } catch (renderErr) {
        console.error("[TidyProteomicsAgent] Error rendering webview state:", renderErr);
      }
    }

    function appendLog(text) {
      if (terminalLog && text) {
        terminalLog.textContent += "\\n" + String(text);
        terminalLog.scrollTop = terminalLog.scrollHeight;
      }
    }

    // Message receiver
    window.addEventListener("message", function (event) {
      try {
        const message = event.data;
        if (!message) return;
        if (message.type === "stateUpdate") {
          renderState(message.state);
        } else if (message.type === "log") {
          appendLog(message.text);
        }
      } catch (err) {
        console.error("[TidyProteomicsAgent] Error in webview message handler:", err);
      }
    });

    // Request initial state proactively
    vscode.postMessage({ type: "requestState" });
    setTimeout(function () {
      vscode.postMessage({ type: "requestState" });
    }, 200);
  </script>
</body>
</html>`;
  }
};

// src/extension.ts
function activate(context) {
  console.log("TidyProteomicsAgent extension is now active!");
  const outputChannel = vscode2.window.createOutputChannel("TidyProteomicsAgent");
  context.subscriptions.push(outputChannel);
  const uncaughtHandler = (err) => {
    const msg = err?.stack || String(err);
    if (typeof msg === "string" && (msg.includes("Missing dataLength in event") || msg.includes("strict mode functions"))) {
      return;
    }
    outputChannel.appendLine(`[UNCAUGHT EXCEPTION] ${msg}`);
    console.error("[TidyProteomicsAgent UNCAUGHT EXCEPTION]", err);
  };
  const rejectionHandler = (reason) => {
    const msg = reason?.stack || String(reason);
    if (typeof msg === "string" && (msg.includes("Missing dataLength in event") || msg.includes("strict mode functions"))) {
      return;
    }
    outputChannel.appendLine(`[UNHANDLED REJECTION] ${msg}`);
    console.error("[TidyProteomicsAgent UNHANDLED REJECTION]", reason);
  };
  process.on("uncaughtException", uncaughtHandler);
  process.on("unhandledRejection", rejectionHandler);
  context.subscriptions.push({
    dispose: () => {
      process.removeListener("uncaughtException", uncaughtHandler);
      process.removeListener("unhandledRejection", rejectionHandler);
    }
  });
  const sidebarProvider = new SidebarViewProvider(context.extensionUri, context);
  context.subscriptions.push(
    vscode2.window.registerWebviewViewProvider(
      SidebarViewProvider.viewType,
      sidebarProvider
    )
  );
  let watchers = [];
  const updateWatchers = (customFolder) => {
    for (const w of watchers) {
      try {
        w.dispose();
      } catch (_) {
      }
    }
    watchers = [];
    const targetFolders = [];
    if (customFolder) {
      targetFolders.push(vscode2.Uri.file(customFolder));
    } else {
      const folders = vscode2.workspace.workspaceFolders;
      if (folders && folders.length > 0) {
        targetFolders.push(...folders);
      }
    }
    if (targetFolders.length === 0) {
      return;
    }
    for (const folder of targetFolders) {
      try {
        const folderPath = folder.fsPath || folder.uri?.fsPath || "";
        if (!folderPath || !fs7.existsSync(folderPath)) {
          continue;
        }
        const analysisDir = path7.join(folderPath, "analysis");
        if (fs7.existsSync(analysisDir)) {
          const analysisWatcher = vscode2.workspace.createFileSystemWatcher(
            new vscode2.RelativePattern(vscode2.Uri.file(analysisDir), "*.md")
          );
          analysisWatcher.onDidCreate(() => sidebarProvider.refreshPhases().catch(() => {
          }));
          analysisWatcher.onDidChange(() => sidebarProvider.refreshPhases().catch(() => {
          }));
          analysisWatcher.onDidDelete(() => sidebarProvider.forceReload().catch(() => {
          }));
          watchers.push(analysisWatcher);
        }
        const agentDir = path7.join(folderPath, "agent");
        if (fs7.existsSync(agentDir)) {
          const agentWatcher = vscode2.workspace.createFileSystemWatcher(
            new vscode2.RelativePattern(vscode2.Uri.file(agentDir), "*.md")
          );
          agentWatcher.onDidCreate(() => sidebarProvider.refreshPhases().catch(() => {
          }));
          agentWatcher.onDidChange(() => sidebarProvider.refreshPhases().catch(() => {
          }));
          agentWatcher.onDidDelete(() => sidebarProvider.refreshPhases().catch(() => {
          }));
          watchers.push(agentWatcher);
        }
        const promptsDir = path7.join(folderPath, "prompts");
        if (fs7.existsSync(promptsDir)) {
          const promptsWatcher = vscode2.workspace.createFileSystemWatcher(
            new vscode2.RelativePattern(vscode2.Uri.file(promptsDir), "*.md")
          );
          promptsWatcher.onDidCreate(() => sidebarProvider.refreshPhases().catch(() => {
          }));
          promptsWatcher.onDidChange(() => sidebarProvider.refreshPhases().catch(() => {
          }));
          promptsWatcher.onDidDelete(() => sidebarProvider.refreshPhases().catch(() => {
          }));
          watchers.push(promptsWatcher);
        }
        const docsDir = path7.join(folderPath, "docs");
        if (fs7.existsSync(docsDir)) {
          const notesWatcher = vscode2.workspace.createFileSystemWatcher(
            new vscode2.RelativePattern(vscode2.Uri.file(docsDir), "notes.md")
          );
          notesWatcher.onDidCreate(() => sidebarProvider.forceReload().catch(() => {
          }));
          notesWatcher.onDidChange(() => sidebarProvider.forceReload().catch(() => {
          }));
          notesWatcher.onDidDelete(() => sidebarProvider.forceReload().catch(() => {
          }));
          watchers.push(notesWatcher);
        }
      } catch (e) {
        const folderPath = folder.fsPath || folder.uri?.fsPath || "";
        console.error("[TidyProteomicsAgent] Failed to initialize file watchers for folder:", folderPath, e);
      }
    }
  };
  sidebarProvider.onFolderChangedCallback = (folderPath) => {
    updateWatchers(folderPath);
  };
  updateWatchers();
  context.subscriptions.push(
    vscode2.workspace.onDidChangeWorkspaceFolders(() => {
      updateWatchers();
      sidebarProvider.onWorkspaceChanged().catch(() => {
      });
    })
  );
  context.subscriptions.push({
    dispose: () => {
      for (const w of watchers) {
        try {
          w.dispose();
        } catch (_) {
        }
      }
      watchers = [];
    }
  });
  context.subscriptions.push(
    vscode2.commands.registerCommand("tidyproteomicsagent.startPipeline", () => {
      sidebarProvider.startPipeline();
    })
  );
  context.subscriptions.push(
    vscode2.commands.registerCommand("tidyproteomicsagent.runCurrentPhase", () => {
      sidebarProvider.runSelectedPhase().catch((err) => {
        vscode2.window.showErrorMessage(`TidyProteomicsAgent: ${err.message || String(err)}`);
      });
    })
  );
  context.subscriptions.push(
    vscode2.commands.registerCommand("tidyproteomicsagent.refreshTasks", () => {
      sidebarProvider.forceReload();
    })
  );
  context.subscriptions.push(
    vscode2.commands.registerCommand("tidyproteomicsagent.resetState", async () => {
      const confirm = await vscode2.window.showWarningMessage(
        "Are you sure you want to reset the pipeline state in docs/notes.md?",
        { modal: true },
        "Yes",
        "Cancel"
      );
      if (confirm === "Yes") {
        await sidebarProvider.resetAllState();
        vscode2.window.showInformationMessage("TidyProteomicsAgent: Pipeline state reset.");
      }
    })
  );
  context.subscriptions.push(
    vscode2.commands.registerCommand("tidyproteomicsagent.initWorkspace", async () => {
      await sidebarProvider.promptInitWorkspace();
    })
  );
}
function deactivate() {
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  activate,
  deactivate
});
//# sourceMappingURL=extension.js.map
