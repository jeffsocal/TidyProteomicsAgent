import * as fs from "fs/promises";
import * as path from "path";

export interface ContextBundle {
  systemPrompt: string;
  phasePrompt: string;
  blackboardState: string;
  staticPrefixForCache: string;
}

export class ContextBuilder {
  constructor(
    private workspaceRoot: string,
    private promptsDir = "agent",
    private analysisDir = "analysis"
  ) {}

  public setWorkspaceRoot(newRoot: string) {
    this.workspaceRoot = newRoot || "";
  }

  private async readFileSafe(relPath: string): Promise<string> {
    try {
      if (!this.workspaceRoot && !path.isAbsolute(relPath)) return "";
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
  public async buildPhaseContext(phaseFileName: string): Promise<ContextBundle> {
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
`.trim();

    return {
      systemPrompt,
      phasePrompt,
      blackboardState,
      staticPrefixForCache
    };
  }
}
