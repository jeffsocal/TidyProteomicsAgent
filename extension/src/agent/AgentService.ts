import * as fs from "fs/promises";
import * as fsSync from "fs";
import * as path from "path";
import { ChatMessage, PhaseInfo, PipelineState, TokenUsage, ToolDefinition } from "../types";
import { ProviderClient } from "../llm/ProviderClient";
import { ExperimentManager, ExperimentSpec } from "./ExperimentManager";

export interface AgentMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  quickChips?: string[];
}

export type AdvisorMessage = AgentMessage;

export class AgentService {
  private messages: AgentMessage[] = [];
  private isBusy = false;
  private abortRequested = false;
  private experimentManager: ExperimentManager;
  private lastHaltedPhaseId?: string;
  private lastSuggestedContrast?: string;
  private phaseEventsPosted = new Set<string>();

  constructor(
    private workspaceRoot: string,
    private client: ProviderClient,
    private getPipelineState?: () => Promise<PipelineState | undefined>,
    private onStartPipeline?: (phaseId?: string) => Promise<void>,
    private onAgentUpdated?: () => void,
    extensionUriPath?: string,
    private onResumePipeline?: (fromPhaseId?: string) => Promise<void>,
    private onStopPipeline?: () => Promise<void> | void,
    private onRestartPipeline?: () => Promise<void>
  ) {
    this.workspaceRoot = workspaceRoot || "";
    this.experimentManager = new ExperimentManager(this.workspaceRoot, extensionUriPath);
  }

  private notifyUpdated() {
    if (this.onAgentUpdated) this.onAgentUpdated();
  }

  public async triggerResume(phaseId?: string) {
    if (this.onResumePipeline) {
      await this.onResumePipeline(phaseId);
    } else if (this.onStartPipeline) {
      await this.onStartPipeline(phaseId);
    }
  }

  public async triggerRestart() {
    if (this.onRestartPipeline) {
      await this.onRestartPipeline();
    } else if (this.onStartPipeline) {
      await this.onStartPipeline(undefined);
    }
  }

  public async triggerStop() {
    if (this.onStopPipeline) {
      await this.onStopPipeline();
    }
  }

  public setWorkspaceRoot(newRoot: string) {
    this.workspaceRoot = newRoot || "";
    this.experimentManager.setWorkspaceRoot(this.workspaceRoot);
  }

  public getExperimentManager(): ExperimentManager {
    return this.experimentManager;
  }

  public getMessages(): AgentMessage[] {
    return [...this.messages];
  }

  public isRunning(): boolean {
    return this.isBusy;
  }

  public cancel() {
    if (this.isBusy) {
      this.abortRequested = true;
    }
  }

  public async clearMessages(): Promise<void> {
    this.messages = [];
  }

  private async readFileSafe(relPath: string): Promise<string> {
    try {
      if (!this.workspaceRoot) return "";
      const fullPath = path.isAbsolute(relPath) ? relPath : path.join(this.workspaceRoot, relPath);
      return await fs.readFile(fullPath, "utf-8");
    } catch {
      return "";
    }
  }

  /**
   * Defines agentic tools available to the Agent for configuring experiment.md and driving execution.
   */
  private getAgentTools(): ToolDefinition[] {
    return [
      {
        name: "update_experiment_parameters",
        description: "Updates Section 1 of docs/experiment.md with the dataset file path, search platform, or analyte.",
        parameters: {
          type: "object",
          properties: {
            pathToDataFile: {
              type: "string",
              description: "Filesystem path or HTTP/HTTPS URL to the dataset file (e.g. data/raw/tmt_proteins.xlsx or data/raw/tidyproteomics_data.rds)",
            },
            platform: {
              type: "string",
              description: "Search platform or data type: ProteomeDiscoverer, MaxQuant, DIA-NN, Spectronaut, FragPipe, or tidyproteomics / rds",
            },
            analyte: {
              type: "string",
              description: "Type of analyte measured: 'proteins' or 'peptides'",
            },
          },
          required: [],
        },
      },
      {
        name: "update_experiment_description",
        description: "Updates Section 2 of docs/experiment.md with the study hypothesis, biological model, treatment/control conditions, and key questions.",
        parameters: {
          type: "object",
          properties: {
            description: {
              type: "string",
              description: "Comprehensive scientific hypothesis and experiment design description",
            },
          },
          required: ["description"],
        },
      },
      {
        name: "update_sample_renaming",
        description: "Updates Section 3B of docs/experiment.md to pool or rename raw sample groups into clean biological cohorts (e.g. mapping batch tags into clean treatment/control groups).",
        parameters: {
          type: "object",
          properties: {
            sampleMapping: {
              type: "object",
              description: "Key-value dictionary mapping raw sample group names to cleaned group names, e.g. { 'active_batch5': 'active', 'healthy_batch8': 'healthy' }",
            },
          },
          required: ["sampleMapping"],
        },
      },
      {
        name: "update_target_contrasts",
        description: "Updates Section 3C of docs/experiment.md with pairwise contrast comparisons (e.g. ['Disease vs Control']).",
        parameters: {
          type: "object",
          properties: {
            contrasts: {
              type: "array",
              items: { type: "string" },
              description: "Array of pairwise contrasts, e.g. ['Disease vs Control'] or ['Treated vs Untreated']",
            },
          },
          required: ["contrasts"],
        },
      },
      {
        name: "authorize_batch_confounding",
        description: "Updates Section 3D of docs/experiment.md to authorize Proceed With Potential Batch Confounding (TRUE or FALSE).",
        parameters: {
          type: "object",
          properties: {
            authorized: {
              type: "boolean",
              description: "Whether to authorize proceeding with unadjusted exploratory comparison despite batch confounding",
            },
          },
          required: ["authorized"],
        },
      },
      {
        name: "start_or_resume_pipeline",
        description: "Triggers or resumes execution of the autonomous analysis pipeline when initial configuration is satisfied or when a halted phase's questions have been resolved.",
        parameters: {
          type: "object",
          properties: {
            phaseId: {
              type: "string",
              description: "Optional specific phase ID to rerun/resume, or omit to run the full pipeline",
            },
            reason: {
              type: "string",
              description: "Reason why the pipeline is starting or resuming",
            },
          },
          required: ["reason"],
        },
      },
      {
        name: "resume_pipeline",
        description: "Resumes execution of the autonomous analysis pipeline from the first incomplete phase or a specified phase.",
        parameters: {
          type: "object",
          properties: {
            fromPhase: {
              type: "string",
              description: "Optional specific phase ID to resume from (e.g. '04_expression'), or omit to resume from current checkpoint.",
            },
            reason: {
              type: "string",
              description: "Reason why the pipeline is resuming",
            },
          },
          required: [],
        },
      },
      {
        name: "restart_pipeline",
        description: "Restarts the entire autonomous analysis pipeline from Phase 0 from scratch.",
        parameters: {
          type: "object",
          properties: {
            reason: {
              type: "string",
              description: "Reason for restarting the pipeline",
            },
          },
          required: [],
        },
      },
      {
        name: "stop_pipeline",
        description: "Pauses or stops the currently executing autonomous pipeline.",
        parameters: {
          type: "object",
          properties: {
            reason: {
              type: "string",
              description: "Reason for stopping the pipeline",
            },
          },
          required: [],
        },
      },
      {
        name: "get_pipeline_status",
        description: "Fetches current pipeline execution status, completed phases, and error details.",
        parameters: {
          type: "object",
          properties: {},
          required: [],
        },
      },
    ];
  }

