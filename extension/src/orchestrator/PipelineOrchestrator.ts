import * as vscode from "vscode";
import * as fs from "fs/promises";
import * as path from "path";
import { FolderStatus, PhaseInfo, PhaseStatus, PipelineState, PromptFileInfo, TokenUsage } from "../types";
import { ContextBuilder } from "../agent/ContextBuilder";
import { AgentLoop } from "../agent/AgentLoop";
import { ChatLogger } from "../agent/ChatLogger";
import { ProviderClient } from "../llm/ProviderClient";
import { ToolRegistry } from "../tools/ToolRegistry";
import { writeActiveModelSummaryFile } from "./ModelSummaryWriter";
import { readLiteratureConfig } from "../literature/LiteratureService";

export class PipelineOrchestrator {
  private phases: PhaseInfo[] = [];
  private isRunning = false;
  private isFullPipelineRunning = false;
  private shouldStop = false;
  private chatLogger: ChatLogger;

  constructor(
    private workspaceRoot: string,
    private client: ProviderClient,
    private tools: ToolRegistry,
    private onStateChange: (state: PipelineState) => void,
    private onLog: (text: string, updateLast?: boolean) => void,
    private extensionVersion: string = "0.1.0",
    private onAgentActivity?: (phase: PhaseInfo, text: string) => void,
    private onAgentObservation?: (phase: PhaseInfo, text: string, metadata?: { badge?: string; metric?: string }) => void
  ) {
    this.workspaceRoot = workspaceRoot || "";
    this.chatLogger = new ChatLogger(this.workspaceRoot);
    if (this.workspaceRoot) {
      this.rescanPhases().catch((err) => {
        console.error("[PipelineOrchestrator] Error rescanning phases:", err);
      });
    }
  }

  public setExtensionVersion(version: string) {
    this.extensionVersion = version || "0.1.0";
  }

  public async syncModelSummary(): Promise<string> {
    if (!this.workspaceRoot) return "";
    return await writeActiveModelSummaryFile(this.workspaceRoot, this.client.getConfig(), this.extensionVersion);
  }

  private ts(): string {
    const d = new Date();
    return d.toTimeString().split(" ")[0];
  }

  private logPhase(tag: string, message: string, updateLast = false) {
    const line = `[${this.ts()}] ${tag}: ${message}`;
    this.onLog(this.truncateTo(line, 120), updateLast);
  }

  private logPipeline(message: string, updateLast = false) {
    this.logPhase("Pipeline", message, updateLast);
  }

  private truncateTo(line: string, maxLen = 120): string {
    if (line.length <= maxLen) return line;
    return line.slice(0, maxLen - 3) + "...";
  }

  private formatToolHeader(name: string, args: Record<string, any>): string {
    switch (name) {
      case "execute_command": {
        const cmd = String(args?.command || "").trim().replace(/\s+/g, " ");
        return `[Command] ${cmd}`;
      }
      case "read_file": {
        const filePath = String(args?.filePath || "").trim();
        const range = args?.startLine
          ? ` (lines ${args.startLine}-${Number(args.startLine) + Number(args.maxLines || 0) - 1})`
          : "";
        return `[Read] ${filePath}${range}`;
      }
      case "write_file": {
        const filePath = String(args?.filePath || "").trim();
        const len = typeof args?.content === "string" ? ` (${args.content.length} chars)` : "";
        return `[Write] ${filePath}${len}`;
      }
      case "replace_file_content": {
        const filePath = String(args?.filePath || "").trim();
        return `[Edit] ${filePath}`;
      }
      case "list_directory": {
        const dp = String(args?.dirPath || ".").trim();
        const display = (!dp || dp === "." || dp === "./") ? "directory contents" : dp;
        return `[List] ${display}`;
      }
      case "check_checkpoint_gate": {
        const files = Array.isArray(args?.requiredFiles) ? args.requiredFiles.join(", ") : "";
        return `[Check Gate] ${files}`;
      }
      case "complete_phase": {
        const pName = String(args?.phaseName || "").trim();
        return `[Complete Phase] ${pName}`;
      }
      case "fail_phase": {
        const pName = String(args?.phaseName || "").trim();
        const reason = String(args?.reason || "").trim();
        return `[Halt Phase] ${pName}${reason ? ": " + reason : ""}`;
      }
      case "tpa_load": {
        const src = args?.source || args?.load_local || "";
        const cfg = args?.config ? ` (config: ${path.basename(String(args.config))})` : "";
        return `[MCP Load] ${path.basename(String(src)) || src}${cfg}`;
      }
      case "tpa_export_config": {
        return `[MCP Export Config] ${args?.platform || "config"}${args?.analyte ? ` (${args.analyte})` : ""}`;
      }
      case "tpa_inspect": {
        return `[MCP Inspect] ${args?.what || "structure"}`;
      }
      case "tpa_summary": {
        return `[MCP Summary] ${args?.by || "summary"}`;
      }
      case "tpa_subset": {
        return `[MCP Subset] ${args?.subset_expression || ""}`;
      }
      case "tpa_normalize": {
        const methods = Array.isArray(args?.methods) ? args.methods.join(", ") : args?.methods || "";
        return `[MCP Normalize] ${methods}`;
      }
      case "tpa_select_normalization": {
        return `[MCP Select Normalization] ${args?.method || ""}`;
      }
      case "tpa_impute": {
        return `[MCP Impute] ${args?.algorithm || args?.method || ""}`;
      }
      case "tpa_expression": {
        return `[MCP Expression] ${args?.comparison || ""}`;
      }
      case "tpa_enrichment": {
        return `[MCP Enrichment] ${args?.comparison || ""} (${args?.term || ""})`;
      }
      case "tpa_plot": {
        return `[MCP Plot] ${args?.type || "plot"}`;
      }
      case "tpa_export_table": {
        return `[MCP Export Table] ${args?.file_name || args?.type || ""}`;
      }
      case "tpa_export_state": {
        return `[MCP Export State] ${path.basename(String(args?.script_path || "pipeline.R"))}`;
      }
      case "tpa_extract": {
        return `[MCP Extract] ${args?.values || "values"}`;
      }
      case "tpa_operations": {
        return `[MCP Audit Operations]`;
      }
      case "tpa_reassign": {
        const target = args?.target || "sample";
        const desc = args?.mapping ? `${Object.keys(args.mapping).length} sample mappings` : (args?.condition ? `${args.condition} -> ${args.replace}` : "");
        return `[MCP Reassign] ${target} (${desc})`;
      }
      case "tpa_health": {
        return `[MCP Health Check]`;
      }
      default: {
        const keys = Object.keys(args || {});
        const summary = keys.length > 0 ? ` (${keys.join(", ")})` : "";
        return `[${name}]${summary}`;
      }
    }
  }

