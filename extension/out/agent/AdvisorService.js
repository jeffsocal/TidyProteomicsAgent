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
exports.AdvisorService = void 0;
const fs = __importStar(require("fs/promises"));
const fsSync = __importStar(require("fs"));
const path = __importStar(require("path"));
const ExperimentManager_1 = require("./ExperimentManager");
class AdvisorService {
    workspaceRoot;
    client;
    getPipelineState;
    onStartPipeline;
    onAdvisorUpdated;
    messages = [];
    isBusy = false;
    abortRequested = false;
    experimentManager;
    lastHaltedPhaseId;
    constructor(workspaceRoot, client, getPipelineState, onStartPipeline, onAdvisorUpdated, extensionUriPath) {
        this.workspaceRoot = workspaceRoot;
        this.client = client;
        this.getPipelineState = getPipelineState;
        this.onStartPipeline = onStartPipeline;
        this.onAdvisorUpdated = onAdvisorUpdated;
        this.workspaceRoot = workspaceRoot || "";
        this.experimentManager = new ExperimentManager_1.ExperimentManager(this.workspaceRoot, extensionUriPath);
    }
    setWorkspaceRoot(newRoot) {
        this.workspaceRoot = newRoot || "";
        this.experimentManager.setWorkspaceRoot(this.workspaceRoot);
    }
    getExperimentManager() {
        return this.experimentManager;
    }
    getMessages() {
        return [...this.messages];
    }
    isRunning() {
        return this.isBusy;
    }
    cancel() {
        if (this.isBusy) {
            this.abortRequested = true;
        }
    }
    async clearMessages() {
        this.messages = [];
    }
    async readFileSafe(relPath) {
        try {
            if (!this.workspaceRoot)
                return "";
            const fullPath = path.isAbsolute(relPath) ? relPath : path.join(this.workspaceRoot, relPath);
            return await fs.readFile(fullPath, "utf-8");
        }
        catch {
            return "";
        }
    }
    /**
     * Defines agentic tools available to the Advisor for configuring experiment.md and driving execution.
     */
    getAdvisorTools() {
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
        ];
    }
    /**
     * Checks docs/experiment.md and generates proactive onboarding questions if initial setup is incomplete.
     */
    async checkAndTriggerOnboarding() {
        if (!this.workspaceRoot)
            return false;
        const spec = await this.experimentManager.readSpec();
        if (spec.missingInitialFields.length > 0) {
            if (this.messages.length === 0) {
                const firstMissing = spec.missingInitialFields[0];
                let promptText = "";
                let chips = [];
                if (firstMissing === "PATH_TO_DATA_FILE") {
                    promptText = "👋 **Welcome to TidyProteomicsAgent!**\n\nI am your **Live Advisor**. Before starting the pipeline, let's configure your experiment.\n\n👉 **Question 1/4**: What is the file path or URL to your proteomics data file? *(e.g. `data/raw/ProteomeDiscoverer_proteins.xlsx` or `data/raw/data.rds`)*";
                    chips = ["data/raw/tidyproteomics_data.rds", "Select File..."];
                }
                else if (firstMissing === "PLATFORM") {
                    promptText = "👉 **Question 2/4**: Which mass spectrometry search platform generated this data?";
                    chips = ["ProteomeDiscoverer", "MaxQuant", "DIA-NN", "Spectronaut", "FragPipe", "tidyproteomics"];
                }
                else if (firstMissing === "ANALYTE") {
                    promptText = "👉 **Question 3/4**: Is this dataset measuring `proteins` or `peptides`?";
                    chips = ["proteins", "peptides"];
                }
                else if (firstMissing === "DESCRIPTION") {
                    promptText = "👉 **Question 4/4**: Could you briefly describe this experiment? *(e.g. biological model, treatment conditions, disease vs control groups, and key hypotheses)*";
                }
                this.messages.push({
                    id: "msg_onboard_" + Date.now(),
                    role: "assistant",
                    content: promptText,
                    timestamp: new Date().toLocaleTimeString(),
                    quickChips: chips,
                });
                if (this.onAdvisorUpdated)
                    this.onAdvisorUpdated();
                return true;
            }
        }
        else if (this.messages.length === 0) {
            // All initial fields satisfied
            this.messages.push({
                id: "msg_ready_" + Date.now(),
                role: "assistant",
                content: "👋 **Welcome back to TidyProteomicsAgent!**\n\nI reviewed `docs/experiment.md` and confirmed that all initial dataset parameters and your experiment description are configured! 🚀\n\n**Ready to start the autonomous analysis pipeline?**",
                timestamp: new Date().toLocaleTimeString(),
                quickChips: ["⚡ Yes, Start Pipeline", "Review docs/experiment.md ↗"],
            });
            if (this.onAdvisorUpdated)
                this.onAdvisorUpdated();
            return true;
        }
        return false;
    }
    /**
     * Automatically intercepts a halted or failed pipeline phase and prompts the user in Chat.
     */
    async handlePhaseHalted(phase) {
        const haltKey = `msg_halt_${phase.id}`;
        if (this.lastHaltedPhaseId === phase.id && this.messages.some((m) => m.id === haltKey)) {
            return;
        }
        this.lastHaltedPhaseId = phase.id;
        const errorText = String(phase.error || phase.summary || "").trim();
        let questionPrompt = "";
        let chips = [];
        const isConfounding = /confound|Proceed With Potential Batch Confounding|Authorize Unadjusted Exploratory Comparison/i.test(errorText);
        const isSampleGrouping = /sample group|recoding|pooling|Section 3\.?B|reassign sample names/i.test(errorText);
        const isContrastNeeded = /contrast|target contrast|disease\/control|Section 3\.?C/i.test(errorText);
        if (isConfounding) {
            questionPrompt = `⚠️ **Batch Confounding Alert in ${phase.title || phase.fileName}**\n\nThe pipeline detected that biological conditions are correlated with technical processing batches. Linear models cannot mathematically separate batch variance from biology.\n\n**Would you like to authorize an exploratory comparison despite potential batch confounding?**`;
            chips = ["⚡ Authorize Confounding & Resume", "No, do not proceed"];
        }
        else if (isSampleGrouping) {
            questionPrompt = `🧪 **Sample Renaming & Grouping Required in ${phase.title || phase.fileName}**\n\nThe ingested dataset contains raw sample names with technical batch tags. How would you like to rename or group these samples? *(e.g., which samples are \`Control\` and which are \`Disease\`?)*`;
            chips = ["Review docs/experiment.md ↗"];
        }
        else if (isContrastNeeded) {
            questionPrompt = `🎯 **Target Contrast Required in ${phase.title || phase.fileName}**\n\nBefore calculating differential expression, what comparison would you like to test? *(e.g., \`Disease vs Control\` or \`Treated vs Vehicle\`)*`;
            chips = ["Disease vs Control", "Treatment vs Control"];
        }
        else {
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
        if (this.onAdvisorUpdated)
            this.onAdvisorUpdated();
    }
    /**
     * Assembles the live context snapshot from the workspace to empower the advisor.
     */
    async buildSystemPrompt() {
        const experiment = await this.readFileSafe(path.join("docs", "experiment.md"));
        const notes = await this.readFileSafe(path.join("docs", "notes.md"));
        const llm = await this.readFileSafe(path.join("docs", "llm.md"));
        let skill = await this.readFileSafe(path.join("agent", "TIDYPROTEOMICS_IMPORT_INSPECT.md"));
        if (!skill) {
            skill = await this.readFileSafe(path.join("agent", "TIDYPROTEOMICS_CORE.md"));
        }
        let pipelineStatusText = "No pipeline state available.";
        if (this.getPipelineState) {
            try {
                const state = await this.getPipelineState();
                if (state && Array.isArray(state.phases) && state.phases.length > 0) {
                    pipelineStatusText = state.phases
                        .map((p, idx) => {
                        const statusStr = (p.status || "pending").toUpperCase();
                        let info = `${idx + 1}. [${statusStr}] ${p.title || p.fileName}`;
                        if (p.durationSeconds)
                            info += ` (${p.durationSeconds}s)`;
                        if (p.error)
                            info += `\n   Error/Warning: ${p.error.slice(0, 300)}`;
                        return info;
                    })
                        .join("\n");
                }
            }
            catch (err) {
                pipelineStatusText = `Error fetching pipeline state: ${String(err)}`;
            }
        }
        const spec = await this.experimentManager.readSpec();
        return `
You are the **TidyProteomics Live Advisor**, an expert AI computational biologist and mass spectrometry proteomics specialist integrated directly inside VS Code.
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

${skill ? `#### TidyProteomics Key API Reference:\n${skill.slice(0, 2500)}\n` : ""}

### ADVISOR RESPONSIBILITIES & TOOL CALLING:
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
     * Sends a user query to the advisor and streams/returns the response.
     */
    async sendMessage(userText, onToken) {
        if (this.isBusy) {
            throw new Error("Advisor is already generating a response.");
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
        if (this.onAdvisorUpdated)
            this.onAdvisorUpdated();
        console.log("[AdvisorService] Received user query:", userText);
        try {
            const trimmed = userText.trim();
            const lower = trimmed.toLowerCase();
            const isStartAffirmative = /^(yes|start|run|proceed|ready|start pipeline|run pipeline|yes,? start pipeline|⚡ yes, start pipeline)$/i.test(lower);
            const isAuthorizeAffirmative = /^(authorize|authorize and resume|authorize confounding|yes,? authorize|yes,? proceed|⚡ authorize confounding & resume)$/i.test(lower);
            // 1. Direct handling of initial onboarding interview questions
            const preSpec = await this.experimentManager.readSpec();
            if (preSpec.missingInitialFields.length > 0) {
                const step = preSpec.missingInitialFields[0];
                let reply = "";
                let chips = [];
                if (step === "PATH_TO_DATA_FILE") {
                    console.log("[AdvisorService] Saving PATH_TO_DATA_FILE:", trimmed);
                    await this.experimentManager.setParameter("PATH_TO_DATA_FILE", trimmed);
                    reply = `✅ **Saved Data File**: Configured \`PATH_TO_DATA_FILE: ${trimmed}\` in \`docs/experiment.md\`.\n\n👉 **Question 2/4**: Which mass spectrometry search platform generated this data?`;
                    chips = ["ProteomeDiscoverer", "MaxQuant", "DIA-NN", "Spectronaut", "FragPipe", "tidyproteomics"];
                }
                else if (step === "PLATFORM") {
                    console.log("[AdvisorService] Saving PLATFORM:", trimmed);
                    await this.experimentManager.setParameter("PLATFORM", trimmed);
                    reply = `✅ **Saved Search Platform**: Configured \`PLATFORM: ${trimmed}\` in \`docs/experiment.md\`.\n\n👉 **Question 3/4**: Is this dataset measuring \`proteins\` or \`peptides\`?`;
                    chips = ["proteins", "peptides"];
                }
                else if (step === "ANALYTE") {
                    console.log("[AdvisorService] Saving ANALYTE:", trimmed);
                    await this.experimentManager.setParameter("ANALYTE", trimmed);
                    reply = `✅ **Saved Analyte**: Configured \`ANALYTE: ${trimmed}\` in \`docs/experiment.md\`.\n\n👉 **Question 4/4**: Could you briefly describe this experiment? *(e.g. biological model, treatment conditions, disease vs control groups, and key hypotheses)*`;
                }
                else if (step === "DESCRIPTION") {
                    console.log("[AdvisorService] Saving DESCRIPTION");
                    await this.experimentManager.setDescription(trimmed);
                    reply = `✅ **Saved Experiment Description**: Updated Section 2 in \`docs/experiment.md\`.\n\n🎉 **All dataset parameters and study description are now configured!** 🚀\n\n**Ready to start the autonomous analysis pipeline?**`;
                    chips = ["⚡ Yes, Start Pipeline", "Review docs/experiment.md ↗"];
                }
                if (reply) {
                    if (onToken)
                        onToken(reply);
                    const advMsg = {
                        id: "msg_" + Date.now() + "_a",
                        role: "assistant",
                        content: reply,
                        timestamp: new Date().toLocaleTimeString(),
                        quickChips: chips.length > 0 ? chips : undefined,
                    };
                    this.messages.push(advMsg);
                    await this.logAdvisorTurn(userText, reply);
                    if (this.onAdvisorUpdated)
                        this.onAdvisorUpdated();
                    return { reply, usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 } };
                }
            }
            // 2. Direct handling of pipeline halt resolutions
            if (this.lastHaltedPhaseId) {
                if (isAuthorizeAffirmative) {
                    await this.experimentManager.setBatchConfounding(true);
                    const reply = "✅ **Authorized Batch Confounding**: Updated `docs/experiment.md` (`Proceed With Potential Batch Confounding: TRUE`).\n\nResuming the pipeline now...";
                    if (onToken)
                        onToken(reply);
                    const advMsg = {
                        id: "msg_" + Date.now() + "_a",
                        role: "assistant",
                        content: reply,
                        timestamp: new Date().toLocaleTimeString(),
                    };
                    this.messages.push(advMsg);
                    const resumeId = this.lastHaltedPhaseId;
                    this.lastHaltedPhaseId = undefined;
                    if (this.onStartPipeline) {
                        await this.onStartPipeline(resumeId);
                    }
                    await this.logAdvisorTurn(userText, reply);
                    if (this.onAdvisorUpdated)
                        this.onAdvisorUpdated();
                    return { reply, usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 } };
                }
                // Contrast input (e.g. "Disease vs Control" or "disease/control" or "Treated vs Vehicle")
                const contrastMatch = trimmed.match(/^([a-zA-Z0-9_-]+)\s*(?:\/|vs\.?|versus)\s*([a-zA-Z0-9_-]+)$/i);
                if (contrastMatch) {
                    const contrast = `${contrastMatch[1]} vs ${contrastMatch[2]}`;
                    await this.experimentManager.setTargetContrasts([contrast]);
                    const reply = `✅ **Configured Target Contrast**: Saved \`- Contrast: ${contrast}\` in \`docs/experiment.md\`.\n\nResuming differential expression analysis now...`;
                    if (onToken)
                        onToken(reply);
                    const advMsg = {
                        id: "msg_" + Date.now() + "_a",
                        role: "assistant",
                        content: reply,
                        timestamp: new Date().toLocaleTimeString(),
                    };
                    this.messages.push(advMsg);
                    const resumeId = this.lastHaltedPhaseId;
                    this.lastHaltedPhaseId = undefined;
                    if (this.onStartPipeline) {
                        await this.onStartPipeline(resumeId);
                    }
                    await this.logAdvisorTurn(userText, reply);
                    if (this.onAdvisorUpdated)
                        this.onAdvisorUpdated();
                    return { reply, usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 } };
                }
            }
            // 3. User confirmed starting the pipeline
            if (isStartAffirmative) {
                const spec = await this.experimentManager.readSpec();
                if (spec.missingInitialFields.length === 0) {
                    const cfg = this.client.getConfig();
                    if (cfg.provider !== "ollama" && !cfg.apiKey) {
                        const reply = "⚠️ **API Key Required**: Please configure an API Key in the **Provider** tab before launching the autonomous pipeline.";
                        if (onToken)
                            onToken(reply);
                        const advMsg = {
                            id: "msg_" + Date.now() + "_a",
                            role: "assistant",
                            content: reply,
                            timestamp: new Date().toLocaleTimeString(),
                            quickChips: ["Switch to Provider Tab ↗"],
                        };
                        this.messages.push(advMsg);
                        if (this.onAdvisorUpdated)
                            this.onAdvisorUpdated();
                        return { reply, usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 } };
                    }
                    const reply = "🚀 **Starting Pipeline Execution**: Everything in `docs/experiment.md` is verified. Triggering the autonomous analysis pipeline now!";
                    if (onToken)
                        onToken(reply);
                    const advMsg = {
                        id: "msg_" + Date.now() + "_a",
                        role: "assistant",
                        content: reply,
                        timestamp: new Date().toLocaleTimeString(),
                    };
                    this.messages.push(advMsg);
                    const resumeId = this.lastHaltedPhaseId;
                    this.lastHaltedPhaseId = undefined;
                    if (this.onStartPipeline) {
                        await this.onStartPipeline(resumeId);
                    }
                    await this.logAdvisorTurn(userText, reply);
                    if (this.onAdvisorUpdated)
                        this.onAdvisorUpdated();
                    return { reply, usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 } };
                }
            }
            // 4. Open-ended conversational or scientific query: verify API key before calling LLM
            const cfg = this.client.getConfig();
            if (cfg.provider !== "ollama" && !cfg.apiKey) {
                const reply = "⚠️ **API Key Required**: To chat with the Live Advisor on open-ended scientific topics, please configure an API Key in the **Provider** tab.";
                if (onToken)
                    onToken(reply);
                const advMsg = {
                    id: "msg_" + Date.now() + "_a",
                    role: "assistant",
                    content: reply,
                    timestamp: new Date().toLocaleTimeString(),
                    quickChips: ["Switch to Provider Tab ↗"],
                };
                this.messages.push(advMsg);
                await this.logAdvisorTurn(userText, reply);
                if (this.onAdvisorUpdated)
                    this.onAdvisorUpdated();
                return { reply, usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 } };
            }
            const systemPrompt = await this.buildSystemPrompt();
            // Convert conversation history (limit to last 16 turns to keep context snappy)
            const recentMessages = this.messages.slice(-16);
            const chatMessages = recentMessages.map((m) => ({
                role: m.role,
                content: m.content,
            }));
            let accumulatedContent = "";
            const tools = this.getAdvisorTools();
            console.log(`[AdvisorService] Sending query to ${cfg.provider} (${cfg.model})...`);
            const response = await this.client.chat({
                system: systemPrompt,
                messages: chatMessages,
                tools: tools,
                onToken: (chunk) => {
                    if (this.abortRequested)
                        return;
                    accumulatedContent += chunk;
                    if (onToken)
                        onToken(chunk);
                },
            });
            // Execute tool calls if returned
            let executedActionSummary = "";
            let pipelineTriggered = false;
            let resumePhaseId = this.lastHaltedPhaseId;
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
                            case "start_or_resume_pipeline": {
                                pipelineTriggered = true;
                                if (tc.args?.phaseId)
                                    resumePhaseId = tc.args.phaseId;
                                executedActionSummary += `\n• Triggering pipeline execution (${tc.args?.reason || "User confirmed"})`;
                                break;
                            }
                        }
                    }
                    catch (toolErr) {
                        console.error(`[AdvisorService] Error executing tool ${tc.name}:`, toolErr);
                    }
                }
            }
            // Check next onboarding step if missing
            const postSpec = await this.experimentManager.readSpec();
            let followUpQuestion = "";
            let followUpChips = [];
            if (postSpec.missingInitialFields.length > 0) {
                const nextMissing = postSpec.missingInitialFields[0];
                if (nextMissing === "PLATFORM") {
                    followUpQuestion = "\n\n👉 **Question 2/4**: Which mass spectrometry search platform generated this data?";
                    followUpChips = ["ProteomeDiscoverer", "MaxQuant", "DIA-NN", "Spectronaut", "FragPipe", "tidyproteomics"];
                }
                else if (nextMissing === "ANALYTE") {
                    followUpQuestion = "\n\n👉 **Question 3/4**: Is this dataset measuring `proteins` or `peptides`?";
                    followUpChips = ["proteins", "peptides"];
                }
                else if (nextMissing === "DESCRIPTION") {
                    followUpQuestion = "\n\n👉 **Question 4/4**: Could you briefly describe this experiment? *(e.g. biological model, treatment conditions, disease vs control groups, and key questions)*";
                }
            }
            else if (executedActionSummary && !pipelineTriggered) {
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
                finalReply += "\n\n*(Advisor response cancelled by user)*";
            }
            const advisorMsgId = "msg_" + Date.now() + "_a";
            const advisorTimestamp = new Date().toLocaleTimeString();
            const advMsg = {
                id: advisorMsgId,
                role: "assistant",
                content: finalReply,
                timestamp: advisorTimestamp,
                quickChips: followUpChips.length > 0 ? followUpChips : undefined,
            };
            this.messages.push(advMsg);
            await this.logAdvisorTurn(userText, finalReply, response.usage);
            if (pipelineTriggered && this.onStartPipeline) {
                this.lastHaltedPhaseId = undefined;
                this.onStartPipeline(resumePhaseId).catch((err) => {
                    console.error("[AdvisorService] Error running pipeline after advisor resolution:", err);
                });
            }
            if (this.onAdvisorUpdated)
                this.onAdvisorUpdated();
            return {
                reply: finalReply,
                usage: response.usage,
            };
        }
        finally {
            this.isBusy = false;
            this.abortRequested = false;
        }
    }
    async logAdvisorTurn(userText, advisorReply, usage) {
        if (!this.workspaceRoot)
            return;
        try {
            const logDir = path.join(this.workspaceRoot, "logs", "advisor");
            if (!fsSync.existsSync(logDir)) {
                await fs.mkdir(logDir, { recursive: true });
            }
            const logFile = path.join(logDir, "chat.md");
            const d = new Date().toISOString();
            const tokensInfo = usage ? ` *(Tokens: ${usage.totalTokens || 0})*` : "";
            const entry = `\n\n### [${d}] User:\n${userText}\n\n### [${d}] Advisor${tokensInfo}:\n${advisorReply}\n\n---\n`;
            if (!fsSync.existsSync(logFile)) {
                const header = `# TidyProteomics Live Advisor Chat Trace\n\nThis log records consultative dialogues between the user and the TidyProteomics Live Advisor.\n\n---\n`;
                await fs.writeFile(logFile, header + entry, "utf-8");
            }
            else {
                await fs.appendFile(logFile, entry, "utf-8");
            }
        }
        catch (err) {
            console.error("[AdvisorService] Error logging advisor turn:", err);
        }
    }
}
exports.AdvisorService = AdvisorService;
//# sourceMappingURL=AdvisorService.js.map