  /**
   * Checks docs/experiment.md and generates proactive onboarding questions if initial setup is incomplete.
   */
  public async checkAndTriggerOnboarding(): Promise<boolean> {
    if (!this.workspaceRoot) return false;
    const spec = await this.experimentManager.readSpec();

    if (spec.missingInitialFields.length > 0) {
      if (this.messages.length === 0) {
        const firstMissing = spec.missingInitialFields[0];
        let promptText = "";
        let chips: string[] = [];

        if (firstMissing === "PATH_TO_DATA_FILE") {
          promptText = "👋 **Welcome to TidyProteomicsAgent!**\n\nI am your **Live Agent**. Before starting the pipeline, let's configure your experiment.\n\n👉 **Question 1/4**: What is the file path or URL to your proteomics data file? *(e.g. `data/raw/ProteomeDiscoverer_proteins.xlsx` or `data/raw/data.rds`)*";
          chips = ["data/raw/tidyproteomics_data.rds", "Select File..."];
        } else if (firstMissing === "PLATFORM") {
          promptText = "👉 **Question 2/4**: Which mass spectrometry search platform generated this data?";
          chips = ["ProteomeDiscoverer", "MaxQuant", "DIA-NN", "Spectronaut", "FragPipe", "tidyproteomics"];
        } else if (firstMissing === "ANALYTE") {
          promptText = "👉 **Question 3/4**: Is this dataset measuring `proteins` or `peptides`?";
          chips = ["proteins", "peptides"];
        } else if (firstMissing === "DESCRIPTION") {
          promptText = "👉 **Question 4/4**: Could you briefly describe this experiment? *(e.g. biological model, treatment conditions, disease vs control groups, and key hypotheses)*";
        }

        this.messages.push({
          id: "msg_onboard_" + Date.now(),
          role: "assistant",
          content: promptText,
          timestamp: new Date().toLocaleTimeString(),
          quickChips: chips,
        });

        this.notifyUpdated();
        return true;
      }
    } else if (this.messages.length === 0) {
      // All initial fields satisfied
      this.messages.push({
        id: "msg_ready_" + Date.now(),
        role: "assistant",
        content: "👋 **Welcome back to TidyProteomicsAgent!**\n\nI reviewed `docs/experiment.md` and confirmed that all initial dataset parameters and your experiment description are configured! 🚀\n\n**Ready to start the autonomous analysis pipeline?**",
        timestamp: new Date().toLocaleTimeString(),
        quickChips: ["⚡ Yes, Start Pipeline", "Review docs/experiment.md ↗"],
      });

      this.notifyUpdated();
      return true;
    }

    return false;
  }

  /**
   * Pushes a real-time activity card into the Agent chat when a phase starts execution.
   */
  public handlePhaseStarted(phase: PhaseInfo): void {
    const key = `started_${phase.id}_${phase.startTime || Date.now()}`;
    if (this.phaseEventsPosted.has(key)) return;
    this.phaseEventsPosted.add(key);

    const title = phase.title || phase.fileName;
    const msg: AgentMessage = {
      id: "msg_start_" + phase.id + "_" + Date.now(),
      role: "assistant",
      content: `▶ **[Starting Phase ${phase.id}]** ${title}`,
      timestamp: new Date().toLocaleTimeString(),
    };
    this.messages.push(msg);
    this.notifyUpdated();
  }

  /**
   * Called when a phase completes successfully.
   * Pushes a completion summary card into Agent chat.
   */
  public async handlePhaseCompleted(phase: PhaseInfo): Promise<boolean> {
    if (this.lastHaltedPhaseId === phase.id) {
      this.lastHaltedPhaseId = undefined;
    }
    const key = `completed_${phase.id}_${phase.endTime || Date.now()}`;
    if (!this.phaseEventsPosted.has(key)) {
      this.phaseEventsPosted.add(key);
      const title = phase.title || phase.fileName;
      const dur = phase.durationSeconds ? `${phase.durationSeconds}s` : "completed";
      const tokens = phase.tokenUsage?.totalTokens ? `${phase.tokenUsage.totalTokens.toLocaleString()} tokens` : "";
      const metrics = [dur, tokens].filter(Boolean).join(", ");

      const msg: AgentMessage = {
        id: "msg_done_" + phase.id + "_" + Date.now(),
        role: "assistant",
        content: `✓ **[Completed Phase ${phase.id}]** ${title}${metrics ? ` (${metrics})` : ""}`,
        timestamp: new Date().toLocaleTimeString(),
      };
      this.messages.push(msg);
      this.notifyUpdated();
    }

    return true;
  }

