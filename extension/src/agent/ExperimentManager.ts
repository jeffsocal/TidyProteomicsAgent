import * as fs from "fs/promises";
import * as fsSync from "fs";
import * as path from "path";

export interface ExperimentSpec {
  exists: boolean;
  pathToDataFile: string | null;
  platform: string | null;
  analyte: string | null;
  description: string | null;
  rawSampleGroups: string[];
  sampleRenamingMap: Record<string, string>;
  targetContrasts: string[];
  batchConfoundingAuthorized: boolean;
  missingInitialFields: ("PATH_TO_DATA_FILE" | "PLATFORM" | "ANALYTE" | "DESCRIPTION")[];
}

export class ExperimentManager {
  constructor(
    private workspaceRoot: string,
    private extensionUriPath?: string
  ) {}

  public setWorkspaceRoot(newRoot: string) {
    this.workspaceRoot = newRoot || "";
  }

  public getExperimentPath(): string {
    return path.join(this.workspaceRoot, "docs", "experiment.md");
  }

  /**
   * Ensures docs/experiment.md exists by copying the template if needed.
   */
  public async ensureExperimentDoc(): Promise<string> {
    const expPath = this.getExperimentPath();
    if (fsSync.existsSync(expPath)) {
      return await fs.readFile(expPath, "utf-8");
    }

    const docsDir = path.dirname(expPath);
    if (!fsSync.existsSync(docsDir)) {
      await fs.mkdir(docsDir, { recursive: true });
    }

    let templateContent = "";
    if (this.extensionUriPath) {
      const templatePath = path.join(this.extensionUriPath, "templates", "shared", "docs", "experiment.md");
      if (fsSync.existsSync(templatePath)) {
        templateContent = await fs.readFile(templatePath, "utf-8");
      }
    }

    if (!templateContent) {
      templateContent = `# Experiment & Dataset Specification

## 1. Input Dataset Parameters
👉 [USER ACTION REQUIRED - CONFIGURE DATASET PARAMETERS]:

- **PATH_TO_DATA_FILE**: [REQUIRED: Enter URL or relative path to data file]
- **PLATFORM**: [REQUIRED: Enter search platform]
- **ANALYTE**: [REQUIRED: proteins or peptides]

## 2. Experimental Hypothesis & Study Design
👉 [USER ACTION REQUIRED - DESCRIBE STUDY & HYPOTHESIS]:

[REQUIRED: Describe the experimental hypothesis, biological system, treatment conditions, control groups, and key biological questions to investigate.]

## 3. Sample Grouping, Recoding & Contrast Designations

### A. Discovered Sample Groups in Dataset:
ℹ️ [AUTO-GENERATED REFERENCE - READ ONLY]:
- *(Pending Phase 1 data ingestion)*

### B. Sample Group Renaming & Pooling Map (Optional):
👉 [USER REVIEW & EDIT TABLE]:
| Raw Sample Group | Cleaned Group Name |
| :--- | :--- |

👉 [USER TOGGLE]:
- **Reassign Sample Names According to Pooling Map**: TRUE

### C. Target Contrasts:
👉 [USER ACTION REQUIRED - DEFINE TARGET CONTRASTS]:
- Contrast: <treatment> vs <control>

### D. Confounded Batch & Exploratory Comparison Authorization:
⚠️ [PRE-FLIGHT GATE DECISION]:
- **Proceed With Potential Batch Confounding**: FALSE
`;
    }

    await fs.writeFile(expPath, templateContent, "utf-8");
    return templateContent;
  }

