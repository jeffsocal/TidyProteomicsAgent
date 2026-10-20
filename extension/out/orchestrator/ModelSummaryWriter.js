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
exports.formatDateTime = formatDateTime;
exports.generateActiveModelSummaryMarkdown = generateActiveModelSummaryMarkdown;
exports.writeActiveModelSummaryFile = writeActiveModelSummaryFile;
const fs = __importStar(require("fs/promises"));
const path = __importStar(require("path"));
function formatDateTime(d = new Date()) {
    const pad = (n) => n.toString().padStart(2, "0");
    const year = d.getFullYear();
    const month = pad(d.getMonth() + 1);
    const day = pad(d.getDate());
    const hours = pad(d.getHours());
    const minutes = pad(d.getMinutes());
    return `${year}-${month}-${day} ${hours}:${minutes}`;
}
function generateActiveModelSummaryMarkdown(config, extensionVersion = "0.1.0", date = new Date()) {
    const timestampStr = formatDateTime(date);
    const providerStr = (config.provider || "anthropic").toUpperCase();
    const modelStr = config.model || "claude-3-7-sonnet-20250219";
    const cachingStr = config.provider === "anthropic" || config.provider === "openrouter"
        ? "Active ⚡"
        : "Standard";
    const maxTokensStr = (config.maxTokens || 32768).toLocaleString();
    const timeoutStr = `${config.timeoutSeconds || 600}s`;
    const keyStatusStr = config.apiKey
        ? "Configured"
        : config.provider === "ollama"
            ? "Not Required (Local)"
            : "Missing";
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
All agent-authored documents and reports (including \`docs/observations.md\`, \`docs/knowledge.md\`, \`docs/websearch.md\`, \`docs/literature.md\`, \`docs/scientific_report.md\`, and any other generated markdown reports) must reference this specification and place the following metadata block immediately below the title:

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
    const docsDir = path.join(workspaceRoot, "docs");
    await fs.mkdir(docsDir, { recursive: true });
    const llmPath = path.join(docsDir, "llm.md");
    const markdown = generateActiveModelSummaryMarkdown(config, extensionVersion);
    try {
        const existing = await fs.readFile(llmPath, "utf-8");
        const stripCreated = (s) => s.replace(/Created:\s*\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}/g, "");
        if (stripCreated(existing) === stripCreated(markdown)) {
            return llmPath;
        }
    }
    catch {
        // file does not exist yet
    }
    await fs.writeFile(llmPath, markdown, "utf-8");
    return llmPath;
}
//# sourceMappingURL=ModelSummaryWriter.js.map