  private formatNaturalActivity(name: string, args: Record<string, any>, phaseTitle: string): string {
    switch (name) {
      case "tpa_load": {
        const src = args?.source || args?.load_local || "";
        const base = path.basename(String(src)) || "dataset";
        return `Loading quantitative dataset from \`${base}\`...`;
      }
      case "tpa_export_config": {
        const plat = args?.platform || "platform";
        return `Exporting ${plat} import configuration template for inspection...`;
      }
      case "tpa_input_audit": {
        const plat = args?.platform || "platform";
        return `Auditing raw file headers and matching regex patterns against ${plat}...`;
      }
      case "tpa_ingest_config": {
        const act = args?.action || "configuring";
        return `Customizing ingestion configuration (${act}) for ${args?.platform || "platform"}...`;
      }
      case "tpa_inspect": {
        const what = String(args?.what || "structure");
        if (what === "overview") return "Inspecting dataset topology, sample groups, and protein counts...";
        if (what === "samples") return "Auditing sample metadata and replicate annotations...";
        if (what === "operations") return "Checking operations history and normalization status...";
        return `Inspecting dataset ${what}...`;
      }
      case "tpa_summary": {
        const by = String(args?.by || args?.what || "sample");
        return `Calculating quality metrics across ${by}s...`;
      }
      case "tpa_normalize": {
        const methods = Array.isArray(args?.methods)
          ? args.methods.join(", ")
          : args?.methods || args?.method || "algorithms";
        return `Benchmarking normalization (${methods})...`;
      }
      case "tpa_select_normalization": {
        return `Selecting ${args?.method || "optimal"} normalization layer...`;
      }
      case "tpa_impute": {
        const alg = args?.algorithm || args?.method || "LOD";
        return `Imputing missing quantitative values (${alg})...`;
      }
      case "tpa_expression": {
        const comp = args?.comparison || args?.contrast || "designated contrast";
        return `Computing differential expression for \`${comp}\`...`;
      }
      case "tpa_enrichment": {
        const term = args?.term || args?.terms || "pathways";
        return `Running functional enrichment analysis (${term})...`;
      }
      case "tpa_plot": {
        const type = args?.type || "diagnostic";
        return `Generating ${type} visualization...`;
      }
      case "tpa_export_table": {
        const fn = args?.file_name || "table.csv";
        return `Exporting analysis table to \`${fn}\`...`;
      }
      case "tpa_export_state": {
        return "Exporting reproducible R script and persisting data checkpoint...";
      }
      case "tpa_extract": {
        return `Extracting ${args?.values || "data values"} from analysis state...`;
      }
      case "tpa_operations": {
        return "Auditing upstream transformations & operations history...";
      }
      case "tpa_reassign": {
        const target = args?.target || "sample";
        const count = args?.mapping ? `${Object.keys(args.mapping).length} samples` : args?.replace || "conditions";
        return `Reassigning ${target} groups (${count})...`;
      }
      case "tpa_health": {
        return "Verifying MCP server connectivity and runtime health...";
      }
      case "read_file": {
        const fp = path.basename(String(args?.filePath || "file"));
        return `Reading \`${fp}\`...`;
      }
      case "write_file": {
        const fp = path.basename(String(args?.filePath || "file"));
        return `Writing \`${fp}\`...`;
      }
      case "replace_file_content": {
        const fp = path.basename(String(args?.filePath || "file"));
        return `Updating \`${fp}\`...`;
      }
      case "execute_command": {
        const cmd = String(args?.command || "").trim();
        const shortCmd = cmd.length > 50 ? cmd.slice(0, 47) + "..." : cmd;
        return `Running command: \`${shortCmd}\`...`;
      }
      case "check_checkpoint_gate": {
        return "Verifying quality gates and checkpoint outputs...";
      }
      case "complete_phase": {
        return "Finalizing phase and recording findings...";
      }
      case "fail_phase": {
        return "Evaluating phase failure checkpoint...";
      }
      default: {
        const clean = name.replace(/^tpa_/, "").replace(/_/g, " ");
        return `Executing ${clean}...`;
      }
    }
  }