  /**
   * Pushes an alert card when the entire pipeline finishes.
   */
  public handlePipelineFinished(state: PipelineState): void {
    this.lastHaltedPhaseId = undefined;
    const key = `pipeline_finished_${state.endTime || Date.now()}`;
    if (this.phaseEventsPosted.has(key)) return;
    this.phaseEventsPosted.add(key);

    const totalToks = state.totalTokens?.totalTokens ? state.totalTokens.totalTokens.toLocaleString() : "0";
    const msg: AgentMessage = {
      id: "msg_finished_" + Date.now(),
      role: "assistant",
      content: `🎉 **Autonomous Pipeline Finished**: All phases completed successfully!\n\n• Total Tokens: **${totalToks}**\n• Final Synthesis & Figures compiled in \`docs/\` and \`data/\``,
      timestamp: new Date().toLocaleTimeString(),
      quickChips: ["Review docs/manuscript.md ↗", "📊 Pipeline Status"],
    };
    this.messages.push(msg);
    this.notifyUpdated();
  }

  /**
   * Automatically intercepts a halted or failed pipeline phase and prompts the user in Chat.
   */
  public async handlePhaseHalted(phase: PhaseInfo): Promise<void> {
    const haltKey = `msg_halt_${phase.id}`;
    if (this.lastHaltedPhaseId === phase.id && this.messages.some((m) => m.id === haltKey)) {
      return;
    }
    this.lastHaltedPhaseId = phase.id;
    const errorText = String(phase.error || phase.summary || "").trim();

    let questionPrompt = "";
    let chips: string[] = [];

    const isConfounding = /confound|Proceed With Potential Batch Confounding|Authorize Unadjusted Exploratory Comparison/i.test(errorText);
    const isSampleGrouping = /sample group|recoding|pooling|Section 3\.?B|reassign sample names/i.test(errorText);
    const isContrastNeeded = /contrast|target contrast|disease\/control|Section 3\.?C/i.test(errorText);

    if (phase.id === "04" && (isConfounding || isContrastNeeded)) {
      questionPrompt = `🎯 **Contrast Confirmation & Confounding Authorization in ${phase.title || phase.fileName}**\n\nPhase 4 requires confirmation of target contrasts in Section 3.C and authorization of exploratory linear modeling in Section 3.D.\n\nWould you like to confirm the target contrast and authorize proceeding?`;
      chips = ["🎯 Confirm Contrast & Proceed", "Review docs/experiment.md ↗"];
    } else if (isConfounding) {
      questionPrompt = `⚠️ **Batch Confounding Alert in ${phase.title || phase.fileName}**\n\nThe pipeline detected that biological conditions are correlated with technical processing batches. Linear models cannot mathematically separate batch variance from biology.\n\n**Would you like to authorize an exploratory comparison despite potential batch confounding?**`;
      chips = ["🎯 Confirm Contrast & Proceed", "⚡ Authorize Confounding & Resume", "No, do not proceed"];
    } else if (isSampleGrouping) {
      questionPrompt = `🧪 **Sample Renaming & Grouping Required in ${phase.title || phase.fileName}**\n\nThe ingested dataset contains raw sample names with technical batch tags. How would you like to rename or group these samples? *(e.g., which samples are \`Control\` and which are \`Disease\`?)*`;
      chips = ["Review docs/experiment.md ↗"];
    } else if (isContrastNeeded) {
      questionPrompt = `🎯 **Target Contrast Required in ${phase.title || phase.fileName}**\n\nBefore calculating differential expression, what comparison would you like to test? *(e.g., \`Disease vs Control\` or \`Treated vs Vehicle\`)*`;
      chips = ["🎯 Confirm Contrast & Proceed", "Disease vs Control", "Treatment vs Control"];
    } else {
      const firstLine = errorText.split("\n")[0] || "Phase paused.";
      questionPrompt = `⚠️ **Pipeline Paused in ${phase.title || phase.fileName}**\n\n${firstLine}\n\nHow would you like to resolve this? Tell me what changes to make in \`docs/experiment.md\` or ask for advice.`;
      chips = ["What caused this?", "Check docs/experiment.md ↗"];
    }

    this.messages.push({
      id: haltKey,
      role: "assistant",
      content: questionPrompt,
      timestamp: new Date().toLocaleTimeString(),
      quickChips: chips,
    });

    this.notifyUpdated();
  }

