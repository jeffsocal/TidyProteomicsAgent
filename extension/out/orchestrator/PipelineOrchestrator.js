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
exports.PipelineOrchestrator = void 0;
const fs = __importStar(require("fs/promises"));
const path = __importStar(require("path"));
const ContextBuilder_1 = require("../agent/ContextBuilder");
const AgentLoop_1 = require("../agent/AgentLoop");
const ChatLogger_1 = require("../agent/ChatLogger");
const ModelSummaryWriter_1 = require("./ModelSummaryWriter");
const LiteratureService_1 = require("../literature/LiteratureService");
class PipelineOrchestrator {
    workspaceRoot;
    client;
    tools;
    onStateChange;
    onLog;
    extensionVersion;
    phases = [];
    isRunning = false;
    isFullPipelineRunning = false;
    shouldStop = false;
    chatLogger;
    constructor(workspaceRoot, client, tools, onStateChange, onLog, extensionVersion = "0.1.0") {
        this.workspaceRoot = workspaceRoot;
        this.client = client;
        this.tools = tools;
        this.onStateChange = onStateChange;
        this.onLog = onLog;
        this.extensionVersion = extensionVersion;
        this.workspaceRoot = workspaceRoot || "";
        this.chatLogger = new ChatLogger_1.ChatLogger(this.workspaceRoot);
        if (this.workspaceRoot) {
            this.rescanPhases().catch((err) => {
                console.error("[PipelineOrchestrator] Error rescanning phases:", err);
            });
        }
    }
    setExtensionVersion(version) {
        this.extensionVersion = version || "0.1.0";
    }
    async syncModelSummary() {
        if (!this.workspaceRoot)
            return "";
        return await (0, ModelSummaryWriter_1.writeActiveModelSummaryFile)(this.workspaceRoot, this.client.getConfig(), this.extensionVersion);
    }
    ts() {
        const d = new Date();
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
            case "fail_phase":
                return `[Halt / Fail Phase] ${args?.phaseName || ""}: ${args?.reason || ""}`;
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
            this.onLog(`[${this.ts()}] ⚠️ [Pipeline] Cannot change working directory while a pipeline or phase is actively running.`);
            return;
        }
        this.workspaceRoot = newRoot || "";
        this.tools.setWorkspaceRoot(this.workspaceRoot);
        this.chatLogger.setWorkspaceRoot(this.workspaceRoot);
        try {
            await this.rescanPhases();
        }
        catch (err) {
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
        const map = new Map();
        if (!this.workspaceRoot)
            return map;
        try {
            const notesPath = path.join(this.workspaceRoot, "docs", "notes.md");
            const content = await fs.readFile(notesPath, "utf-8");
            const sections = content.split(/\n(?=###\s+)/);
            for (const section of sections) {
                const fileMatch = section.match(/- \*\*File\*\*:\s*`([^`]+)`/);
                if (!fileMatch)
                    continue;
                const rawFileName = fileMatch[1].trim();
                const durationMatch = section.match(/- \*\*Duration\*\*:\s*(\d+)s/);
                const durationSeconds = durationMatch ? parseInt(durationMatch[1], 10) : undefined;
                const startMatch = section.match(/- \*\*Start\*\*:\s*([^\n\r]+)/);
                const startTime = startMatch ? startMatch[1].trim() : undefined;
                const endMatch = section.match(/- \*\*End\*\*:\s*([^\n\r]+)/);
                const endTime = endMatch ? endMatch[1].trim() : undefined;
                const tokenMatch = section.match(/- \*\*Token Usage\*\*:\s*Total:\s*(\d+|N\/A),\s*Prompt:\s*(\d+|N\/A),\s*Completion:\s*(\d+|N\/A)(?:,\s*Cached:\s*(\d+|N\/A))?/i);
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
                const summary = summaryMatch ? summaryMatch[1].trim() : undefined;
                const record = { status, durationSeconds, tokenUsage, summary, startTime, endTime };
                map.set(rawFileName, record);
                const base = path.basename(rawFileName);
                if (!map.has(base)) {
                    map.set(base, record);
                }
            }
        }
        catch {
            // notes.md not available or readable
        }
        return map;
    }
    async forceReloadFromDisk() {
        if (this.isRunning) {
            this.onLog(`[${this.ts()}] ⚠️ [Pipeline] Cannot force reload while an active pipeline run is in flight.`);
            return;
        }
        await this.rescanPhases(true);
        this.onLog(`[${this.ts()}] ↻ [Pipeline] Reloaded all tasks and progress from disk.`);
    }
    async resetAllState() {
        if (this.isRunning) {
            this.onLog(`[${this.ts()}] ⚠️ [Pipeline] Cannot reset state while an active run is in flight.`);
            return;
        }
        const notesPath = path.join(this.workspaceRoot, "docs", "notes.md");
        try {
            const header = `# Autonomous Proteomics Analysis Notes\nModel: ${this.client.getConfig().model}\n\n`;
            await fs.writeFile(notesPath, header, "utf-8");
        }
        catch {
            // ignore
        }
        for (const p of this.phases) {
            p.status = "pending";
            p.startTime = undefined;
            p.endTime = undefined;
            p.durationSeconds = undefined;
            p.tokenUsage = undefined;
            p.summary = undefined;
            p.error = undefined;
        }
        await this.rescanPhases(true);
        this.onLog(`[${this.ts()}] 🧹 [Pipeline] State and runtime blackboard reset to initial state.`);
    }
    async rescanPhases(forceReload = false) {
        if (this.isRunning) {
            // Never clobber phases or state while an active run is in flight
            return;
        }
        if (!this.workspaceRoot) {
            this.phases = [];
            await this.notifyState();
            return;
        }
        const notesRecords = await this.loadNotesRecords();
        const existingMap = forceReload ? new Map() : new Map(this.phases.map((p) => [p.fileName, p]));
        const enabledMap = new Map(this.phases.map((p) => [p.fileName, p.enabled]));
        const newPhases = [];
        // Scan analysis/ directory for markdown phases
        const analysisDir = path.join(this.workspaceRoot, "analysis");
        let hasSetupInAnalysis = false;
        try {
            const files = await fs.readdir(analysisDir);
            const mdFiles = files.filter((f) => f.endsWith(".md")).sort();
            for (let i = 0; i < mdFiles.length; i++) {
                const fileName = mdFiles[i];
                if (fileName.startsWith("00_")) {
                    hasSetupInAnalysis = true;
                }
                const prev = existingMap.get(fileName);
                const noteRec = notesRecords.get(fileName) || notesRecords.get(path.basename(fileName));
                let title = prev?.title;
                if (!title) {
                    try {
                        const content = await fs.readFile(path.join(analysisDir, fileName), "utf-8");
                        const firstHeader = content.split("\n").find((l) => l.trim().startsWith("#"));
                        if (firstHeader) {
                            title = firstHeader.replace(/^#+\s*/, "").trim();
                        }
                    }
                    catch {
                        // fallback
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
                }
                else if (noteRec?.status) {
                    resolvedStatus = noteRec.status;
                }
                const isEnabled = enabledMap.has(fileName) ? enabledMap.get(fileName) : (prev ? prev.enabled : true);
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
                    error: prev?.error || (resolvedStatus === "failed" ? noteRec?.summary : undefined),
                });
            }
        }
        catch (e) {
            this.onLog(`[${this.ts()}] ℹ️ [Pipeline] Note: 'analysis' directory not found in ${this.workspaceRoot}`);
        }
        // Legacy fallback: if no 00_ in analysis/, check agent/INSTRUCT.md (or prompts/INSTRUCT.md)
        if (!hasSetupInAnalysis) {
            let instructRel = "agent/INSTRUCT.md";
            let instructPath = path.join(this.workspaceRoot, "agent", "INSTRUCT.md");
            try {
                await fs.stat(instructPath);
            }
            catch {
                instructRel = "prompts/INSTRUCT.md";
                instructPath = path.join(this.workspaceRoot, "prompts", "INSTRUCT.md");
            }
            try {
                await fs.stat(instructPath);
                const prev = existingMap.get(instructRel) || existingMap.get("agent/INSTRUCT.md") || existingMap.get("prompts/INSTRUCT.md");
                const noteRec = notesRecords.get(instructRel) || notesRecords.get("agent/INSTRUCT.md") || notesRecords.get("prompts/INSTRUCT.md") || notesRecords.get("INSTRUCT.md");
                let resolvedStatus = "pending";
                if (prev?.status && prev.status !== "running") {
                    resolvedStatus = prev.status;
                }
                else if (noteRec?.status) {
                    resolvedStatus = noteRec.status;
                }
                const isEnabled = enabledMap.has(instructRel)
                    ? enabledMap.get(instructRel)
                    : (prev ? prev.enabled : true);
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
                    error: prev?.error || (resolvedStatus === "failed" ? noteRec?.summary : undefined),
                });
            }
            catch {
                // no instruct.md
            }
        }
        this.phases = newPhases;
        await this.notifyState();
    }
    async getPromptFiles() {
        let agentDir = "agent";
        try {
            await fs.stat(path.join(this.workspaceRoot, "agent"));
        }
        catch {
            agentDir = "prompts";
        }
        const list = [
            { name: "Analysis Protocol", relPath: `${agentDir}/PROTOCOL.md` },
            { name: "TidyProteomics Skills", relPath: `${agentDir}/SKILL.md` },
            { name: "Experiment & Dataset Spec", relPath: "docs/experiment.md" },
            { name: "Shared Memory", relPath: "docs/notes.md" },
            { name: "Active Model Summary", relPath: "docs/llm.md" },
            { name: "LLM Chat Log", relPath: "logs/llm_chat.md" },
        ];
        // If optional BIOLOGY.md exists, include it
        try {
            await fs.stat(path.join(this.workspaceRoot, `${agentDir}/BIOLOGY.md`));
            list.splice(1, 0, { name: "Curated Biological Context", relPath: `${agentDir}/BIOLOGY.md` });
        }
        catch { }
        // If legacy VARIABLES.md exists, include it
        try {
            await fs.stat(path.join(this.workspaceRoot, `${agentDir}/VARIABLES.md`));
            list.splice(1, 0, { name: "Legacy Dataset Variables", relPath: `${agentDir}/VARIABLES.md` });
        }
        catch { }
        const result = [];
        for (const item of list) {
            let exists = false;
            try {
                await fs.stat(path.join(this.workspaceRoot, item.relPath));
                exists = true;
            }
            catch {
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
        const analysisDir = path.join(this.workspaceRoot, "analysis");
        await fs.mkdir(analysisDir, { recursive: true });
        const fullPath = path.join(analysisDir, cleanFileName);
        const defaultTitle = title || cleanFileName.replace(/\.md$/, "").replace(/_/g, " ");
        const template = `### Phase: ${defaultTitle}
Construct and execute code for this phase, capturing output to logs.

#### Tasks:
- [ ] Task 1: Initialize step.
- [ ] Task 2: Execute analysis in R or shell.
- [ ] Checkpoint: Verify outputs and log files.
`;
        await fs.writeFile(fullPath, template, "utf-8");
        await this.rescanPhases();
        return fullPath;
    }
    async removePhase(phaseId) {
        const idx = this.phases.findIndex((p) => p.id === phaseId);
        if (idx !== -1) {
            const phase = this.phases[idx];
            if (!phase.isMasterSetup) {
                try {
                    await fs.unlink(path.join(this.workspaceRoot, "analysis", phase.fileName));
                }
                catch {
                    // ignore if already deleted
                }
            }
            this.phases.splice(idx, 1);
            await this.notifyState();
        }
    }
    async getFoldersStatus() {
        let agentFolder = "agent";
        try {
            await fs.stat(path.join(this.workspaceRoot, "agent"));
        }
        catch {
            agentFolder = "prompts";
        }
        const list = [
            { name: "analysis", relPath: "analysis", description: "Phase Prompts (00_INSTALL.md .. 10_SYNTHESIS.md)" },
            { name: agentFolder, relPath: agentFolder, description: "Protocol, Variables & Skills (Cached Prefix)" },
            { name: "code", relPath: "code", description: "Generated Analysis Scripts" },
            { name: "tools", relPath: "tools", description: "Linter & Execution Helper Utilities" },
            { name: "docs", relPath: "docs", description: "Shared Memory (notes.md, llm.md) & Experiment Design" },
            { name: "logs", relPath: "logs", description: "Execution Chat Trace (llm_chat.md)" },
            { name: "data", relPath: "data", description: "Raw Input Proteomics Data" },
        ];
        const result = [];
        if (!this.workspaceRoot)
            return result;
        for (const item of list) {
            const full = path.join(this.workspaceRoot, item.relPath);
            let exists = false;
            let itemCount = 0;
            try {
                const stat = await fs.stat(full);
                if (stat.isDirectory()) {
                    exists = true;
                    const files = await fs.readdir(full);
                    itemCount = files.filter((f) => !f.startsWith(".")).length;
                }
            }
            catch {
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
        const analysisFolder = folders.find((f) => f.name === "analysis");
        const isAnalysisMissingOrEmpty = !this.workspaceRoot ||
            !analysisFolder ||
            !analysisFolder.exists ||
            (analysisFolder.itemCount || 0) === 0 ||
            this.phases.length === 0;
        return {
            workingDirectory: this.workspaceRoot,
            workspaceName: this.workspaceRoot ? path.basename(this.workspaceRoot) : "No Folder Open",
            model: config.model,
            provider: config.provider,
            startTime: new Date().toISOString(),
            isRunning: this.isRunning,
            isFullPipelineRunning: this.isFullPipelineRunning,
            currentPhaseIndex: this.phases.findIndex((p) => p.status === "running"),
            phases: this.phases,
            promptFiles,
            folders,
            totalTokens: {
                promptTokens: totalPrompt,
                completionTokens: totalCompletion,
                totalTokens: totalTokens,
                cachedPromptTokens: totalCached,
            },
            isAnalysisMissingOrEmpty,
            literature: (0, LiteratureService_1.readLiteratureConfig)(this.workspaceRoot),
            knowledgeCorpus: (0, LiteratureService_1.readLiteratureConfig)(this.workspaceRoot),
        };
    }
    async notifyState() {
        try {
            const state = await this.getState();
            this.onStateChange(state);
        }
        catch (err) {
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
        this.onLog(`[${this.ts()}] ⏹ [Pipeline] Execution stopped by user.`);
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
        const filesToRemove = new Set();
        for (const p of targetPhases) {
            filesToRemove.add(p.fileName);
            filesToRemove.add(path.basename(p.fileName));
            if (p.isMasterSetup) {
                filesToRemove.add("agent/INSTRUCT.md");
                filesToRemove.add("prompts/INSTRUCT.md");
                filesToRemove.add("INSTRUCT.md");
            }
        }
        const notesPath = path.join(this.workspaceRoot, "docs", "notes.md");
        try {
            const content = await fs.readFile(notesPath, "utf-8");
            const sections = content.split(/\n(?=###\s+)/);
            const kept = [];
            for (const section of sections) {
                const fileMatch = section.match(/- \*\*File\*\*:\s*`([^`]+)`/);
                if (fileMatch) {
                    const rawFileName = fileMatch[1].trim();
                    const baseName = path.basename(rawFileName);
                    if (filesToRemove.has(rawFileName) || filesToRemove.has(baseName)) {
                        continue;
                    }
                }
                kept.push(section);
            }
            const updated = kept.join("\n").replace(/\n{3,}/g, "\n\n").trim() + "\n";
            await fs.writeFile(notesPath, updated, "utf-8");
        }
        catch {
            // notes.md may not exist yet
        }
    }
    /**
     * Run a single phase in isolation with automatic cascading reset of downstream phases
     */
    async runSinglePhase(phaseId) {
        if (this.isRunning) {
            this.onLog(`[${this.ts()}] ⚠️ [Pipeline] Execution busy: A pipeline or phase is already running. Please wait or stop it first.`);
            return;
        }
        const phaseIndex = this.phases.findIndex((p) => p.id === phaseId);
        if (phaseIndex === -1) {
            this.onLog(`[${this.ts()}] ❌ [Pipeline] Phase ID '${phaseId}' not found.`);
            return;
        }
        // Invalidate target phase and all downstream phases
        for (let i = phaseIndex; i < this.phases.length; i++) {
            const p = this.phases[i];
            if (i === phaseIndex) {
                p.status = "running";
                p.startTime = new Date().toISOString();
                p.endTime = undefined;
                p.durationSeconds = undefined;
                p.tokenUsage = undefined;
                p.summary = undefined;
                p.error = undefined;
            }
            else {
                p.status = "pending";
                p.startTime = undefined;
                p.endTime = undefined;
                p.durationSeconds = undefined;
                p.tokenUsage = undefined;
                p.summary = undefined;
                p.error = undefined;
            }
        }
        // Prune blackboard records for this phase and downstream steps
        await this.pruneNotesFromPhase(phaseIndex);
        // Notify UI immediately so downstream tasks visibly clear out to PENDING
        await this.notifyState();
        this.isRunning = true;
        this.isFullPipelineRunning = false;
        this.shouldStop = false;
        try {
            await this.executePhase(phaseIndex);
        }
        catch (err) {
            this.onLog(`[${this.ts()}] ❌ [Pipeline] Error running phase ${phaseId}: ${err.message}`);
        }
        finally {
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
            this.onLog(`[${this.ts()}] ⚠️ [Pipeline] Execution busy: A pipeline is already running.`);
            return;
        }
        if (!this.workspaceRoot || this.phases.length === 0) {
            this.onLog(`[${this.ts()}] ⚠️ [Pipeline] No analysis tasks found to execute. Please initialize an analysis pipeline first.`);
            return;
        }
        this.isRunning = true;
        this.isFullPipelineRunning = true;
        this.shouldStop = false;
        this.onLog(`[${this.ts()}] 🚀 [Pipeline] Starting autonomous run at ${new Date().toLocaleTimeString()}`);
        this.onLog(`[${this.ts()}] 📁 [Pipeline] Working Directory: ${this.workspaceRoot}`);
        try {
            for (let i = 0; i < this.phases.length; i++) {
                if (this.shouldStop) {
                    this.onLog(`[${this.ts()}] ⏹ [Pipeline] Execution stopped by user.`);
                    break;
                }
                const phase = this.phases[i];
                if (!phase.enabled) {
                    this.onLog(`[${this.ts()}] ⏭️ [Pipeline] Skipping disabled phase: ${phase.title}`);
                    continue;
                }
                // Prune any existing note for phase i before executing it
                await this.pruneNotesFromPhase(i);
                const success = await this.executePhase(i);
                if (!success) {
                    this.onLog(`[${this.ts()}] ⚠️ [Pipeline] Pipeline paused due to checkpoint failure in ${phase.title}`);
                    break;
                }
            }
        }
        catch (err) {
            this.onLog(`[${this.ts()}] ❌ [Pipeline] Full pipeline error: ${err.message}`);
        }
        finally {
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
        phase.startTime = new Date().toISOString();
        phase.endTime = undefined;
        phase.error = undefined;
        if (!phase.tokenUsage) {
            phase.tokenUsage = { promptTokens: 0, completionTokens: 0, totalTokens: 0, cachedPromptTokens: 0 };
        }
        const startTimeMs = Date.now();
        await this.notifyState();
        this.onLog(`[${this.ts()}] 🚀 Starting ${phase.title} (${phase.fileName})`);
        let loop;
        try {
            try {
                await (0, ModelSummaryWriter_1.writeActiveModelSummaryFile)(this.workspaceRoot, this.client.getConfig(), this.extensionVersion);
            }
            catch (err) {
                console.warn("[PipelineOrchestrator] Could not write docs/llm.md before phase execution:", err);
            }
            const contextBuilder = new ContextBuilder_1.ContextBuilder(this.workspaceRoot);
            const context = await contextBuilder.buildPhaseContext(phase.fileName);
            loop = new AgentLoop_1.AgentLoop(phase.fileName, phase.title, this.client, this.tools, context, async (event) => {
                if (event.type === "thought") {
                    this.onLog(`[${this.ts()}] 🔄 ${event.data}`);
                }
                else if (event.type === "text") {
                    // Raw context stream is logged to logs/llm_chat.md by chatLogger; live terminal feed displays timestamped headers only
                }
                else if (event.type === "tool_start") {
                    this.onLog(`[${this.ts()}] 🛠️ ${this.formatToolHeader(event.data.name, event.data.args)}`);
                }
                else if (event.type === "tool_end") {
                    this.onLog(`[${this.ts()}] ${event.data.isError ? "❌" : "✓"} [Result] ${event.data.name} ${event.data.isError ? "failed" : "completed"}`);
                }
                else if (event.type === "tokens") {
                    const currentPhase = getActivePhase();
                    currentPhase.tokenUsage = { ...event.data.totalUsage };
                    await this.notifyState();
                }
            }, this.chatLogger, () => this.shouldStop);
            const result = await loop.run();
            const durationSeconds = Math.max(1, Math.round((Date.now() - startTimeMs) / 1000));
            const currentPhase = getActivePhase();
            currentPhase.endTime = new Date().toISOString();
            currentPhase.durationSeconds = durationSeconds;
            currentPhase.tokenUsage = result.tokensUsed;
            currentPhase.summary = result.summary;
            if (result.success) {
                currentPhase.status = "completed";
                this.onLog(`[${this.ts()}] ✅ ${currentPhase.title} completed in ${durationSeconds}s (${result.tokensUsed.totalTokens.toLocaleString()} tokens)`);
                // Update docs/notes.md with phase record
                await this.appendPhaseRecordToNotes(currentPhase);
                await this.notifyState();
                return true;
            }
            else {
                currentPhase.status = "failed";
                currentPhase.error = result.summary;
                const summaryText = String(result.summary || "Phase failed").trim();
                const lines = summaryText.split("\n");
                const firstLine = lines[0];
                this.onLog(`[${this.ts()}] ❌ ${currentPhase.title} halted / failed: ${firstLine}`);
                for (let i = 1; i < lines.length; i++) {
                    const line = lines[i].trim();
                    if (line) {
                        this.onLog(`[${this.ts()}] 💡 ${line}`);
                    }
                }
                await this.appendPhaseRecordToNotes(currentPhase);
                await this.notifyState();
                return false;
            }
        }
        catch (err) {
            const currentPhase = getActivePhase();
            currentPhase.status = "failed";
            currentPhase.error = err.message;
            if (loop && (!currentPhase.tokenUsage || currentPhase.tokenUsage.totalTokens === 0)) {
                currentPhase.tokenUsage = loop.getTotalUsage();
            }
            this.onLog(`[${this.ts()}] ❌ Error in ${currentPhase.title}: ${err.message}`);
            await this.notifyState();
            return false;
        }
    }
    async appendPhaseRecordToNotes(phase) {
        const notesPath = path.join(this.workspaceRoot, "docs", "notes.md");
        const statusText = phase.status === "failed" ? "FAILED" : "COMPLETED";
        const summaryContent = phase.summary || (phase.status === "failed" ? phase.error || "Phase halted or failed." : "Phase checkpoints verified.");
        const entry = `
### ${phase.title} - ${statusText}
- **File**: \`${phase.fileName}\`
- **Duration**: ${phase.durationSeconds}s
- **Start**: ${phase.startTime}
- **End**: ${phase.endTime}
- **Token Usage**: Total: ${phase.tokenUsage?.totalTokens || "N/A"}, Prompt: ${phase.tokenUsage?.promptTokens || "N/A"}, Completion: ${phase.tokenUsage?.completionTokens || "N/A"}, Cached: ${phase.tokenUsage?.cachedPromptTokens || 0}
- **Summary**:
${summaryContent}

---
`;
        try {
            await fs.mkdir(path.dirname(notesPath), { recursive: true });
            let current = "";
            try {
                current = await fs.readFile(notesPath, "utf-8");
            }
            catch {
                current = `# Autonomous Proteomics Analysis Notes\nModel: ${this.client.getConfig().model}\n\n`;
            }
            await fs.writeFile(notesPath, current + entry, "utf-8");
        }
        catch (e) {
            this.onLog(`[${this.ts()}] ⚠️ Warning: Failed to update docs/notes.md: ${e}`);
        }
    }
}
exports.PipelineOrchestrator = PipelineOrchestrator;
//# sourceMappingURL=PipelineOrchestrator.js.map