  /**
   * Reads and parses docs/experiment.md, determining which fields are unassigned.
   */
  public async readSpec(): Promise<ExperimentSpec> {
    const expPath = this.getExperimentPath();
    if (!fsSync.existsSync(expPath)) {
      return {
        exists: false,
        pathToDataFile: null,
        platform: null,
        analyte: null,
        description: null,
        rawSampleGroups: [],
        sampleRenamingMap: {},
        targetContrasts: [],
        batchConfoundingAuthorized: false,
        missingInitialFields: ["PATH_TO_DATA_FILE", "PLATFORM", "ANALYTE", "DESCRIPTION"],
      };
    }

    const content = await fs.readFile(expPath, "utf-8");
    const missing: ("PATH_TO_DATA_FILE" | "PLATFORM" | "ANALYTE" | "DESCRIPTION")[] = [];

    // 1. PATH_TO_DATA_FILE
    let pathToDataFile: string | null = null;
    const pathMatch = content.match(/-\s*\*\*PATH_TO_DATA_FILE\*\*:\s*(.*)/i);
    if (pathMatch) {
      const val = pathMatch[1].trim();
      if (val && !val.includes("[REQUIRED") && !val.startsWith("<") && !val.includes("Enter URL")) {
        pathToDataFile = val;
      }
    }
    if (!pathToDataFile) missing.push("PATH_TO_DATA_FILE");

    // 2. PLATFORM
    let platform: string | null = null;
    const platMatch = content.match(/-\s*\*\*PLATFORM\*\*:\s*(.*)/i);
    if (platMatch) {
      const val = platMatch[1].trim();
      if (val && !val.includes("[REQUIRED") && !val.startsWith("<") && !val.includes("Enter search platform")) {
        platform = val;
      }
    }
    if (!platform) missing.push("PLATFORM");

    // 3. ANALYTE
    let analyte: string | null = null;
    const analyteMatch = content.match(/-\s*\*\*ANALYTE\*\*:\s*(.*)/i);
    if (analyteMatch) {
      const val = analyteMatch[1].trim();
      if (val && !val.includes("[REQUIRED") && !val.startsWith("<") && !val.includes("proteins or peptides")) {
        analyte = val;
      }
    }
    if (!analyte) missing.push("ANALYTE");

    // 4. DESCRIPTION
    let description: string | null = null;
    const descSectionMatch = content.match(/## 2\. Experimental Hypothesis & Study Design[\s\S]*?(?=## 3\.|$)/i);
    if (descSectionMatch) {
      const secText = descSectionMatch[0];
      const cleaned = secText
        .replace(/## 2\. Experimental Hypothesis & Study Design/i, "")
        .replace(/👉\s*\[USER ACTION REQUIRED[^\]]*\]:/gi, "")
        .replace(/<!--[\s\S]*?-->/g, "")
        .trim();
      if (cleaned && !cleaned.includes("[REQUIRED") && cleaned.length >= 10) {
        description = cleaned;
      }
    }
    if (!description) missing.push("DESCRIPTION");

    // 5. Target Contrasts
    const targetContrasts: string[] = [];
    const contrastMatches = content.matchAll(/-\s*Contrast:\s*(.*)/gi);
    for (const m of contrastMatches) {
      const c = m[1].trim();
      if (c && !c.includes("<treatment>") && !c.includes("<control>") && !c.includes("[REQUIRED")) {
        targetContrasts.push(c);
      }
    }

    // 6. Sample Renaming Map
    const sampleRenamingMap: Record<string, string> = {};
    const tableMatch = content.match(/\| Raw Sample Group \| Cleaned Group Name \|\s*\n\| :--- \| :--- \|\s*\n([\s\S]*?)(?=\n\s*(?:👉|###|##|$))/i);
    if (tableMatch) {
      const rows = tableMatch[1].split("\n").map((r) => r.trim()).filter((r) => r.startsWith("|"));
      for (const row of rows) {
        const parts = row.split("|").map((p) => p.trim()).filter(Boolean);
        if (parts.length >= 2 && parts[0] !== "Raw Sample Group" && !parts[0].includes("---")) {
          sampleRenamingMap[parts[0]] = parts[1];
        }
      }
    }

    // 7. Batch Confounding
    const batchConfoundingAuthorized = /-\s*\*\*Proceed With Potential Batch Confounding\*\*:\s*TRUE/i.test(content);

    return {
      exists: true,
      pathToDataFile,
      platform,
      analyte,
      description,
      rawSampleGroups: [],
      sampleRenamingMap,
      targetContrasts,
      batchConfoundingAuthorized,
      missingInitialFields: missing,
    };
  }

  /**
   * Updates Section 1 parameter (PATH_TO_DATA_FILE, PLATFORM, or ANALYTE).
   */
  public async setParameter(key: "PATH_TO_DATA_FILE" | "PLATFORM" | "ANALYTE", value: string): Promise<void> {
    await this.ensureExperimentDoc();
    const expPath = this.getExperimentPath();
    let content = await fs.readFile(expPath, "utf-8");

    const regex = new RegExp(`(-\\s*\\*\\*${key}\\*\\*:\\s*)(.*)`, "i");
    if (regex.test(content)) {
      content = content.replace(regex, `$1${value.trim()}`);
    } else {
      // If missing from Section 1, append it
      content = content.replace(
        /(## 1\. Input Dataset Parameters[\s\S]*?)(?=## 2\.|$)/i,
        `$1\n- **${key}**: ${value.trim()}\n`
      );
    }
    await fs.writeFile(expPath, content, "utf-8");
  }

  /**
   * Sets Section 2 experimental hypothesis & study design.
   */
  public async setDescription(description: string): Promise<void> {
    await this.ensureExperimentDoc();
    const expPath = this.getExperimentPath();
    let content = await fs.readFile(expPath, "utf-8");

    const sectionRegex = /(## 2\. Experimental Hypothesis & Study Design[\s\S]*?)(?=## 3\.|$)/i;
    const newSection = `## 2. Experimental Hypothesis & Study Design\n👉 [USER ACTION REQUIRED - DESCRIBE STUDY & HYPOTHESIS]:\n\n${description.trim()}\n\n`;

    if (sectionRegex.test(content)) {
      content = content.replace(sectionRegex, newSection);
    } else {
      content += `\n\n${newSection}`;
    }
    await fs.writeFile(expPath, content, "utf-8");
  }

  /**
   * Sets Section 3B sample renaming and pooling map.
   */
  public async setSampleRenamingMap(mapping: Record<string, string>): Promise<void> {
    await this.ensureExperimentDoc();
    const expPath = this.getExperimentPath();
    let content = await fs.readFile(expPath, "utf-8");

    let table = "| Raw Sample Group | Cleaned Group Name |\n| :--- | :--- |\n";
    for (const [raw, clean] of Object.entries(mapping)) {
      table += `| ${raw} | ${clean} |\n`;
    }

    const tableBlockRegex = /(### B\. Sample Group Renaming & Pooling Map[\s\S]*?)(?:\| Raw Sample Group \| Cleaned Group Name \|[\s\S]*?(?=\n\s*(?:👉|###|##|$)))/i;
    if (tableBlockRegex.test(content)) {
      content = content.replace(tableBlockRegex, `$1${table}`);
    } else {
      const sectionBRegex = /(### B\. Sample Group Renaming & Pooling Map[\s\S]*?)(?=### C\.|$)/i;
      if (sectionBRegex.test(content)) {
        content = content.replace(sectionBRegex, `### B. Sample Group Renaming & Pooling Map (Optional):\n👉 [USER REVIEW & EDIT TABLE]:\n${table}\n👉 [USER TOGGLE]:\n- **Reassign Sample Names According to Pooling Map**: TRUE\n\n`);
      }
    }

    // Ensure toggle is TRUE
    content = content.replace(
      /-\s*\*\*Reassign Sample Names According to (?:Sample Group Renaming & )?Pooling Map\*\*:\s*FALSE/i,
      "- **Reassign Sample Names According to Pooling Map**: TRUE"
    );

    await fs.writeFile(expPath, content, "utf-8");
  }

  /**
   * Sets Section 3C target contrasts.
   */
  public async setTargetContrasts(contrasts: string[]): Promise<void> {
    await this.ensureExperimentDoc();
    const expPath = this.getExperimentPath();
    let content = await fs.readFile(expPath, "utf-8");

    const contrastList = contrasts
      .map((c) => `- Contrast: ${c.replace(/^-\s*Contrast:\s*/i, "").trim()}`)
      .join("\n");

    const sectionCRegex = /(### C\. Target Contrasts:[\s\S]*?)(?=### D\.|$)/i;
    const newSectionC = `### C. Target Contrasts:\n👉 [USER ACTION REQUIRED - DEFINE TARGET CONTRASTS]:\n${contrastList}\n\n`;

    if (sectionCRegex.test(content)) {
      content = content.replace(sectionCRegex, newSectionC);
    } else {
      content += `\n\n${newSectionC}`;
    }

    await fs.writeFile(expPath, content, "utf-8");
  }

  /**
   * Sets Section 3D Proceed With Potential Batch Confounding (TRUE / FALSE).
   */
  public async setBatchConfounding(authorized: boolean): Promise<void> {
    await this.ensureExperimentDoc();
    const expPath = this.getExperimentPath();
    let content = await fs.readFile(expPath, "utf-8");

    const val = authorized ? "TRUE" : "FALSE";
    if (content.includes("Proceed With Potential Batch Confounding")) {
      content = content.replace(
        /(-\s*\*\*Proceed With Potential Batch Confounding\*\*:\s*)(TRUE|FALSE)/i,
        `$1${val}`
      );
    } else {
      content += `\n\n### D. Confounded Batch & Exploratory Comparison Authorization:\n- **Proceed With Potential Batch Confounding**: ${val}\n`;
    }

    await fs.writeFile(expPath, content, "utf-8");
  }
}