  /**
   * Assembles the live context snapshot from the workspace to empower the agent.
   */
  private async buildSystemPrompt(): Promise<string> {
    const experiment = await this.readFileSafe(path.join("docs", "experiment.md"));
    const notes = await this.readFileSafe(path.join("docs", "notes.md"));
    const llm = await this.readFileSafe(path.join("docs", "llm.md"));

    let pipelineStatusText = "No pipeline state available.";
    if (this.getPipelineState) {
      try {
        const state = await this.getPipelineState();
        if (state && Array.isArray(state.phases) && state.phases.length > 0) {
          pipelineStatusText = state.phases
            .map((p, idx) => {
              const statusStr = (p.status || "pending").toUpperCase();
              let info = `${idx + 1}. [${statusStr}] ${p.title || p.fileName}`;
              if (p.durationSeconds) info += ` (${p.durationSeconds}s)`;
              if (p.error) info += `\n   Error/Warning: ${p.error.slice(0, 300)}`;
              return info;
            })
            .join("\n");
        }
      } catch (err) {
        pipelineStatusText = `Error fetching pipeline state: ${String(err)}`;
      }
    }

    const spec = await this.experimentManager.readSpec();

    return `
You are the **TidyProteomics Agent**, an expert AI computational biologist and mass spectrometry proteomics specialist integrated directly inside VS Code.
You drive the research workflow interactively: you interview the researcher, configure \`docs/experiment.md\` using your tools, answer scientific questions, resolve batch confounding or contrast ambiguities, and start/resume the pipeline.

### CURRENT WORKSPACE STATE & SPECIFICATION:
- **Missing Initial Variables**: ${spec.missingInitialFields.join(", ") || "None (All 4 initialized)"}
- **Data File**: ${spec.pathToDataFile || "Unset"}
- **Platform**: ${spec.platform || "Unset"}
- **Analyte**: ${spec.analyte || "Unset"}
- **Contrasts**: ${spec.targetContrasts.join(", ") || "None defined"}
- **Batch Confounding Authorized**: ${spec.batchConfoundingAuthorized ? "TRUE" : "FALSE"}

#### Active Pipeline Tasks:
\`\`\`text
${pipelineStatusText}
\`\`\`

#### Experimental Specification (docs/experiment.md):
\`\`\`markdown
${experiment || "No docs/experiment.md found."}
\`\`\`

#### Runtime Shared Notes (docs/notes.md):
\`\`\`markdown
${notes ? notes.slice(-3000) : "No runtime notes found."}
\`\`\`

#### Active Model Info (docs/llm.md):
\`\`\`markdown
${llm || "Not specified."}
\`\`\`

#### TidyProteomics Execution Engine:
- **Engine**: Persistent in-memory tidyproteomics R session via Model Context Protocol (MCP).
- **Live In-Memory Workflow**: Automated ingestion (\`tpa_load\`), QC inspection (\`tpa_inspect\`, \`tpa_summary\`), normalization benchmarking (\`tpa_normalize\`), quantitative imputation (\`tpa_impute\`), differential expression (\`tpa_expression\`), pathway enrichment (\`tpa_enrichment\`), and state export (\`tpa_export_state\`).

### AGENT RESPONSIBILITIES & TOOL CALLING:
1. **Interactive Setup**: If initial variables are missing, guide the user step-by-step. When the user provides a dataset path, platform, analyte, or description, invoke the corresponding tool (\`update_experiment_parameters\` or \`update_experiment_description\`) to update \`docs/experiment.md\` immediately!
2. **Launch Permission**: When all 4 initial fields are satisfied, ask the user if they are ready to start. When they confirm (e.g. "yes", "start", "proceed"), call \`start_or_resume_pipeline\`.
3. **Resolve Phase Errors**:
   - If user specifies sample group renaming or pooling, call \`update_sample_renaming\` and resume the pipeline!
   - If user specifies target contrasts (e.g. "disease/control" or "test cancer vs normal"), call \`update_target_contrasts\` and resume the pipeline!
   - If user agrees to proceed despite batch confounding, call \`authorize_batch_confounding(authorized = true)\` and resume the pipeline!
4. **Direct, Clear Explanations**: When calling tools, explain clearly to the user what was saved to \`docs/experiment.md\` and what happens next.
`.trim();
  }

  /**
   * Sends a user query to the agent and streams/returns the response.
   */
  public async sendMessage(
    userText: string,
    onToken?: (chunk: string) => void
  ): Promise<{ reply: string; usage: TokenUsage }> {
    if (this.isBusy) {
      throw new Error("Agent is already generating a response.");
    }

    this.isBusy = true;
    this.abortRequested = false;

    const userMsgId = "msg_" + Date.now() + "_u";
    const userTimestamp = new Date().toLocaleTimeString();
    this.messages.push({
      id: userMsgId,
      role: "user",
      content: userText,
      timestamp: userTimestamp,
    });
    this.notifyUpdated();

    console.log("[AgentService] Received user query:", userText);

    try {
      const trimmed = userText.trim();
      const lower = trimmed.toLowerCase();

      // -------------------------------------------------------------
      // DETERMINISTIC INTENT ROUTER (Tier 1 Fast-Path)
      // -------------------------------------------------------------

      // 1. Stop / Pause Intent
      const isStopIntent =
        /^(?:stop|pause|abort|halt|cancel)(?:\s+(?:the\s+)?pipeline)?$/i.test(trimmed) ||
        /^(?:please\s+)?(?:stop|pause|abort|halt)\b/i.test(trimmed);
      if (isStopIntent) {
        await this.triggerStop();
        const reply = "⏹ **Pipeline Paused**: Execution paused by user.";
        if (onToken) onToken(reply);
        const agentMsg: AgentMessage = {
          id: "msg_" + Date.now() + "_a",
          role: "assistant",
          content: reply,
          timestamp: new Date().toLocaleTimeString(),
          quickChips: ["▶ Resume Pipeline", "📊 Pipeline Status"],
        };
        this.messages.push(agentMsg);
        await this.logAgentTurn(userText, reply);
        this.notifyUpdated();
        return { reply, usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 } };
      }

      // 2. Restart Intent
      const isRestartIntent =
        /^(?:restart|start over|re-run all|run from (?:the )?beginning|run from scratch|restart pipeline)$/i.test(trimmed) ||
        /\b(?:restart|re-run all)\s+(?:the\s+)?pipeline\b/i.test(trimmed);
      if (isRestartIntent) {
        const reply = "🔄 **Restarting Pipeline**: Re-executing all phases from Phase 0...";
        if (onToken) onToken(reply);
        const agentMsg: AgentMessage = {
          id: "msg_" + Date.now() + "_a",
          role: "assistant",
          content: reply,
          timestamp: new Date().toLocaleTimeString(),
        };
        this.messages.push(agentMsg);
        await this.triggerRestart();
        await this.logAgentTurn(userText, reply);
        this.notifyUpdated();
        return { reply, usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 } };
      }

