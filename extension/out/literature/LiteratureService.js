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
exports.KnowledgeCorpusService = exports.LiteratureService = exports.sanitizeCorpusName = exports.getActiveSynthesisCorpus = exports.readCorpusConfig = exports.getCorporaDir = exports.CORPUS_SCRIPTS_REL_DIR = exports.CORPUS_EXT = exports.CORPUS_CONFIG_FILE = exports.CORPORA_REL_DIR = exports.LITERATURE_SCRIPTS_REL_DIR = exports.LITERATURE_EXT = exports.LITERATURE_CONFIG_FILE = exports.LITERATURE_REL_DIR = void 0;
exports.getLiteratureDir = getLiteratureDir;
exports.readLiteratureConfig = readLiteratureConfig;
exports.getActiveSynthesisLiterature = getActiveSynthesisLiterature;
exports.sanitizeLiteratureName = sanitizeLiteratureName;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const child_process_1 = require("child_process");
/**
 * LiteratureService
 *
 * Manages DuckDB literature databases stored at <workspace>/literature/*.duckdb.
 * All database access is delegated to R (DBI + duckdb) via tools/literature/literature_cli.R so
 * that the extension does not need a native Node DuckDB binding and so that the
 * UI and the agent share a single code path.
 *
 * This module intentionally does NOT import "vscode" so it can be reused by
 * ContextBuilder / PipelineOrchestrator.
 */
exports.LITERATURE_REL_DIR = "literature";
exports.LITERATURE_CONFIG_FILE = "literature_config.json";
exports.LITERATURE_EXT = ".duckdb";
exports.LITERATURE_SCRIPTS_REL_DIR = path.join("tools", "literature");
const JSON_MARKER = "@@LITERATURE_JSON@@";
const LEGACY_JSON_MARKER = "@@CORPUS_JSON@@";
// Backward compatibility constants
exports.CORPORA_REL_DIR = exports.LITERATURE_REL_DIR;
exports.CORPUS_CONFIG_FILE = exports.LITERATURE_CONFIG_FILE;
exports.CORPUS_EXT = exports.LITERATURE_EXT;
exports.CORPUS_SCRIPTS_REL_DIR = exports.LITERATURE_SCRIPTS_REL_DIR;
const PDF_EXTS = new Set([".pdf"]);
const TABLE_EXTS = new Set([".csv", ".tsv", ".xlsx", ".xls"]);
const MAX_SCAN_DEPTH = 3;
const MAX_QUEUE_FILES = 500;
function getLiteratureDir(workspaceRoot) {
    return path.join(workspaceRoot, exports.LITERATURE_REL_DIR);
}
exports.getCorporaDir = getLiteratureDir;
/**
 * Checks for existing legacy .vscode/corpora/ folder and migrates it to ./literature/ if needed.
 */
