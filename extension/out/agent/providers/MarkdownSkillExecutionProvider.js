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
exports.MarkdownSkillExecutionProvider = void 0;
const fs = __importStar(require("fs/promises"));
const path = __importStar(require("path"));
const child_process_1 = require("child_process");
const util_1 = require("util");
const execAsync = (0, util_1.promisify)(child_process_1.exec);
class MarkdownSkillExecutionProvider {
    mode = "markdown_skill";
    workspaceRoot = "";
    stepCounter = 1;
    async initialize(workspaceRoot) {
        this.workspaceRoot = workspaceRoot;
        await fs.mkdir(path.join(workspaceRoot, "code"), { recursive: true });
        await fs.mkdir(path.join(workspaceRoot, "logs"), { recursive: true });
        await fs.mkdir(path.join(workspaceRoot, "data"), { recursive: true });
    }
    async dispose() { }
    async executeRChunk(name, rCode) {
        const padded = String(this.stepCounter++).padStart(2, "0");
        const scriptPath = path.join(this.workspaceRoot, "code", `${padded}_${name}.R`);
        const logDir = path.join(this.workspaceRoot, "logs", `${padded}_${name}`);
        await fs.mkdir(logDir, { recursive: true });
        const fullScript = `
library(dplyr)
library(tidyproteomics)

${rCode}
`;
        await fs.writeFile(scriptPath, fullScript.trim() + "\n", "utf-8");
        try {
            const { stdout, stderr } = await execAsync(`Rscript ${scriptPath}`, {
                cwd: this.workspaceRoot,
            });
            await fs.writeFile(path.join(logDir, "console.log"), `STDOUT:\n${stdout}\n\nSTDERR:\n${stderr}`, "utf-8");
            return { success: true, content: stdout || stderr };
        }
        catch (err) {
            await fs.writeFile(path.join(logDir, "console.log"), `ERROR:\n${err.message}`, "utf-8");
            return { success: false, content: err.message, isError: true };
        }
    }
    loadData(source, platform = "ProteomeDiscoverer", analyte = "proteins") {
        const code = source === "hela_proteins"
            ? `rdata <- hela_proteins\nsaveRDS(rdata, "data/tidyproteomics_data.rds")`
            : `rdata <- import("${source}", "${platform}", "${analyte}")\nsaveRDS(rdata, "data/tidyproteomics_data.rds")`;
        return this.executeRChunk("load_data", code);
    }
    inspect(what) {
        const code = `
rdata <- readRDS("data/tidyproteomics_data.rds")
cat("=== SAMPLES ===\\n")
print(get_sample_names(rdata))
cat("\\n=== QUANTS ===\\n")
print(get_quant_names(rdata))
cat("\\n=== ANNOTATIONS ===\\n")
print(get_annotation_terms(rdata))
`;
        return this.executeRChunk("inspect", code);
    }
    summarize(by = "sample", contamination, destination = "print") {
        const contamArg = contamination ? `, contamination = "${contamination}"` : "";
        const code = `
rdata <- readRDS("data/tidyproteomics_data.rds")
rdata %>% summary("${by}"${contamArg}, destination = "${destination}")
`;
        return this.executeRChunk("summary", code);
    }
    subset(expression) {
        const code = `
rdata <- readRDS("data/tidyproteomics_data.rds")
rdata <- rdata %>% subset(${expression})
saveRDS(rdata, "data/tidyproteomics_data.rds")
`;
        return this.executeRChunk("subset", code);
    }
    reassign(target, condition, replace) {
        const fn = target === "origin" ? "origins" : "reassign";
        const code = `
rdata <- readRDS("data/tidyproteomics_data.rds")
rdata <- rdata %>% ${fn}(${condition}, .replace = "${replace}")
saveRDS(rdata, "data/tidyproteomics_data.rds")
`;
        return this.executeRChunk("reassign", code);
    }
    normalize(methods, subsetFilter) {
        const methodsStr = methods.map((m) => `"${m}"`).join(", ");
        const filtArg = subsetFilter ? `${subsetFilter}, ` : "";
        const code = `
rdata <- readRDS("data/tidyproteomics_data.rds")
rdata <- rdata %>% normalize(${filtArg}.method = c(${methodsStr}))
saveRDS(rdata, "data/tidyproteomics_data.rds")
`;
        return this.executeRChunk("normalize", code);
    }
    selectNormalization(method) {
        const normArg = method ? `"${method}"` : "";
        const code = `
rdata <- readRDS("data/tidyproteomics_data.rds")
rdata <- rdata %>% select_normalization(${normArg})
saveRDS(rdata, "data/tidyproteomics_data.rds")
`;
        return this.executeRChunk("select_norm", code);
    }
    impute(method) {
        const code = `
rdata <- readRDS("data/tidyproteomics_data.rds")
rdata <- rdata %>% impute(${method})
saveRDS(rdata, "data/tidyproteomics_data.rds")
`;
        return this.executeRChunk("impute", code);
    }
    collapse(options) {
        const code = `
rdata <- readRDS("data/tidyproteomics_data.rds")
rdata <- rdata %>% collapse()
saveRDS(rdata, "data/tidyproteomics_data.rds")
`;
        return this.executeRChunk("collapse", code);
    }
    expression(contrast, method = "limma", pAdjust = "BH") {
        const code = `
rdata <- readRDS("data/tidyproteomics_data.rds")
rdata <- rdata %>% expression(${contrast}, .method = "${method}", .p.adjust = "${pAdjust}")
saveRDS(rdata, "data/tidyproteomics_data.rds")
`;
        return this.executeRChunk("expression", code);
    }
    enrichment(contrast, terms, method = "gsea") {
        const code = `
rdata <- readRDS("data/tidyproteomics_data.rds")
rdata <- rdata %>% enrichment(${contrast}, .terms = "${terms}", .method = "${method}")
saveRDS(rdata, "data/tidyproteomics_data.rds")
`;
        return this.executeRChunk("enrichment", code);
    }
    batchAnalysis(type) {
        const fn = type === "expressions" ? "analyze_expressions" : "analyze_enrichments";
        const code = `
rdata <- readRDS("data/tidyproteomics_data.rds")
rdata %>% ${fn}()
`;
        return this.executeRChunk("batch_analysis", code);
    }
    intersection(include, exclude) {
        const inc = include ? `.include = c(${include.map((s) => `"${s}"`).join(", ")})` : "";
        const exc = exclude ? `.exclude = c(${exclude.map((s) => `"${s}"`).join(", ")})` : "";
        const args = [inc, exc].filter(Boolean).join(", ");
        const code = `
rdata <- readRDS("data/tidyproteomics_data.rds")
rdata <- rdata %>% intersection(${args})
saveRDS(rdata, "data/tidyproteomics_data.rds")
`;
        return this.executeRChunk("intersection", code);
    }
    extract(values, naRm, saveCsv = "data/extracted.csv") {
        const code = `
rdata <- readRDS("data/tidyproteomics_data.rds")
tbl <- rdata %>% extract()
readr::write_csv(tbl, "${saveCsv}")
`;
        return this.executeRChunk("extract", code);
    }
    plot(type, options = {}) {
        const comp = options.comparison ? `${options.comparison}, ` : "";
        const terms = options.terms ? `.term = "${options.terms}", ` : "";
        const code = `
rdata <- readRDS("data/tidyproteomics_data.rds")
rdata %>% plot_${type}(${comp}${terms}destination = "png")
`;
        return this.executeRChunk(`plot_${type}`, code);
    }
    exportTable(type, options = {}) {
        const fileName = options.file_name || "data/table_export.csv";
        const code = `
rdata <- readRDS("data/tidyproteomics_data.rds")
rdata %>% export_quant(file_name = "${fileName}")
`;
        return this.executeRChunk("export_table", code);
    }
    exportState(rdsPath = "data/tidyproteomics_final.rds", scriptPath = "code/reproduce_final.R") {
        const code = `
rdata <- readRDS("data/tidyproteomics_data.rds")
saveRDS(rdata, "${rdsPath}")
operations(rdata, destination = "save")
`;
        return this.executeRChunk("export_state", code);
    }
    async getAuditTrail() {
        const code = `
rdata <- readRDS("data/tidyproteomics_data.rds")
operations(rdata)
`;
        const res = await this.executeRChunk("operations", code);
        return res.content.split("\n");
    }
}
exports.MarkdownSkillExecutionProvider = MarkdownSkillExecutionProvider;
//# sourceMappingURL=MarkdownSkillExecutionProvider.js.map