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
exports.ContextBuilder = void 0;
const fs = __importStar(require("fs/promises"));
const path = __importStar(require("path"));
const LiteratureService_1 = require("../literature/LiteratureService");
class ContextBuilder {
    workspaceRoot;
    promptsDir;
    analysisDir;
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
        }
        catch {
            return "";
        }
    }
    /**
     * Builds the isolated context bundle for a specific phase.
     * Persistent elements (rules, skills, variables, instructions) form the static prefix.
     * Dynamic elements (blackboard docs/notes.md, experiment.md) and the phase file form the prompt.
     */
    async buildPhaseContext(phaseFileName) {
        // 1. Persistent rules and instructions (load unified PROTOCOL.md with legacy fallback)
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
            protocol = `${clinerules}\n\n${instruct}`.trim();
        }
        const skill = await this.readFileSafe(path.join(agentDir, "SKILL.md"));
        const experiment = await this.readFileSafe(path.join("docs", "experiment.md"));
        // Read legacy agent/VARIABLES.md if present, otherwise use docs/experiment.md
        let variables = await this.readFileSafe(path.join(agentDir, "VARIABLES.md"));
        if (!variables) {
            variables = experiment || "No dataset parameters provided. See docs/experiment.md.";
        }
        const biology = await this.readFileSafe(path.join(agentDir, "BIOLOGY.md"));
        const biologySection = biology
            ? `\n\n# CURATED DOMAIN BIOLOGICAL CONTEXT\n${biology}`
            : "";
        // Static prefix - perfectly cacheable across all phases!
        const staticPrefixForCache = `
# AUTONOMOUS ANALYSIS PROTOCOL & QUALITY GATES
${protocol}

# INPUT DATASET PARAMETERS & EXPERIMENT SPECIFICATION
${variables}
${biologySection}

# DOMAIN SKILL SPECIFICATION & API CONVENTIONS
${skill}
`.trim();
        // 2. Blackboard / Inter-Phase Shared State
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
${this.buildLiteratureSection()}
`.trim();
        // 3. Isolated Phase Directive
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
- If a mandatory pre-flight gate, configuration prerequisite, or checkpoint fails and requires user intervention (such as unconfigured placeholders in docs/experiment.md), immediately invoke fail_phase(phaseName = "${normalizedPhaseName}", reason = "...", actionableInsights = "...") to halt execution and present actionable insights to the user.
`.trim();
        return {
            systemPrompt,
            phasePrompt,
            blackboardState,
            staticPrefixForCache
        };
    }
    /**
     * Describes the active DuckDB literature database (toggled from the Literature tab).
     * Placed in the dynamic blackboard (not the cached prefix) because it can change between phases.
     */
    buildLiteratureSection() {
        if (!this.workspaceRoot)
            return "";
        const cfg = (0, LiteratureService_1.readLiteratureConfig)(this.workspaceRoot);
        const activeName = cfg.activeLiterature || cfg.activeCorpus;
        if (!activeName && !cfg.useInSynthesis)
            return "";
        const active = (0, LiteratureService_1.getActiveSynthesisLiterature)(this.workspaceRoot);
        if (!active) {
            return `
### ACTIVE LITERATURE DATABASE (DuckDB):
- Status: DISABLED for synthesis (toggle off or no database selected in the Literature tab).
- Use the standard literature corroboration strategy described in the phase directive.
`;
        }
        return `
### ACTIVE LITERATURE DATABASE (DuckDB - READ ONLY):
- Status: ENABLED for literature corroboration and synthesis.
- Database file: \`${active.relPath}\`
- Schema: studies(study_id, title, year, core_thesis) -> experimental_contexts(context_id, organism, model_name, perturbation_type, perturbation_target, assay_modality) -> molecular_assertions(raw_entity_name, canonical_human_symbol, relationship_type, functional_module, quantitative_note, evidence_quote). Denormalized view: v_assertions_full.
- Inspect: \`Rscript tools/literature/literature_cli.R stats ${active.relPath}\`
- Lookup: \`Rscript tools/literature/literature_cli.R search ${active.relPath} <SYMBOL_OR_MODULE> [limit]\`
- Query Skill: \`Rscript tools/literature/query_literature.R ${active.relPath} "<seed_symbols>" "<pathway_terms>"\`
- Policy: Prefer literature database evidence (cite study_id + verbatim evidence_quote) over generic web search. Open the database read-only; never modify it during analysis phases.
`;
    }
}
exports.ContextBuilder = ContextBuilder;
//# sourceMappingURL=ContextBuilder.js.map