function autoMigrateLegacyCorpora(workspaceRoot) {
    if (!workspaceRoot)
        return;
    const legacyDir = path.join(workspaceRoot, ".vscode", "corpora");
    const newDir = path.join(workspaceRoot, exports.LITERATURE_REL_DIR);
    if (fs.existsSync(legacyDir) && !fs.existsSync(newDir)) {
        try {
            fs.mkdirSync(newDir, { recursive: true });
            const entries = fs.readdirSync(legacyDir);
            for (const entry of entries) {
                const oldPath = path.join(legacyDir, entry);
                if (entry.toLowerCase().endsWith(exports.LITERATURE_EXT)) {
                    fs.copyFileSync(oldPath, path.join(newDir, entry));
                }
                else if (entry === "corpus_config.json") {
                    try {
                        const raw = fs.readFileSync(oldPath, "utf-8");
                        const parsed = JSON.parse(raw);
                        const active = parsed.activeLiterature || parsed.activeCorpus;
                        const migrated = {
                            activeLiterature: active,
                            activeCorpus: active,
                            useInSynthesis: !!parsed.useInSynthesis,
                            updatedAt: parsed.updatedAt || new Date().toISOString(),
                        };
                        fs.writeFileSync(path.join(newDir, exports.LITERATURE_CONFIG_FILE), JSON.stringify(migrated, null, 2) + "\n", "utf-8");
                    }
                    catch { }
                }
            }
        }
        catch (err) {
            console.warn("[LiteratureService] Auto-migration from .vscode/corpora failed:", err);
        }
    }
}
/** Synchronous, dependency-free reader used by ContextBuilder and the orchestrator. */
function readLiteratureConfig(workspaceRoot) {
    const fallback = { useInSynthesis: false };
    if (!workspaceRoot)
        return fallback;
    autoMigrateLegacyCorpora(workspaceRoot);
    try {
        const configPath = path.join(getLiteratureDir(workspaceRoot), exports.LITERATURE_CONFIG_FILE);
        let raw = "";
        if (fs.existsSync(configPath)) {
            raw = fs.readFileSync(configPath, "utf-8");
        }
        else {
            // Legacy fallback
            const legacyPath = path.join(workspaceRoot, ".vscode", "corpora", "corpus_config.json");
            if (fs.existsSync(legacyPath)) {
                raw = fs.readFileSync(legacyPath, "utf-8");
            }
            else {
                return fallback;
            }
        }
        const parsed = JSON.parse(raw);
        const active = (typeof parsed.activeLiterature === "string" && parsed.activeLiterature) ||
            (typeof parsed.activeCorpus === "string" && parsed.activeCorpus) ||
            undefined;
        return {
            activeLiterature: active,
            activeCorpus: active,
            useInSynthesis: !!parsed.useInSynthesis,
            updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : undefined,
        };
    }
    catch {
        return fallback;
    }
}
exports.readCorpusConfig = readLiteratureConfig;
/**
 * Returns the workspace-relative path of the active literature database if it exists AND the
 * synthesis toggle is enabled; otherwise undefined.
 */