  private extractToolObservation(
    name: string,
    args: Record<string, any>,
    result: string
  ): { text: string; badge: string } | null {
    if (!result || typeof result !== "string") return null;
    const res = result.trim();

    if (name === "tpa_load" || (name === "tpa_inspect" && args?.what === "overview")) {
      const sampleMatch = res.match(/(?:samples?|files?)\s*[:=]\s*(\d+)/i) || res.match(/(\d+)\s+samples?/i);
      const proteinMatch = res.match(/(?:proteins?|peptides?|features?)\s*[:=]\s*([\d,]+)/i) || res.match(/([\d,]+)\s+proteins?/i);
      const missingMatch = res.match(/(?:missing(?:ness)?)\s*[:=]\s*([\d\.]+)%/i) || res.match(/([\d\.]+)%\s+missing/i);
      if (sampleMatch || proteinMatch) {
        const parts: string[] = [];
        if (sampleMatch) parts.push(`**${sampleMatch[1]}** samples`);
        if (proteinMatch) parts.push(`**${proteinMatch[1]}** quantified features`);
        if (missingMatch) parts.push(`**${missingMatch[1]}%** missingness`);
        return {
          text: `Dataset topology confirmed: identified ${parts.join(", ")}.`,
          badge: "Topology",
        };
      }
    }

    if (name === "tpa_normalize" || name === "tpa_select_normalization") {
      const cvMatch = res.match(/cv\s*[:=]?\s*([\d\.]+)/i);
      const method = args?.method || (Array.isArray(args?.methods) ? args.methods[0] : args?.methods) || "optimal";
      return {
        text: `Benchmarked normalization candidates. Selected **${method}** normalization${cvMatch ? ` (CV: ${cvMatch[1]})` : ""}.`,
        badge: "Normalization",
      };
    }

    if (name === "tpa_impute") {
      const imputedMatch = res.match(/(\d+[\d,]*|\d+\.?\d*%)\s*(?:imputed|missing)/i);
      const method = args?.algorithm || args?.method || "LOD";
      return {
        text: `Completed missing value imputation using **${method}** strategy${imputedMatch ? ` (${imputedMatch[0]})` : ""}.`,
        badge: "Imputation",
      };
    }

    if (name === "tpa_expression") {
      const sigMatch = res.match(/(\d+)\s*(?:significant|differentially expressed)/i);
      const comp = args?.comparison || args?.contrast || "designated comparison";
      return {
        text: `Differential expression testing complete for \`${comp}\`${sigMatch ? `: detected **${sigMatch[1]}** significant proteins` : ""}.`,
        badge: "Expression",
      };
    }

    if (name === "tpa_enrichment") {
      const term = args?.term || args?.terms || "pathways";
      return {
        text: `Pathway enrichment analysis completed for \`${term}\` ontologies.`,
        badge: "Enrichment",
      };
    }

    return null;
  }

  public getIsRunning(): boolean {
    return this.isRunning;
  }

  public getIsFullPipelineRunning(): boolean {
    return this.isFullPipelineRunning;
  }