      // 3. Status / Diagnostics Intent
      const isStatusIntent = /^(?:status|pipeline status|how are we doing\??|what phase are we on\??|current status\??)$/i.test(trimmed);
      if (isStatusIntent && this.getPipelineState) {
        const state = await this.getPipelineState();
        let statusReply = "📊 **Autonomous Pipeline Status**:\n\n";
        if (state && Array.isArray(state.phases) && state.phases.length > 0) {
          const phasesList = state.phases.map((p, idx) => {
            const icon = p.status === "completed" ? "✓" : p.status === "failed" ? "❌" : p.status === "running" ? "▶" : "⏳";
            let s = `${icon} **Phase ${p.id}**: ${p.title || p.fileName} (${p.status.toUpperCase()})`;
            if (p.durationSeconds) s += ` - ${p.durationSeconds}s`;
            if (p.error) s += `\n   ↳ *Checkpoint/Error*: ${p.error.split("\n")[0]}`;
            return s;
          }).join("\n");
          statusReply += phasesList;
          const totalToks = state.totalTokens?.totalTokens || 0;
          statusReply += `\n\n**Total Tokens**: ${totalToks.toLocaleString()}`;
        } else {
          statusReply += "No active pipeline phases found.";
        }
        if (onToken) onToken(statusReply);
        const agentMsg: AgentMessage = {
          id: "msg_" + Date.now() + "_a",
          role: "assistant",
          content: statusReply,
          timestamp: new Date().toLocaleTimeString(),
          quickChips: ["▶ Resume Pipeline", "Review docs/experiment.md ↗"],
        };
        this.messages.push(agentMsg);
        await this.logAgentTurn(userText, statusReply);
        this.notifyUpdated();
        return { reply: statusReply, usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 } };
      }

      const isAuthorizeAffirmative = /^(authorize|authorize and resume|authorize confounding|yes,? authorize|yes,? proceed|⚡ authorize confounding & resume)$/i.test(lower);
      const isConfirmContrastAffirmative =
        /^(🎯\s*)?confirm contrast(?:\s*(&|and)\s*proceed)?$/i.test(trimmed) ||
        (/\bconfirm contrast\b/i.test(lower) && /\bproceed\b/i.test(lower)) ||
        /\bconfirm.*contrast.*proceed\b/i.test(lower);

      // 4. Direct handling of initial onboarding interview questions
      const preSpec = await this.experimentManager.readSpec();
      if (preSpec.missingInitialFields.length > 0) {
        const step = preSpec.missingInitialFields[0];
        let reply = "";
        let chips: string[] = [];

        if (step === "PATH_TO_DATA_FILE") {
          console.log("[AgentService] Saving PATH_TO_DATA_FILE:", trimmed);
          await this.experimentManager.setParameter("PATH_TO_DATA_FILE", trimmed);
          reply = `✅ **Saved Data File**: Configured \`PATH_TO_DATA_FILE: ${trimmed}\` in \`docs/experiment.md\`.\n\n👉 **Question 2/4**: Which mass spectrometry search platform generated this data?`;
          chips = ["ProteomeDiscoverer", "MaxQuant", "DIA-NN", "Spectronaut", "FragPipe", "tidyproteomics"];
        } else if (step === "PLATFORM") {
          console.log("[AgentService] Saving PLATFORM:", trimmed);
          await this.experimentManager.setParameter("PLATFORM", trimmed);
          reply = `✅ **Saved Search Platform**: Configured \`PLATFORM: ${trimmed}\` in \`docs/experiment.md\`.\n\n👉 **Question 3/4**: Is this dataset measuring \`proteins\` or \`peptides\`?`;
          chips = ["proteins", "peptides"];
        } else if (step === "ANALYTE") {
          console.log("[AgentService] Saving ANALYTE:", trimmed);
          await this.experimentManager.setParameter("ANALYTE", trimmed);
          reply = `✅ **Saved Analyte**: Configured \`ANALYTE: ${trimmed}\` in \`docs/experiment.md\`.\n\n👉 **Question 4/4**: Could you briefly describe this experiment? *(e.g. biological model, treatment conditions, disease vs control groups, and key hypotheses)*`;
        } else if (step === "DESCRIPTION") {
          console.log("[AgentService] Saving DESCRIPTION");
          await this.experimentManager.setDescription(trimmed);
          reply = `✅ **Saved Experiment Description**: Updated Section 2 in \`docs/experiment.md\`.\n\n🎉 **All dataset parameters and study description are now configured!** 🚀\n\n**Ready to start the autonomous analysis pipeline?**`;
          chips = ["⚡ Yes, Start Pipeline", "Review docs/experiment.md ↗"];
        }

        if (reply) {
          if (onToken) onToken(reply);
          const agentMsg: AgentMessage = {
            id: "msg_" + Date.now() + "_a",
            role: "assistant",
            content: reply,
            timestamp: new Date().toLocaleTimeString(),
            quickChips: chips.length > 0 ? chips : undefined,
          };
          this.messages.push(agentMsg);
          await this.logAgentTurn(userText, reply);
          this.notifyUpdated();
          return { reply, usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 } };
        }
      }

      // 5. Direct handling of pipeline halt resolutions
      if (isConfirmContrastAffirmative || (this.lastHaltedPhaseId && isAuthorizeAffirmative)) {
        const confirmed = await this.experimentManager.confirmContrastAndAuthorizeConfounding();
        const contrastLabel = confirmed.length > 0 ? ` (\`${confirmed.join(", ")}\`)` : "";
        const reply = `✅ **Confirmed Target Contrast & Authorized Confounding**: Set target contrast${contrastLabel} as confirmed in Section 3.C and set \`Proceed With Potential Batch Confounding: TRUE\` in Section 3.D of \`docs/experiment.md\`.\n\nResuming differential expression analysis (Phase 04)...`;
        if (onToken) onToken(reply);
        const agentMsg: AgentMessage = {
          id: "msg_" + Date.now() + "_a",
          role: "assistant",
          content: reply,
          timestamp: new Date().toLocaleTimeString(),
        };
        this.messages.push(agentMsg);
        const resumeId = this.lastHaltedPhaseId || "04";
        this.lastHaltedPhaseId = undefined;
        this.lastSuggestedContrast = undefined;
        await this.triggerResume(resumeId);
        await this.logAgentTurn(userText, reply);
        this.notifyUpdated();
        return { reply, usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 } };
      }

      if (this.lastHaltedPhaseId) {
        // Contrast input (e.g. "Disease vs Control" or "disease/control" or "Treated vs Vehicle")
        const contrastMatch = trimmed.match(/^([a-zA-Z0-9_-]+)\s*(?:\/|vs\.?|versus)\s*([a-zA-Z0-9_-]+)$/i);
        const isContrastPhase = this.lastHaltedPhaseId.includes("04_expression") || !!this.lastSuggestedContrast;
        if (contrastMatch && isContrastPhase) {
          const contrast = `${contrastMatch[1]} vs ${contrastMatch[2]}`;
          await this.experimentManager.setTargetContrasts([contrast]);
          const reply = `✅ **Configured Target Contrast**: Saved \`- Contrast: ${contrast}\` in \`docs/experiment.md\`.\n\nResuming differential expression analysis now...`;
          if (onToken) onToken(reply);
          const agentMsg: AgentMessage = {
            id: "msg_" + Date.now() + "_a",
            role: "assistant",
            content: reply,
            timestamp: new Date().toLocaleTimeString(),
          };
          this.messages.push(agentMsg);
          const resumeId = this.lastHaltedPhaseId;
          this.lastHaltedPhaseId = undefined;
          this.lastSuggestedContrast = undefined;
          await this.triggerResume(resumeId);
          await this.logAgentTurn(userText, reply);
          this.notifyUpdated();
          return { reply, usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 } };
        }
      }

      // 6. Conversational Start / Resume Affirmative
      const isQuestion = /\?|whats the issue|why did|why is|how do/i.test(lower);
      const isResumeKeyword =
        /^(yes|start|run|proceed|ready|continue|resume|go|go ahead|let'?s go|start pipeline|run pipeline|resume pipeline|yes,? start pipeline|⚡ yes, start pipeline)$/i.test(lower) ||
        /\b(?:please\s+)?(?:proceed|continue)\b/i.test(lower) ||
        /\b(?:start|run|resume)\s+(?:the\s+)?pipeline\b/i.test(lower);

      const isStartAffirmative = !isQuestion && isResumeKeyword;

      if (isStartAffirmative) {
        let state: PipelineState | undefined;
        if (this.getPipelineState) {
          try {
            state = await this.getPipelineState();
          } catch {}
        }

        if (state && Array.isArray(state.phases) && state.phases.length > 0) {
          const activePhases = state.phases.filter((p) => p.enabled !== false);
          const allCompleted = activePhases.length > 0 && activePhases.every((p) => p.status === "completed");
          if (allCompleted) {
            this.lastHaltedPhaseId = undefined;
            const reply = "🎉 All pipeline phases are already completed! To re-run the entire pipeline from scratch, click 'Restart Pipeline' or type 'restart'.";
            if (onToken) onToken(reply);
            const agentMsg: AgentMessage = {
              id: "msg_" + Date.now() + "_a",
              role: "assistant",
              content: reply,
              timestamp: new Date().toLocaleTimeString(),
              quickChips: ["🔄 Restart Pipeline", "Review docs/manuscript.md ↗"],
            };
            this.messages.push(agentMsg);
            await this.logAgentTurn(userText, reply);
            this.notifyUpdated();
            return { reply, usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 } };
          }

          if (this.lastHaltedPhaseId) {
            const haltedPhase = state.phases.find((p) => p.id === this.lastHaltedPhaseId);
            if (haltedPhase && haltedPhase.status === "completed") {
              this.lastHaltedPhaseId = undefined;
            }
          }
        }

        const spec = await this.experimentManager.readSpec();
        if (spec.missingInitialFields.length === 0) {
          const cfg = this.client.getConfig();
          if (cfg.provider !== "ollama" && !cfg.apiKey) {
            const reply = "⚠️ **API Key Required**: Please configure an API Key in the **Provider** tab before launching the autonomous pipeline.";
            if (onToken) onToken(reply);
            const agentMsg: AgentMessage = {
              id: "msg_" + Date.now() + "_a",
              role: "assistant",
              content: reply,
              timestamp: new Date().toLocaleTimeString(),
              quickChips: ["Switch to Provider Tab ↗"],
            };
            this.messages.push(agentMsg);
            this.notifyUpdated();
            return { reply, usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 } };
          }

          let resumeId = this.lastHaltedPhaseId;
          let resumeTitle = "";
          if (state && Array.isArray(state.phases)) {
            if (!resumeId) {
              const incomplete = state.phases.find((p) => p.enabled !== false && p.status !== "completed");
              if (incomplete) {
                resumeId = incomplete.id;
                resumeTitle = incomplete.title;
              } else {
                this.lastHaltedPhaseId = undefined;
                const reply = "🎉 All pipeline phases are already completed! To re-run the entire pipeline from scratch, click 'Restart Pipeline' or type 'restart'.";
                if (onToken) onToken(reply);
                const agentMsg: AgentMessage = {
                  id: "msg_" + Date.now() + "_a",
                  role: "assistant",
                  content: reply,
                  timestamp: new Date().toLocaleTimeString(),
                  quickChips: ["🔄 Restart Pipeline", "Review docs/manuscript.md ↗"],
                };
                this.messages.push(agentMsg);
                await this.logAgentTurn(userText, reply);
                this.notifyUpdated();
                return { reply, usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 } };
              }
            } else {
              const found = state.phases.find((p) => p.id === resumeId);
              if (found) resumeTitle = found.title;
            }
          }

          const targetDisplay = resumeId ? `Phase ${resumeId}${resumeTitle ? ` (${resumeTitle})` : ""}` : "the autonomous pipeline";
          const reply = `🚀 **Resuming Pipeline Execution**: Verification passed. Continuing ${targetDisplay}...`;
          if (onToken) onToken(reply);
          const agentMsg: AgentMessage = {
            id: "msg_" + Date.now() + "_a",
            role: "assistant",
            content: reply,
            timestamp: new Date().toLocaleTimeString(),
          };
          this.messages.push(agentMsg);
          this.lastHaltedPhaseId = undefined;
          this.lastSuggestedContrast = undefined;
          await this.triggerResume(resumeId);
          await this.logAgentTurn(userText, reply);
          this.notifyUpdated();
          return { reply, usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 } };
        }
      }

      // 4. Open-ended conversational or scientific query: verify API key before calling LLM
      const cfg = this.client.getConfig();
      if (cfg.provider !== "ollama" && !cfg.apiKey) {
        const reply = "⚠️ **API Key Required**: To chat with the Live Agent on open-ended scientific topics, please configure an API Key in the **Provider** tab.";
        if (onToken) onToken(reply);
        const agentMsg: AgentMessage = {
          id: "msg_" + Date.now() + "_a",
          role: "assistant",
          content: reply,
          timestamp: new Date().toLocaleTimeString(),
          quickChips: ["Switch to Provider Tab ↗"],
        };
        this.messages.push(agentMsg);
        await this.logAgentTurn(userText, reply);
        this.notifyUpdated();
        return { reply, usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 } };
      }

      const systemPrompt = await this.buildSystemPrompt();

      // Convert conversation history (limit to last 16 turns to keep context snappy)
      const recentMessages = this.messages.slice(-16);
      const chatMessages: ChatMessage[] = recentMessages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      let accumulatedContent = "";
      const tools = this.getAgentTools();

      console.log(`[AgentService] Sending query to ${cfg.provider} (${cfg.model})...`);
      const response = await this.client.chat({
        system: systemPrompt,
        messages: chatMessages,
        tools: tools,
        onToken: (chunk: string) => {
          if (this.abortRequested) return;
          accumulatedContent += chunk;
          if (onToken) onToken(chunk);
        },
      });

      // Execute tool calls if returned
      let executedActionSummary = "";
      let pipelineTriggered = false;
      let resumePhaseId: string | undefined = this.lastHaltedPhaseId;

      if (response.tool_calls && response.tool_calls.length > 0) {
        for (const tc of response.tool_calls) {
          try {
            switch (tc.name) {
              case "update_experiment_parameters": {
                if (tc.args?.pathToDataFile) {
                  await this.experimentManager.setParameter("PATH_TO_DATA_FILE", tc.args.pathToDataFile);
                  executedActionSummary += `\n• Updated \`PATH_TO_DATA_FILE\` to \`${tc.args.pathToDataFile}\``;
                }
                if (tc.args?.platform) {
                  await this.experimentManager.setParameter("PLATFORM", tc.args.platform);
                  executedActionSummary += `\n• Updated \`PLATFORM\` to \`${tc.args.platform}\``;
                }
                if (tc.args?.analyte) {
                  await this.experimentManager.setParameter("ANALYTE", tc.args.analyte);
                  executedActionSummary += `\n• Updated \`ANALYTE\` to \`${tc.args.analyte}\``;
                }
                break;
              }
              case "update_experiment_description": {
                if (tc.args?.description) {
                  await this.experimentManager.setDescription(tc.args.description);
                  executedActionSummary += "\n• Updated Section 2 Experimental Hypothesis & Study Design";
                }
                break;
              }
              case "update_sample_renaming": {
                if (tc.args?.sampleMapping) {
                  await this.experimentManager.setSampleRenamingMap(tc.args.sampleMapping);
                  executedActionSummary += "\n• Configured Sample Group Renaming & Pooling Map in Section 3B";
                  pipelineTriggered = true;
                }
                break;
              }
              case "update_target_contrasts": {
                if (Array.isArray(tc.args?.contrasts) && tc.args.contrasts.length > 0) {
                  await this.experimentManager.setTargetContrasts(tc.args.contrasts);
                  executedActionSummary += `\n• Configured Target Contrasts: ${tc.args.contrasts.join(", ")}`;
                  pipelineTriggered = true;
                }
                break;
              }
              case "authorize_batch_confounding": {
                await this.experimentManager.setBatchConfounding(tc.args?.authorized !== false);
                executedActionSummary += `\n• Set Proceed With Potential Batch Confounding to \`${tc.args?.authorized !== false ? "TRUE" : "FALSE"}\``;
                pipelineTriggered = true;
                break;
              }
              case "start_or_resume_pipeline":
              case "resume_pipeline": {
                pipelineTriggered = true;
                const chosen = tc.args?.fromPhase || tc.args?.phaseId;
                if (chosen) resumePhaseId = chosen;
                executedActionSummary += `\n• Resuming autonomous pipeline (${tc.args?.reason || "User requested"})`;
                break;
              }
              case "restart_pipeline": {
                await this.triggerRestart();
                executedActionSummary += `\n• Restarted autonomous pipeline from scratch (${tc.args?.reason || "User requested"})`;
                break;
              }
              case "stop_pipeline": {
                await this.triggerStop();
                executedActionSummary += `\n• Paused autonomous pipeline (${tc.args?.reason || "User requested"})`;
                break;
              }
              case "get_pipeline_status": {
                executedActionSummary += `\n• Queried pipeline execution status`;
                break;
              }
            }
          } catch (toolErr) {
            console.error(`[AgentService] Error executing tool ${tc.name}:`, toolErr);
          }
        }
      }

      // Check next onboarding step if missing
      const postSpec = await this.experimentManager.readSpec();
      let followUpQuestion = "";
      let followUpChips: string[] = [];

      if (postSpec.missingInitialFields.length > 0) {
        const nextMissing = postSpec.missingInitialFields[0];
        if (nextMissing === "PLATFORM") {
          followUpQuestion = "\n\n👉 **Question 2/4**: Which mass spectrometry search platform generated this data?";
          followUpChips = ["ProteomeDiscoverer", "MaxQuant", "DIA-NN", "Spectronaut", "FragPipe", "tidyproteomics"];
        } else if (nextMissing === "ANALYTE") {
          followUpQuestion = "\n\n👉 **Question 3/4**: Is this dataset measuring `proteins` or `peptides`?";
          followUpChips = ["proteins", "peptides"];
        } else if (nextMissing === "DESCRIPTION") {
          followUpQuestion = "\n\n👉 **Question 4/4**: Could you briefly describe this experiment? *(e.g. biological model, treatment conditions, disease vs control groups, and key questions)*";
        }
      } else if (executedActionSummary && !pipelineTriggered) {
        followUpQuestion = "\n\n🎉 **All dataset parameters and study description are set up in `docs/experiment.md`!**\n\nAre you ready to start the autonomous analysis pipeline?";
        followUpChips = ["⚡ Yes, Start Pipeline", "Review docs/experiment.md ↗"];
      }

      let finalReply = accumulatedContent;
      if (!finalReply && response.content) {
        finalReply = response.content;
      }
      if (executedActionSummary && !finalReply.includes("docs/experiment.md")) {
        finalReply = (finalReply ? finalReply + "\n\n" : "") + `💾 **Updated \`docs/experiment.md\`:**${executedActionSummary}`;
      }
      if (followUpQuestion && !finalReply.includes("Question")) {
        finalReply += followUpQuestion;
      }

      if (this.abortRequested) {
        finalReply += "\n\n*(Agent response cancelled by user)*";
      }

      const agentMsgId = "msg_" + Date.now() + "_a";
      const agentTimestamp = new Date().toLocaleTimeString();
      const agentMsg: AgentMessage = {
        id: agentMsgId,
        role: "assistant",
        content: finalReply,
        timestamp: agentTimestamp,
        quickChips: followUpChips.length > 0 ? followUpChips : undefined,
      };
      this.messages.push(agentMsg);

      await this.logAgentTurn(userText, finalReply, response.usage);

      if (pipelineTriggered) {
        if (this.getPipelineState) {
          try {
            const state = await this.getPipelineState();
            if (state && Array.isArray(state.phases)) {
              if (resumePhaseId) {
                const phaseObj = state.phases.find((p) => p.id === resumePhaseId);
                if (phaseObj && phaseObj.status === "completed") {
                  const incomplete = state.phases.find((p) => p.enabled !== false && p.status !== "completed");
                  resumePhaseId = incomplete ? incomplete.id : undefined;
                }
              }
            }
          } catch {}
        }
        this.lastHaltedPhaseId = undefined;
        this.lastSuggestedContrast = undefined;
        this.triggerResume(resumePhaseId).catch((err) => {
          console.error("[AgentService] Error running pipeline after agent resolution:", err);
        });
      }

      this.notifyUpdated();

      return {
        reply: finalReply,
        usage: response.usage,
      };
    } finally {
      this.isBusy = false;
      this.abortRequested = false;
    }
  }

  private async logAgentTurn(userText: string, agentReply: string, usage?: TokenUsage): Promise<void> {
    if (!this.workspaceRoot) return;
    try {
      const legacyLogDir = path.join(this.workspaceRoot, "logs", "advisor");
      const logDir = path.join(this.workspaceRoot, "logs", "agent");
      if (fsSync.existsSync(legacyLogDir) && !fsSync.existsSync(logDir)) {
        await fs.rename(legacyLogDir, logDir).catch(() => {});
      }
      if (!fsSync.existsSync(logDir)) {
        await fs.mkdir(logDir, { recursive: true });
      }
      const logFile = path.join(logDir, "chat.md");
      const d = new Date().toISOString();
      const tokensInfo = usage ? ` *(Tokens: ${usage.totalTokens || 0})*` : "";
      const entry = `\n\n### [${d}] User:\n${userText}\n\n### [${d}] Agent${tokensInfo}:\n${agentReply}\n\n---\n`;

      if (!fsSync.existsSync(logFile)) {
        const header = `# TidyProteomics Agent Chat Trace\n\nThis log records consultative dialogues between the user and the TidyProteomics Agent.\n\n---\n`;
        await fs.writeFile(logFile, header + entry, "utf-8");
      } else {
        await fs.appendFile(logFile, entry, "utf-8");
      }
    } catch (err) {
      console.error("[AgentService] Error logging agent turn:", err);
    }
  }

  private logAdvisorTurn = (userText: string, reply: string, usage?: TokenUsage) => this.logAgentTurn(userText, reply, usage);
  private getAdvisorTools = () => this.getAgentTools();
}

export { AgentService as AdvisorService };