function getActiveSynthesisLiterature(workspaceRoot) {
    const cfg = readLiteratureConfig(workspaceRoot);
    const active = cfg.activeLiterature || cfg.activeCorpus;
    if (!cfg.useInSynthesis || !active)
        return undefined;
    const litDir = getLiteratureDir(workspaceRoot);
    let absPath = path.join(litDir, active);
    if (!fs.existsSync(absPath)) {
        // Check legacy dir
        const legacyPath = path.join(workspaceRoot, ".vscode", "corpora", active);
        if (fs.existsSync(legacyPath)) {
            absPath = legacyPath;
        }
        else {
            return undefined;
        }
    }
    return { relPath: path.join(exports.LITERATURE_REL_DIR, active).replace(/\\/g, "/"), absPath };
}
exports.getActiveSynthesisCorpus = getActiveSynthesisLiterature;
function sanitizeLiteratureName(raw) {
    return String(raw || "")
        .trim()
        .replace(/\.duckdb$/i, "")
        .toLowerCase()
        .replace(/[^a-z0-9_-]+/g, "_")
        .replace(/^_+|_+$/g, "")
        .slice(0, 64);
}
exports.sanitizeCorpusName = sanitizeLiteratureName;
class LiteratureService {
    workspaceRoot;
    extensionPath;
    getRscriptOverride;
    queue = [];
    ingestFolder;
    writeChain = Promise.resolve();
    cachedRscript;
    cachedStats = new Map();
    constructor(workspaceRoot, extensionPath, getRscriptOverride = () => undefined) {
        this.workspaceRoot = workspaceRoot;
        this.extensionPath = extensionPath;
        this.getRscriptOverride = getRscriptOverride;
    }
    setWorkspaceRoot(root) {
        if (root !== this.workspaceRoot) {
            this.workspaceRoot = root || "";
            this.queue = [];
            this.ingestFolder = undefined;
        }
    }
    getWorkspaceRoot() {
        return this.workspaceRoot;
    }
    requireRoot() {
        if (!this.workspaceRoot) {
            throw new Error("No active workspace directory. Open or choose an analysis folder first.");
        }
        return this.workspaceRoot;
    }
    // -------------------------------------------------------------------------
    // Literature database listing / configuration
    // -------------------------------------------------------------------------
    listDatabases() {
        if (!this.workspaceRoot)
            return [];
        autoMigrateLegacyCorpora(this.workspaceRoot);
        const dir = getLiteratureDir(this.workspaceRoot);
        if (!fs.existsSync(dir))
            return [];
        const out = [];
        for (const f of fs.readdirSync(dir)) {
            if (!f.toLowerCase().endsWith(exports.LITERATURE_EXT))
                continue;
            const abs = path.join(dir, f);
            try {
                const st = fs.statSync(abs);
                if (!st.isFile())
                    continue;
                out.push({
                    name: f.slice(0, -exports.LITERATURE_EXT.length),
                    fileName: f,
                    relPath: path.join(exports.LITERATURE_REL_DIR, f).replace(/\\/g, "/"),
                    absPath: abs,
                    sizeBytes: st.size,
                    modified: st.mtime.toISOString(),
                });
            }
            catch {
                // skip unreadable entries
            }
        }
        return out.sort((a, b) => a.name.localeCompare(b.name));
    }
    listCorpora() {
        return this.listDatabases();
    }
    getConfig() {
        return readLiteratureConfig(this.workspaceRoot);
    }
    writeConfig(cfg) {
        const dir = getLiteratureDir(this.requireRoot());
        fs.mkdirSync(dir, { recursive: true });
        const active = cfg.activeLiterature || cfg.activeCorpus;
        const payload = {
            ...cfg,
            activeLiterature: active,
            activeCorpus: active,
            updatedAt: new Date().toISOString(),
        };
        fs.writeFileSync(path.join(dir, exports.LITERATURE_CONFIG_FILE), JSON.stringify(payload, null, 2) + "\n", "utf-8");
    }
    getViewState(busy) {
        const databases = this.listDatabases();
        let config = this.getConfig();
        const active = config.activeLiterature || config.activeCorpus;
        // Drop a stale active pointer if the file was deleted out from under us
        if (active && !databases.some((c) => c.fileName === active)) {
            config = { ...config, activeLiterature: undefined, activeCorpus: undefined };
        }
        const activeInfo = databases.find((c) => c.fileName === active);
        const dir = this.workspaceRoot ? getLiteratureDir(this.workspaceRoot) : "";
        const stats = active ? this.cachedStats.get(path.basename(active)) : undefined;
        return {
            workspaceRoot: this.workspaceRoot,
            literatureDir: dir,
            corporaDir: dir,
            databases,
            literature: databases,
            corpora: databases,
            config,
            activeLiterature: active,
            activeCorpus: active,
            useInSynthesis: !!config.useInSynthesis,
            activeLiteratureInfo: activeInfo,
            activeCorpusInfo: activeInfo,
            ingestFolder: this.ingestFolder,
            queue: [...this.queue],
            ingestionAvailable: true,
            busy,
            isIngesting: busy === "ingesting",
            stats,
        };
    }
    async createDatabase(rawName) {
        const root = this.requireRoot();
        const name = sanitizeLiteratureName(rawName);
        if (!name)
            throw new Error("Literature database name must contain at least one letter or number.");
        const fileName = `${name}${exports.LITERATURE_EXT}`;
        const dir = getLiteratureDir(root);
        fs.mkdirSync(dir, { recursive: true });
        const abs = path.join(dir, fileName);
        if (fs.existsSync(abs))
            throw new Error(`A literature database named '${fileName}' already exists.`);
        const res = await this.runCli("init", [abs, rawName.trim() || name], true);
        if (!res.ok)
            throw new Error(res.error || "Failed to initialize literature database.");
        this.cachedStats.set(fileName, {
            study_count: 0,
            context_count: 0,
            assertion_count: 0,
            unique_symbols: 0,
            organism_count: 0,
            perturbation_count: 0,
            studies: 0,
            contexts: 0,
            assertions: 0,
            symbols: 0,
            organisms: 0,
            perturbations: 0,
        });
        this.syncWorkspaceScripts();
        const cfg = this.getConfig();
        this.writeConfig({ ...cfg, activeLiterature: fileName, activeCorpus: fileName });
        const info = this.listDatabases().find((c) => c.fileName === fileName);
        if (!info)
            throw new Error("Literature database was initialized but could not be found on disk.");
        return info;
    }
    async createCorpus(rawName) {
        return this.createDatabase(rawName);
    }
    setActiveLiterature(fileName) {
        const root = this.requireRoot();
        if (fileName) {
            const abs = path.join(getLiteratureDir(root), path.basename(fileName));
            if (!fs.existsSync(abs))
                throw new Error(`Literature database '${fileName}' not found in ${exports.LITERATURE_REL_DIR}.`);
        }
        const cfg = this.getConfig();
        const base = fileName ? path.basename(fileName) : undefined;
        this.writeConfig({ ...cfg, activeLiterature: base, activeCorpus: base });
        this.syncWorkspaceScripts();
    }
    setActiveCorpus(fileName) {
        this.setActiveLiterature(fileName);
    }
    setUseInSynthesis(enabled) {
        const cfg = this.getConfig();
        this.writeConfig({ ...cfg, useInSynthesis: !!enabled });
        if (enabled)
            this.syncWorkspaceScripts();
    }
    /** Ensures the active literature schema is current (idempotent). */
    async ensureSchema(fileName) {
        const abs = this.resolveLiteraturePath(fileName);
        const res = await this.runCli("init", [abs], true);
        if (!res.ok)
            throw new Error(res.error || "Failed to migrate literature schema.");
    }
    async getStats(fileName) {
        const cfg = this.getConfig();
        const target = fileName || cfg.activeLiterature || cfg.activeCorpus;
        if (!target)
            return { ok: false, error: "No active literature database selected." };
        const res = await this.runCli("stats", [this.resolveLiteraturePath(target)], false);
        if (res.ok && res.data) {
            const raw = res.data.totals || res.data.stats || res.data;
            const normalizedStats = {
                study_count: Number(raw.study_count ?? raw.studies ?? 0),
                context_count: Number(raw.context_count ?? raw.contexts ?? 0),
                assertion_count: Number(raw.assertion_count ?? raw.assertions ?? 0),
                unique_symbols: Number(raw.unique_symbols ?? raw.symbols ?? 0),
                organism_count: Number(raw.organism_count ?? raw.organisms ?? 0),
                perturbation_count: Number(raw.perturbation_count ?? raw.perturbations ?? 0),
                studies: Number(raw.studies ?? raw.study_count ?? 0),
                contexts: Number(raw.contexts ?? raw.context_count ?? 0),
                assertions: Number(raw.assertions ?? raw.assertion_count ?? 0),
                symbols: Number(raw.symbols ?? raw.unique_symbols ?? 0),
                organisms: Number(raw.organisms ?? raw.organism_count ?? 0),
                perturbations: Number(raw.perturbations ?? raw.perturbation_count ?? 0),
            };
            this.cachedStats.set(path.basename(target), normalizedStats);
            return {
                ...res,
                stats: normalizedStats,
                data: {
                    ...res.data,
                    stats: normalizedStats,
                    totals: {
                        ...(res.data.totals || {}),
                        ...normalizedStats,
                    },
                },
            };
        }
        return res;
    }
    async search(query, limit = 50, fileName) {
        const cfg = this.getConfig();
        const target = fileName || cfg.activeLiterature || cfg.activeCorpus;
        if (!target)
            return { ok: false, error: "No active literature database selected." };
        const q = String(query || "").trim();
        if (!q)
            return { ok: false, error: "Enter a protein symbol, alias, functional module, or perturbation." };
        const res = await this.runCli("search", [this.resolveLiteraturePath(target), q, String(limit)], false);
        if (res.ok && res.data) {
            const rows = res.data.rows || res.data.results || [];
            return {
                ...res,
                results: rows,
                rows,
                query: q,
                data: {
                    ...res.data,
                    rows,
                    results: rows,
                },
            };
        }
        return res;
    }
    async generateReport(fileName, outputRelativePath = "docs/literature_database.md") {
        const cfg = this.getConfig();
        const target = fileName || cfg.activeLiterature || cfg.activeCorpus;
        if (!target)
            return { ok: false, error: "No active literature database selected." };
        const dbPath = this.resolveLiteraturePath(target);
        const outPath = path.isAbsolute(outputRelativePath)
            ? outputRelativePath
            : path.join(this.requireRoot(), outputRelativePath);
        return await this.runCli("report", [dbPath, outPath], true);
    }
    resolveLiteraturePath(fileName) {
        const base = path.basename(fileName);
        const withExt = base.toLowerCase().endsWith(exports.LITERATURE_EXT) ? base : `${base}${exports.LITERATURE_EXT}`;
        const primary = path.join(getLiteratureDir(this.requireRoot()), withExt);
        if (fs.existsSync(primary))
            return primary;
        if (this.workspaceRoot) {
            const legacy = path.join(this.workspaceRoot, ".vscode", "corpora", withExt);
            if (fs.existsSync(legacy))
                return legacy;
        }
        return primary;
    }
    // -------------------------------------------------------------------------
    // Ingestion queue (discovery only; processing is handled by the ingestion runner)
    // -------------------------------------------------------------------------
    scanIngestFolder(folder) {
        if (!folder || !fs.existsSync(folder) || !fs.statSync(folder).isDirectory()) {
            throw new Error(`Folder not found: ${folder}`);
        }
        const found = [];
        const walk = (dir, depth) => {
            if (depth > MAX_SCAN_DEPTH || found.length >= MAX_QUEUE_FILES)
                return;
            let entries = [];
            try {
                entries = fs.readdirSync(dir, { withFileTypes: true });
            }
            catch {
                return;
            }
            entries.sort((a, b) => a.name.localeCompare(b.name));
            for (const e of entries) {
                if (e.name.startsWith(".") || e.name.startsWith("~$"))
                    continue;
                const abs = path.join(dir, e.name);
                if (e.isDirectory()) {
                    walk(abs, depth + 1);
                    continue;
                }
                const ext = path.extname(e.name).toLowerCase();
                const kind = PDF_EXTS.has(ext) ? "pdf" : TABLE_EXTS.has(ext) ? "table" : undefined;
                if (!kind)
                    continue;
                let size = 0;
                try {
                    size = fs.statSync(abs).size;
                }
                catch { }
                found.push({
                    id: `q${found.length + 1}`,
                    fileName: e.name,
                    absPath: abs,
                    relPath: path.relative(folder, abs).replace(/\\/g, "/"),
                    kind,
                    sizeBytes: size,
                    stage: "queued",
                });
                if (found.length >= MAX_QUEUE_FILES)
                    return;
            }
        };
        walk(folder, 0);
        this.ingestFolder = folder;
        this.queue = found;
        return [...found];
    }
    clearQueue() {
        this.queue = [];
        this.ingestFolder = undefined;
    }
    updateQueueItem(id, patch) {
        const item = this.queue.find((q) => q.id === id);
        if (item)
            Object.assign(item, patch);
    }
    // -------------------------------------------------------------------------
    // R plumbing
    // -------------------------------------------------------------------------
    /** Copies tools/literature/*.R from extension templates into the workspace so phases can call them. */
    syncWorkspaceScripts() {
        if (!this.workspaceRoot)
            return;
        const srcDir = this.findTemplateScriptsDir();
        if (!srcDir)
            return;
        const destDir = path.join(this.workspaceRoot, exports.LITERATURE_SCRIPTS_REL_DIR);
        try {
            fs.mkdirSync(destDir, { recursive: true });
            for (const f of fs.readdirSync(srcDir)) {
                if (f.endsWith(".R"))
                    fs.copyFileSync(path.join(srcDir, f), path.join(destDir, f));
            }
        }
        catch (err) {
            console.warn("[LiteratureService] Could not sync literature scripts into workspace:", err);
        }
    }
    findTemplateScriptsDir() {
        const candidates = [
            path.join(this.extensionPath, "templates", "shared", "tools", "literature"),
            path.join(this.extensionPath, "extension", "templates", "shared", "tools", "literature"),
            path.join(__dirname, "..", "templates", "shared", "tools", "literature"),
            path.join(__dirname, "..", "..", "templates", "shared", "tools", "literature"),
            // Fallback to legacy
            path.join(this.extensionPath, "templates", "shared", "tools", "corpus"),
            path.join(this.extensionPath, "extension", "templates", "shared", "tools", "corpus"),
            path.join(__dirname, "..", "templates", "shared", "tools", "corpus"),
            path.join(__dirname, "..", "..", "templates", "shared", "tools", "corpus"),
        ];
        return candidates.find((p) => fs.existsSync(path.join(p, "literature_cli.R")) || fs.existsSync(path.join(p, "corpus_cli.R")));
    }
    findCliScript() {
        const tplDir = this.findTemplateScriptsDir();
        if (tplDir) {
            const lit = path.join(tplDir, "literature_cli.R");
            if (fs.existsSync(lit))
                return lit;
            const corp = path.join(tplDir, "corpus_cli.R");
            if (fs.existsSync(corp))
                return corp;
        }
        if (this.workspaceRoot) {
            const wsLit = path.join(this.workspaceRoot, exports.LITERATURE_SCRIPTS_REL_DIR, "literature_cli.R");
            if (fs.existsSync(wsLit))
                return wsLit;
            const wsCorp = path.join(this.workspaceRoot, "tools", "corpus", "corpus_cli.R");
            if (fs.existsSync(wsCorp))
                return wsCorp;
        }
        throw new Error("literature_cli.R not found in extension templates or workspace tools/literature/.");
    }
    /**
     * Resolves an Rscript binary. VS Code launched from the macOS Dock often has a
     * minimal PATH, so common install locations are probed explicitly.
     */
    resolveRscript() {
        const override = (this.getRscriptOverride() || "").trim();
        if (override)
            return override;
        if (this.cachedRscript)
            return this.cachedRscript;
        const candidates = [
            "/usr/local/bin/Rscript",
            "/opt/homebrew/bin/Rscript",
            "/Library/Frameworks/R.framework/Resources/bin/Rscript",
            "/usr/bin/Rscript",
        ];
        const pathDirs = (process.env.PATH || "").split(path.delimiter).filter(Boolean);
        const exe = process.platform === "win32" ? "Rscript.exe" : "Rscript";
        for (const d of pathDirs)
            candidates.unshift(path.join(d, exe));
        const hit = candidates.find((c) => {
            try {
                return fs.statSync(c).isFile();
            }
            catch {
                return false;
            }
        });
        this.cachedRscript = hit || "Rscript";
        return this.cachedRscript;
    }
    /**
     * Runs literature_cli.R. Operations are queued sequentially through writeChain
     * because DuckDB limits concurrent multi-process access to a single file.
     */
    runCli(cmd, args, _isWrite = true, timeoutMs = 120000) {
        const exec = () => this.execR(this.findCliScript(), [cmd, ...args], timeoutMs);
        const next = this.writeChain.then(exec, exec);
        this.writeChain = next.catch(() => undefined);
        return next;
    }
    execR(script, args, timeoutMs) {
        return new Promise((resolve) => {
            let rscript;
            try {
                rscript = this.resolveRscript();
            }
            catch (e) {
                resolve({ ok: false, error: e.message });
                return;
            }
            (0, child_process_1.execFile)(rscript, [script, ...args], { cwd: this.workspaceRoot || undefined, timeout: timeoutMs, maxBuffer: 20 * 1024 * 1024 }, (error, stdout, stderr) => {
                const lines = String(stdout || "").split(/\r?\n/);
                const line = lines.find((l) => l.startsWith(JSON_MARKER) || l.startsWith(LEGACY_JSON_MARKER));
                if (line) {
                    try {
                        const marker = line.startsWith(JSON_MARKER) ? JSON_MARKER : LEGACY_JSON_MARKER;
                        const payload = JSON.parse(line.slice(marker.length));
                        if (payload && payload.ok) {
                            resolve({ ok: true, data: payload, stderr: String(stderr || "") });
                        }
                        else {
                            resolve({ ok: false, error: payload?.error || "Unknown R error", stderr: String(stderr || "") });
                        }
                        return;
                    }
                    catch (parseErr) {
                        resolve({ ok: false, error: `Could not parse R output: ${parseErr.message}`, stderr: String(stderr || "") });
                        return;
                    }
                }
                const errCode = error?.code;
                let msg;
                if (errCode === "ENOENT") {
                    msg = `Rscript not found ('${rscript}'). Install R or set 'tidyproteomicsagent.rscriptPath' in Settings.`;
                }
                else if (error?.killed) {
                    msg = `R process timed out after ${Math.round(timeoutMs / 1000)}s.`;
                }
                else {
                    const tail = String(stderr || error?.message || "").trim().split(/\r?\n/).slice(-6).join("\n");
                    msg = tail || "R process exited without output.";
                }
                resolve({ ok: false, error: msg, stderr: String(stderr || "") });
            });
        });
    }
}
exports.LiteratureService = LiteratureService;
exports.KnowledgeCorpusService = LiteratureService;
//# sourceMappingURL=LiteratureService.js.map