  public async setWorkingDirectory(newRoot: string): Promise<void> {
    if (this.isRunning) {
      this.logPipeline("Cannot change working directory while a pipeline or phase is actively running.");
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

  public getWorkingDirectory(): string {
    return this.workspaceRoot;
  }

  /**
   * Dynamically inspects the workspace directory for analysis/*.md phases and agent/INSTRUCT.md
   */
  private async loadNotesRecords(): Promise<
    Map<
      string,
      {
        status: PhaseStatus;
        durationSeconds?: number;
        tokenUsage?: TokenUsage;
        summary?: string;
        startTime?: string;
        endTime?: string;
      }
    >
  > {
    const map = new Map();
    if (!this.workspaceRoot) return map;

    try {
      const notesPath = path.join(this.workspaceRoot, "docs", "notes.md");
      const content = await fs.readFile(notesPath, "utf-8");
      const sections = content.split(/\n(?=###\s+)/);

      for (const section of sections) {
        const fileMatch = section.match(/- \*\*File\*\*:\s*`([^`]+)`/);
        if (!fileMatch) continue;
        const rawFileName = fileMatch[1].trim();

        const durationMatch = section.match(/- \*\*Duration\*\*:\s*(\d+)s/);
        const durationSeconds = durationMatch ? parseInt(durationMatch[1], 10) : undefined;

        const startMatch = section.match(/- \*\*Start\*\*:\s*([^\n\r]+)/);
        const startTime = startMatch ? startMatch[1].trim() : undefined;

        const endMatch = section.match(/- \*\*End\*\*:\s*([^\n\r]+)/);
        const endTime = endMatch ? endMatch[1].trim() : undefined;

        const tokenMatch = section.match(
          /- \*\*Token Usage\*\*:\s*Total:\s*(\d+|N\/A),\s*Prompt:\s*(\d+|N\/A),\s*Completion:\s*(\d+|N\/A)(?:,\s*Cached:\s*(\d+|N\/A))?/i
        );
        let tokenUsage: TokenUsage | undefined;
        if (tokenMatch) {
          const totalTokens = tokenMatch[1] !== "N/A" ? parseInt(tokenMatch[1], 10) : 0;
          const promptTokens = tokenMatch[2] !== "N/A" ? parseInt(tokenMatch[2], 10) : 0;
          const completionTokens = tokenMatch[3] !== "N/A" ? parseInt(tokenMatch[3], 10) : 0;
          const cachedPromptTokens = tokenMatch[4] && tokenMatch[4] !== "N/A" ? parseInt(tokenMatch[4], 10) : 0;
          tokenUsage = { totalTokens, promptTokens, completionTokens, cachedPromptTokens };
        }

        const isCompleted = section.includes("- COMPLETED");
        const isFailed = section.includes("- FAILED");
        const status: PhaseStatus = isCompleted ? "completed" : isFailed ? "failed" : "completed";

        const summaryMatch = section.match(/\*\*Summary\*\*:\s*\n([\s\S]*?)(?:\n---|\n###|$)/);
        const summary = summaryMatch ? summaryMatch[1].trim() : undefined;

        const record = { status, durationSeconds, tokenUsage, summary, startTime, endTime };
        map.set(rawFileName, record);
        const base = path.basename(rawFileName);
        if (!map.has(base)) {
          map.set(base, record);
        }
      }
    } catch {
      // notes.md not available or readable
    }

    // Secondary fallback: scan logs/pipeline.md master table
    // If docs/notes.md was overwritten or is missing a phase entry, restore telemetry and status from pipeline.md
    try {
      const pipelineLogPath = path.join(this.workspaceRoot, "logs", "pipeline.md");
      const pipelineContent = await fs.readFile(pipelineLogPath, "utf-8");
      const lines = pipelineContent.split("\n");
      for (const line of lines) {
        const match = line.match(
          /\|\s*([✓❌⏳\?])\s*\*\*([^\*]+)\*\*\s*\|\s*([^\|]+)\|\s*([A-Z]+)\s*\|\s*(\d+)s\s*\|\s*([\d,]+)\s*\|/i
        );
        if (match) {
          const rawTag = match[2].trim().toLowerCase();
          const statusText = match[4].trim().toUpperCase();
          const status: PhaseStatus = statusText === "COMPLETED" ? "completed" : statusText === "FAILED" ? "failed" : "pending";
          const durationSeconds = parseInt(match[5], 10);
          const totalTokens = parseInt(match[6].replace(/,/g, ""), 10);

          const record = {
            status,
            durationSeconds,
            tokenUsage: { totalTokens, promptTokens: 0, completionTokens: 0, cachedPromptTokens: 0 },
            summary: undefined,
          };

          const existing = map.get(rawTag) || map.get(`${rawTag.toUpperCase()}.md`);
          if (!existing || (existing.status !== "completed" && status === "completed")) {
            map.set(rawTag, record);
            map.set(`${rawTag.toUpperCase()}.md`, record);
            map.set(`${rawTag}.md`, record);
          }
        }
      }
    } catch {
      // logs/pipeline.md not available or readable
    }

    return map;
  }

  public async forceReloadFromDisk(): Promise<void> {
    if (this.isRunning) {
      this.logPipeline("Cannot force reload while an active pipeline run is in flight.");
      return;
    }
    await this.rescanPhases(true);
    this.logPipeline("Reloaded all tasks and progress from disk.");
  }

  public async resetAllState(): Promise<void> {
    if (this.isRunning) {
      this.logPipeline("Cannot reset state while an active run is in flight.");
      return;
    }
    const notesPath = path.join(this.workspaceRoot, "docs", "notes.md");
    try {
      const header = `# Autonomous Proteomics Analysis Notes\nModel: ${this.client.getConfig().model}\n\n`;
      await fs.writeFile(notesPath, header, "utf-8");
    } catch {
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
    this.logPipeline("State and runtime blackboard reset to initial state.");
  }

  public async rescanPhases(forceReload = false): Promise<void> {
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
    const newPhases: PhaseInfo[] = [];

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
        const noteRec =
          notesRecords.get(fileName) ||
          notesRecords.get(path.basename(fileName)) ||
          notesRecords.get(fileName.replace(/\.md$/i, "").toLowerCase());

        let title = prev?.title;
        if (!title) {
          try {
            const content = await fs.readFile(path.join(analysisDir, fileName), "utf-8");
            const firstHeader = content.split("\n").find((l) => l.trim().startsWith("#"));
            if (firstHeader) {
              title = firstHeader.replace(/^#+\s*/, "").trim();
            }
          } catch {
            // fallback
          }
          if (!title) {
            title = fileName.replace(/^[0-9]+[a-zA-Z]?_/, "").replace(/\.md$/, "").replace(/_/g, " ");
            title = `Phase: ${title}`;
          }
        }

        const id = fileName.match(/^([0-9]+[a-zA-Z]?)/)?.[1] || fileName.match(/^([0-9]+)/)?.[1] || String(i + 1).padStart(2, "0");
        const isMaster = fileName.startsWith("00_");

        let resolvedStatus: PhaseStatus = "pending";
        if (prev?.status && prev.status !== "running") {
          resolvedStatus = prev.status;
        } else if (noteRec?.status) {
          resolvedStatus = noteRec.status;
        }

        const isEnabled = enabledMap.has(fileName) ? enabledMap.get(fileName)! : (prev ? prev.enabled : true);

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
    } catch (e) {
      this.logPipeline(`Note: 'analysis' directory not found in ${this.workspaceRoot}`);
    }

    // Legacy fallback: if no 00_ in analysis/, check agent/INSTRUCT.md (or prompts/INSTRUCT.md)
    if (!hasSetupInAnalysis) {
      let instructRel = "agent/INSTRUCT.md";
      let instructPath = path.join(this.workspaceRoot, "agent", "INSTRUCT.md");
      try {
        await fs.stat(instructPath);
      } catch {
        instructRel = "prompts/INSTRUCT.md";
        instructPath = path.join(this.workspaceRoot, "prompts", "INSTRUCT.md");
      }

      try {
        await fs.stat(instructPath);
        const prev = existingMap.get(instructRel) || existingMap.get("agent/INSTRUCT.md") || existingMap.get("prompts/INSTRUCT.md");
        const noteRec = notesRecords.get(instructRel) || notesRecords.get("agent/INSTRUCT.md") || notesRecords.get("prompts/INSTRUCT.md") || notesRecords.get("INSTRUCT.md");
        let resolvedStatus: PhaseStatus = "pending";
        if (prev?.status && prev.status !== "running") {
          resolvedStatus = prev.status;
        } else if (noteRec?.status) {
          resolvedStatus = noteRec.status;
        }

        const isEnabled = enabledMap.has(instructRel)
          ? enabledMap.get(instructRel)!
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
      } catch {
        // no instruct.md
      }
    }

    this.phases = newPhases;
    await this.notifyState();
  }

  public async getPromptFiles(): Promise<PromptFileInfo[]> {
    let agentDir = "agent";
    try {
      await fs.stat(path.join(this.workspaceRoot, "agent"));
    } catch {
      agentDir = "prompts";
    }

    const list: { name: string; relPath: string }[] = [
      { name: "Analysis Protocol", relPath: `${agentDir}/PROTOCOL.md` },
      { name: "Experiment & Dataset Spec", relPath: "docs/experiment.md" },
      { name: "Shared Memory", relPath: "docs/notes.md" },
      { name: "Active Model Summary", relPath: "docs/llm.md" },
      { name: "Pipeline Summary", relPath: "logs/pipeline.md" }
    ];

    // Discover per-phase chat.md and console.log files
    try {
      const logsDir = path.join(this.workspaceRoot, "logs");
      const entries = await fs.readdir(logsDir, { withFileTypes: true });
      for (const ent of entries) {
        if (ent.isDirectory()) {
          const phaseDir = ent.name;
          const chatRel = `logs/${phaseDir}/chat.md`;
          const consoleRel = `logs/${phaseDir}/console.log`;
          list.push({ name: `${phaseDir} Chat Trace`, relPath: chatRel });
          list.push({ name: `${phaseDir} Console Log`, relPath: consoleRel });
        }
      }
    } catch {}

    // Backward-compatibility: if legacy logs/llm_chat.md exists
    try {
      await fs.stat(path.join(this.workspaceRoot, "logs/llm_chat.md"));
      list.push({ name: "Legacy LLM Chat Log", relPath: "logs/llm_chat.md" });
    } catch {}

    // If optional BIOLOGY.md exists, include it
    try {
      await fs.stat(path.join(this.workspaceRoot, `${agentDir}/BIOLOGY.md`));
      list.splice(1, 0, { name: "Curated Biological Context", relPath: `${agentDir}/BIOLOGY.md` });
    } catch {}

    // If legacy VARIABLES.md exists, include it
    try {
      await fs.stat(path.join(this.workspaceRoot, `${agentDir}/VARIABLES.md`));
      list.splice(1, 0, { name: "Legacy Dataset Variables", relPath: `${agentDir}/VARIABLES.md` });
    } catch {}

    const result: PromptFileInfo[] = [];
    for (const item of list) {
      let exists = false;
      try {
        await fs.stat(path.join(this.workspaceRoot, item.relPath));
        exists = true;
      } catch {
        exists = false;
      }
      result.push({ ...item, exists });
    }
    return result;
  }

  public getPhases(): PhaseInfo[] {
    return [...this.phases];
  }

  public togglePhase(phaseId: string, enabled: boolean) {
    const phase = this.phases.find((p) => p.id === phaseId);
    if (phase) {
      phase.enabled = enabled;
      this.notifyState();
    }
  }

  public async addPhase(fileName: string, title?: string): Promise<string> {
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

  public async removePhase(phaseId: string): Promise<void> {
    const idx = this.phases.findIndex((p) => p.id === phaseId);
    if (idx !== -1) {
      const phase = this.phases[idx];
      if (!phase.isMasterSetup) {
        try {
          await fs.unlink(path.join(this.workspaceRoot, "analysis", phase.fileName));
        } catch {
          // ignore if already deleted
        }
      }
      this.phases.splice(idx, 1);
      await this.notifyState();
    }
  }

  public async getFoldersStatus(): Promise<FolderStatus[]> {
    let agentFolder = "agent";
    try {
      await fs.stat(path.join(this.workspaceRoot, "agent"));
    } catch {
      agentFolder = "prompts";
    }

    const list = [
      { name: "analysis", relPath: "analysis", description: "Phase Prompts (00_INSTALL.md .. 11_SYNTHESIS.md)" },
      { name: agentFolder, relPath: agentFolder, description: "Protocol, Variables & Skills (Cached Prefix)" },
      { name: "code", relPath: "code", description: "Generated Analysis Scripts" },
      { name: "tools", relPath: "tools", description: "Linter & Execution Helper Utilities" },
      { name: "docs", relPath: "docs", description: "Shared Memory (notes.md, llm.md) & Experiment Design" },
      { name: "logs", relPath: "logs", description: "Phase Chat Traces & Console Logs (logs/<phase>/)" },
      { name: "data", relPath: "data", description: "Raw Input Proteomics Data" },
    ];

    const result: FolderStatus[] = [];
    if (!this.workspaceRoot) return result;

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
      } catch {
        exists = false;
      }
      result.push({ ...item, exists, itemCount });
    }
    return result;
  }

  public async getState(): Promise<PipelineState> {
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
    const isAnalysisMissingOrEmpty =
      !this.workspaceRoot ||
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
      literature: readLiteratureConfig(this.workspaceRoot),
      knowledgeCorpus: readLiteratureConfig(this.workspaceRoot),
    };
  }

  private async notifyState() {
    try {
      const state = await this.getState();
      this.onStateChange(state);
    } catch (err) {
      console.error("[PipelineOrchestrator] Error in notifyState:", err);
    }
  }

  public stop() {
    this.shouldStop = true;
    this.isFullPipelineRunning = false;
    for (const p of this.phases) {
      if (p.status === "running") {
        p.status = "failed";
        p.error = "Stopped by user";
      }
    }
    this.isRunning = false;
    this.logPipeline("Execution stopped by user.");
    this.notifyState();
  }

  /**
   * Prunes records from docs/notes.md for a given phase and all downstream phases.
   * This ensures that restarting a step clears obsolete blackboard context for the LLM.
   */
  public async pruneNotesFromPhase(startIndex: number): Promise<void> {
    if (!this.workspaceRoot) return;
    const targetPhases = this.phases.slice(startIndex);
    if (targetPhases.length === 0) return;

    const filesToRemove = new Set<string>();
    for (const p of targetPhases) {
      if (!p.enabled) continue; // NEVER prune notes for disabled/unchecked completed phases!
      filesToRemove.add(p.fileName);
      filesToRemove.add(path.basename(p.fileName));
      if (p.isMasterSetup) {
        filesToRemove.add("agent/INSTRUCT.md");
        filesToRemove.add("prompts/INSTRUCT.md");
        filesToRemove.add("INSTRUCT.md");
      }
    }

    if (filesToRemove.size === 0) return;

    const notesPath = path.join(this.workspaceRoot, "docs", "notes.md");
    try {
      const content = await fs.readFile(notesPath, "utf-8");
      const sections = content.split(/\n(?=###\s+)/);
      const kept: string[] = [];

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
    } catch {
      // notes.md may not exist yet
    }
  }

  /**
   * Run a single phase in isolation with automatic cascading reset of downstream phases
   */
  public async runSinglePhase(phaseId: string) {
    if (this.isRunning) {
      this.logPipeline("Execution busy: A pipeline or phase is already running. Please wait or stop it first.");
      return;
    }
    const phaseIndex = this.phases.findIndex((p) => p.id === phaseId);
    if (phaseIndex === -1) {
      this.logPipeline(`Phase ID '${phaseId}' not found.`);
      return;
    }

    // Immediately acquire lock before any async awaits
    this.isRunning = true;
    this.isFullPipelineRunning = false;
    this.shouldStop = false;

    // Invalidate target phase and all downstream ENABLED phases
    for (let i = phaseIndex; i < this.phases.length; i++) {
      const p = this.phases[i];
      if (i !== phaseIndex && !p.enabled) continue;
      if (i === phaseIndex) {
        p.status = "running";
        p.startTime = new Date().toISOString();
        p.endTime = undefined;
        p.durationSeconds = undefined;
        p.tokenUsage = undefined;
        p.summary = undefined;
        p.error = undefined;
      } else {
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

    try {
      await this.executePhase(phaseIndex);
    } catch (err: any) {
      this.logPipeline(`Error running phase ${phaseId}: ${err.message}`);
    } finally {
      this.isRunning = false;
      this.isFullPipelineRunning = false;
      await this.notifyState();
    }
  }

  /**
   * Intelligently resume execution from the first incomplete/failed phase (or a specified phase),
   * running sequentially through all remaining downstream phases.
   */
  public async resumePipeline(fromPhaseId?: string): Promise<void> {
    if (this.isRunning) {
      this.logPipeline("Execution busy: A pipeline or phase is already running. Please wait or stop it first.");
      return;
    }
    if (!this.workspaceRoot || this.phases.length === 0) {
      this.logPipeline("No analysis tasks found to execute. Please initialize an analysis pipeline first.");
      return;
    }

    let startIndex = -1;
    if (fromPhaseId) {
      startIndex = this.phases.findIndex((p) => p.id === fromPhaseId || p.fileName.includes(fromPhaseId));
      if (startIndex !== -1 && !this.phases[startIndex].enabled) {
        this.phases[startIndex].enabled = true;
      }
    }

    if (startIndex === -1) {
      // Find the first ENABLED phase that is not completed (failed, pending, or running)
      startIndex = this.phases.findIndex((p) => p.enabled && p.status !== "completed");
    }

    if (startIndex === -1) {
      // If all enabled phases are completed, find the first enabled phase to allow re-running
      startIndex = this.phases.findIndex((p) => p.enabled);
    }

    if (startIndex === -1) {
      this.logPipeline("No enabled analysis tasks found to execute. Please enable at least one task in the pipeline list.");
      return;
    }

    // Immediately acquire lock before any async awaits
    this.isRunning = true;
    this.isFullPipelineRunning = true;
    this.shouldStop = false;

    const startPhase = this.phases[startIndex];
    const hasAnyCompleted = this.phases.some((p) => p.status === "completed");
    const resumeVerb = (startIndex === 0 && !hasAnyCompleted) ? "Starting" : "Resuming";
    this.logPipeline(`${resumeVerb} autonomous pipeline at ${new Date().toLocaleTimeString()} from Phase ${startPhase.id} (${startPhase.title})`);
    this.logPipeline(`Working Directory: ${this.workspaceRoot}`);

    // Invalidate target phase and all downstream ENABLED phases so UI shows pending
    for (let i = startIndex; i < this.phases.length; i++) {
      const p = this.phases[i];
      if (!p.enabled) continue; // NEVER invalidate or reset disabled phases!
      p.status = "pending";
      p.startTime = undefined;
      p.endTime = undefined;
      p.durationSeconds = undefined;
      p.tokenUsage = undefined;
      p.summary = undefined;
      p.error = undefined;
    }

    await this.pruneNotesFromPhase(startIndex);
    await this.notifyState();

    try {
      for (let i = startIndex; i < this.phases.length; i++) {
        if (this.shouldStop) {
          this.logPipeline("Execution stopped by user.");
          break;
        }

        const phase = this.phases[i];
        if (!phase.enabled) {
          this.logPipeline(`Skipping disabled phase: ${phase.title}`);
          continue;
        }

        await this.pruneNotesFromPhase(i);

        const success = await this.executePhase(i);
        if (!success) {
          this.logPipeline(`Pipeline paused due to checkpoint failure in ${phase.title}`);
          break;
        }
      }
    } catch (err: any) {
      this.logPipeline(`Full pipeline error: ${err.message}`);
    } finally {
      this.isRunning = false;
      this.isFullPipelineRunning = false;
      this.shouldStop = false;
      await this.notifyState();
    }
  }

  /**
   * Force a complete restart of the pipeline from Phase 0
   */
  public async restartPipeline(): Promise<void> {
    return this.runFullPipeline(true);
  }

  /**
   * Run the complete multi-phase pipeline sequentially.
   * If not forced from beginning, automatically resumes from the first incomplete phase.
   */
  public async runFullPipeline(forceFromBeginning = false) {
    if (this.isRunning) {
      this.logPipeline("Execution busy: A pipeline is already running.");
      return;
    }

    if (!forceFromBeginning) {
      const enabledPhases = this.phases.filter((p) => p.enabled);
      const hasCompleted = this.phases.some((p) => p.status === "completed");
      const hasIncomplete = enabledPhases.some((p) => p.status !== "completed");
      if (hasCompleted || hasIncomplete) {
        return this.resumePipeline();
      }
    }

    if (!this.workspaceRoot || this.phases.length === 0) {
      this.logPipeline("No analysis tasks found to execute. Please initialize an analysis pipeline first.");
      return;
    }

    // Immediately acquire lock before any async awaits
    this.isRunning = true;
    this.isFullPipelineRunning = true;
    this.shouldStop = false;

    // If forcing restart from beginning, reset all enabled phases to pending
    for (const p of this.phases) {
      if (!p.enabled) continue;
      p.status = "pending";
      p.startTime = undefined;
      p.endTime = undefined;
      p.durationSeconds = undefined;
      p.tokenUsage = undefined;
      p.summary = undefined;
      p.error = undefined;
    }
    await this.notifyState();

    this.logPipeline(`Starting autonomous run at ${new Date().toLocaleTimeString()}`);
    this.logPipeline(`Working Directory: ${this.workspaceRoot}`);

    try {
      for (let i = 0; i < this.phases.length; i++) {
        if (this.shouldStop) {
          this.logPipeline("Execution stopped by user.");
          break;
        }

        const phase = this.phases[i];
        if (!phase.enabled) {
          this.logPipeline(`Skipping disabled phase: ${phase.title}`);
          continue;
        }

        // Prune any existing note for phase i before executing it
        await this.pruneNotesFromPhase(i);

        const success = await this.executePhase(i);
        if (!success) {
          this.logPipeline(`Pipeline paused due to checkpoint failure in ${phase.title}`);
          break;
        }
      }
    } catch (err: any) {
      this.logPipeline(`Full pipeline error: ${err.message}`);
    } finally {
      this.isRunning = false;
      this.isFullPipelineRunning = false;
      this.shouldStop = false;
      await this.notifyState();
    }
  }

  private async executePhase(index: number): Promise<boolean> {
    const targetId = this.phases[index]?.id;
    const getActivePhase = (): PhaseInfo => {
      if (targetId) {
        const found = this.phases.find((p) => p.id === targetId);
        if (found) return found;
      }
      return this.phases[index];
    };

    const phase = getActivePhase();
    if (!phase) return false;

    const phaseTag = path.basename(phase.fileName).replace(/\.md$/i, "");
    const cleanTitle = (phase.title || "").replace(/^Phase\s+\d+:\s*/i, "").trim();
    this.chatLogger.setPhase(phase.fileName);

    phase.status = "running";
    phase.startTime = new Date().toISOString();
    phase.endTime = undefined;
    phase.error = undefined;
    if (!phase.tokenUsage) {
      phase.tokenUsage = { promptTokens: 0, completionTokens: 0, totalTokens: 0, cachedPromptTokens: 0 };
    }
    const startTimeMs = Date.now();
    await this.notifyState();

    this.logPhase(phaseTag, `[Starting] ${cleanTitle} (${phase.fileName})`);

    let loop: AgentLoop | undefined;
    try {
      try {
        await writeActiveModelSummaryFile(this.workspaceRoot, this.client.getConfig(), this.extensionVersion);
      } catch (err) {
        console.warn("[PipelineOrchestrator] Could not write docs/llm.md before phase execution:", err);
      }

      const contextBuilder = new ContextBuilder(this.workspaceRoot);
      const context = await contextBuilder.buildPhaseContext(phase.fileName);

      let lastToolPendingText = "";

      loop = new AgentLoop(
        phase.fileName,
        phase.title,
        this.client,
        this.tools,
        context,
        async (event) => {
          if (event.type === "thought") {
            const raw = String(event.data || "").trim();
            const turnMatch = raw.match(/Starting Turn\s+(\d+\/\d+)\.{0,3}/i);
            if (turnMatch) {
              this.logPhase(phaseTag, `Turn ${turnMatch[1]} ...`);
            } else {
              const cleanData = raw.replace(/^[⚠️🔄❌✓💡]\s*/g, "").trim();
              this.logPhase(phaseTag, cleanData);

              const obsMatch = raw.match(/^(?:💡\s*)?(?:Observation|Finding|Key Observation|Discovery):\s*(.+)$/i);
              if (obsMatch) {
                this.onAgentObservation?.(phase, obsMatch[1], { badge: "Observation" });
              }
            }
          } else if (event.type === "text") {
            // Raw context stream is logged to logs/<phase>/chat.md by chatLogger; live terminal feed displays timestamped headers only
          } else if (event.type === "tool_start") {
            const rawHeader = this.formatToolHeader(event.data.name, event.data.args);
            const prefix = `[${this.ts()}] ${phaseTag}: `;
            // Keep total line including completion suffix (" ...  ✓ [completed]" ~ 18 chars) under 100 chars
            const maxBodyLen = Math.max(25, 100 - prefix.length - 18);
            let body = rawHeader;
            if (body.length > maxBodyLen) {
              body = body.slice(0, maxBodyLen - 3).trim();
            }
            if (body.endsWith("...")) {
              body = body.slice(0, -3).trim();
            }
            lastToolPendingText = `${prefix}${body} ...`;
            this.onLog(lastToolPendingText, false);

            // Stream continuous live activity paraphrase to the Agent panel
            const naturalAction = this.formatNaturalActivity(event.data.name, event.data.args, cleanTitle);
            this.onAgentActivity?.(phase, naturalAction);
          } else if (event.type === "tool_end") {
            const base = lastToolPendingText
              ? lastToolPendingText.replace(/\s*\.{3}$/, "")
              : `[${this.ts()}] ${phaseTag}: [${event.data.name}]`;

            if (event.data.isError) {
              this.onLog(`${base} ... ❌  [failed]`, true);
              let failSnippet = "failed";
              if (event.data.result) {
                const firstLine = String(event.data.result).trim().split("\n")[0].trim();
                if (firstLine && !firstLine.startsWith("{") && firstLine.length < 50) {
                  failSnippet = `failed: ${firstLine.replace(/^Error:\s*/i, "")}`;
                }
              }
              this.logPhase(phaseTag, `❌  ${failSnippet}`, false);
            } else {
              this.onLog(`${base} ...  ✓ [completed]`, true);

              // Extract stage observations and stream to the Agent panel
              if (event.data.name === "complete_phase") {
                const summary = event.data.args?.summary || "Phase objectives and quality gates successfully passed.";
                this.onAgentObservation?.(phase, summary, { badge: `Phase ${phase.id} Complete` });
              } else if (event.data.name === "fail_phase") {
                const reason = event.data.args?.reason || "Pipeline checkpoint pause.";
                this.onAgentObservation?.(phase, `⚠️ Halted: ${reason}`, { badge: "Action Required" });
              } else {
                const obs = this.extractToolObservation(event.data.name, event.data.args, event.data.result);
                if (obs) {
                  this.onAgentObservation?.(phase, obs.text, { badge: obs.badge });
                }
              }
            }
            lastToolPendingText = "";
          } else if (event.type === "tokens") {
            const currentPhase = getActivePhase();
            currentPhase.tokenUsage = { ...event.data.totalUsage };
            await this.notifyState();
          }
        },
        this.chatLogger,
        () => this.shouldStop
      );

      const maxTurns = vscode.workspace.getConfiguration("tidyproteomicsagent").get<number>("maxTurns") || 30;
      const result = await loop.run(maxTurns);
      const durationSeconds = Math.max(1, Math.round((Date.now() - startTimeMs) / 1000));
      const currentPhase = getActivePhase();

      currentPhase.endTime = new Date().toISOString();
      currentPhase.durationSeconds = durationSeconds;
      currentPhase.tokenUsage = result.tokensUsed;
      currentPhase.summary = result.summary;

      if (result.success) {
        currentPhase.status = "completed";
        this.logPhase(
          phaseTag,
          `[Completed] ${cleanTitle} in ${durationSeconds}s (${result.tokensUsed.totalTokens.toLocaleString()} tokens)`
        );

        // Update docs/notes.md with phase record
        await this.appendPhaseRecordToNotes(currentPhase);
        await this.notifyState();
        return true;
      } else {
        currentPhase.status = "failed";
        currentPhase.error = result.summary;
        const summaryText = String(result.summary || "Phase failed").trim();
        const lines = summaryText.split("\n");
        const firstLine = lines[0];
        this.logPhase(phaseTag, `❌ [Failed] ${cleanTitle}: ${firstLine}`);
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (line) {
            this.logPhase(phaseTag, `  ${line}`);
          }
        }
        await this.appendPhaseRecordToNotes(currentPhase);
        await this.notifyState();
        return false;
      }
    } catch (err: any) {
      const currentPhase = getActivePhase();
      currentPhase.status = "failed";
      currentPhase.error = err.message;
      if (loop && (!currentPhase.tokenUsage || currentPhase.tokenUsage.totalTokens === 0)) {
        currentPhase.tokenUsage = loop.getTotalUsage();
      }
      this.logPhase(phaseTag, `❌ Error in ${cleanTitle}: ${err.message}`);
      await this.notifyState();
      return false;
    }
  }

  private async appendPhaseRecordToNotes(phase: PhaseInfo) {
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
      } catch {
        current = `# Autonomous Proteomics Analysis Notes\nModel: ${this.client.getConfig().model}\n\n`;
      }

      // Standardize note ownership and eliminate duplicate entries:
      // If docs/notes.md already contains an entry for this phase title, replace it so exactly one entry exists.
      const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const titlePattern = new RegExp(
        `(\\n*###\\s*${escapeRegExp(phase.title)}[\\s\\S]*?(?=\\n###|\\n---\\s*\\n###|$)(?:\\n---\\s*\\n)?)`,
        "i"
      );

      if (titlePattern.test(current)) {
        current = current.replace(titlePattern, entry);
      } else {
        current = current.trimEnd() + "\n" + entry;
      }

      await fs.writeFile(notesPath, current, "utf-8");
    } catch (e) {
      this.logPipeline(`Warning: Failed to update docs/notes.md: ${e}`);
    }
  }
}
