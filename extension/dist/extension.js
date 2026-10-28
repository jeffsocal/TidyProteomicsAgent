"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/extension.ts
var extension_exports = {};
__export(extension_exports, {
  activate: () => activate,
  deactivate: () => deactivate
});
module.exports = __toCommonJS(extension_exports);
var vscode5 = __toESM(require("vscode"));
var fs12 = __toESM(require("fs"));

// src/ui/SidebarViewProvider.ts
var vscode4 = __toESM(require("vscode"));
var path11 = __toESM(require("path"));
var fs11 = __toESM(require("fs"));

// src/orchestrator/PipelineOrchestrator.ts
var vscode = __toESM(require("vscode"));
var fs5 = __toESM(require("fs/promises"));
var path5 = __toESM(require("path"));

// src/agent/ContextBuilder.ts
var fs2 = __toESM(require("fs/promises"));
var path2 = __toESM(require("path"));

// src/literature/LiteratureService.ts
var fs = __toESM(require("fs"));
var path = __toESM(require("path"));
var import_child_process = require("child_process");
var LITERATURE_REL_DIR = "literature";
var LITERATURE_CONFIG_FILE = "literature_config.json";
var LITERATURE_EXT = ".duckdb";
var LITERATURE_SCRIPTS_REL_DIR = path.join("tools", "literature");
var JSON_MARKER = "@@LITERATURE_JSON@@";
var LEGACY_JSON_MARKER = "@@CORPUS_JSON@@";
var PDF_EXTS = /* @__PURE__ */ new Set([".pdf"]);
var TABLE_EXTS = /* @__PURE__ */ new Set([".csv", ".tsv", ".xlsx", ".xls"]);
var MAX_SCAN_DEPTH = 3;
var MAX_QUEUE_FILES = 500;
function getLiteratureDir(workspaceRoot) {
  return path.join(workspaceRoot, LITERATURE_REL_DIR);
}
function autoMigrateLegacyCorpora(workspaceRoot) {
  if (!workspaceRoot)
    return;
  const legacyDir = path.join(workspaceRoot, ".vscode", "corpora");
  const newDir = path.join(workspaceRoot, LITERATURE_REL_DIR);
  if (fs.existsSync(legacyDir) && !fs.existsSync(newDir)) {
    try {
      fs.mkdirSync(newDir, { recursive: true });
      const entries = fs.readdirSync(legacyDir);
      for (const entry of entries) {
        const oldPath = path.join(legacyDir, entry);
        if (entry.toLowerCase().endsWith(LITERATURE_EXT)) {
          fs.copyFileSync(oldPath, path.join(newDir, entry));
        } else if (entry === "corpus_config.json") {
          try {
            const raw = fs.readFileSync(oldPath, "utf-8");
            const parsed = JSON.parse(raw);
            const active = parsed.activeLiterature || parsed.activeCorpus;
            const migrated = {
              activeLiterature: active,
              activeCorpus: active,
              useInSynthesis: !!parsed.useInSynthesis,
              updatedAt: parsed.updatedAt || (/* @__PURE__ */ new Date()).toISOString()
            };
            fs.writeFileSync(path.join(newDir, LITERATURE_CONFIG_FILE), JSON.stringify(migrated, null, 2) + "\n", "utf-8");
          } catch {
          }
        }
      }
    } catch (err) {
      console.warn("[LiteratureService] Auto-migration from .vscode/corpora failed:", err);
    }
  }
}
function readLiteratureConfig(workspaceRoot) {
  const fallback = { useInSynthesis: false };
  if (!workspaceRoot)
    return fallback;
  autoMigrateLegacyCorpora(workspaceRoot);
  try {
    const configPath = path.join(getLiteratureDir(workspaceRoot), LITERATURE_CONFIG_FILE);
    let raw = "";
    if (fs.existsSync(configPath)) {
      raw = fs.readFileSync(configPath, "utf-8");
    } else {
      const legacyPath = path.join(workspaceRoot, ".vscode", "corpora", "corpus_config.json");
      if (fs.existsSync(legacyPath)) {
        raw = fs.readFileSync(legacyPath, "utf-8");
      } else {
        return fallback;
      }
    }
    const parsed = JSON.parse(raw);
    const active = typeof parsed.activeLiterature === "string" && parsed.activeLiterature || typeof parsed.activeCorpus === "string" && parsed.activeCorpus || void 0;
    return {
      activeLiterature: active,
      activeCorpus: active,
      useInSynthesis: !!parsed.useInSynthesis,
      updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : void 0
    };
  } catch {
    return fallback;
  }
}
function getActiveSynthesisLiterature(workspaceRoot) {
  const cfg = readLiteratureConfig(workspaceRoot);
  const active = cfg.activeLiterature || cfg.activeCorpus;
  if (!cfg.useInSynthesis || !active)
    return void 0;
  const litDir = getLiteratureDir(workspaceRoot);
  let absPath = path.join(litDir, active);
  if (!fs.existsSync(absPath)) {
    const legacyPath = path.join(workspaceRoot, ".vscode", "corpora", active);
    if (fs.existsSync(legacyPath)) {
      absPath = legacyPath;
    } else {
      return void 0;
    }
  }
  return { relPath: path.join(LITERATURE_REL_DIR, active).replace(/\\/g, "/"), absPath };
}
function sanitizeLiteratureName(raw) {
  return String(raw || "").trim().replace(/\.duckdb$/i, "").toLowerCase().replace(/[^a-z0-9_-]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 64);
}
var LiteratureService = class {
  constructor(workspaceRoot, extensionPath, getRscriptOverride = () => void 0) {
    this.workspaceRoot = workspaceRoot;
    this.extensionPath = extensionPath;
    this.getRscriptOverride = getRscriptOverride;
  }
  queue = [];
  ingestFolder;
  writeChain = Promise.resolve();
  cachedRscript;
  cachedStats = /* @__PURE__ */ new Map();
  setWorkspaceRoot(root) {
    if (root !== this.workspaceRoot) {
      this.workspaceRoot = root || "";
      this.queue = [];
      this.ingestFolder = void 0;
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
      if (!f.toLowerCase().endsWith(LITERATURE_EXT))
        continue;
      const abs = path.join(dir, f);
      try {
        const st = fs.statSync(abs);
        if (!st.isFile())
          continue;
        out.push({
          name: f.slice(0, -LITERATURE_EXT.length),
          fileName: f,
          relPath: path.join(LITERATURE_REL_DIR, f).replace(/\\/g, "/"),
          absPath: abs,
          sizeBytes: st.size,
          modified: st.mtime.toISOString()
        });
      } catch {
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
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    fs.writeFileSync(path.join(dir, LITERATURE_CONFIG_FILE), JSON.stringify(payload, null, 2) + "\n", "utf-8");
  }
  getViewState(busy) {
    const databases = this.listDatabases();
    let config = this.getConfig();
    const active = config.activeLiterature || config.activeCorpus;
    if (active && !databases.some((c) => c.fileName === active)) {
      config = { ...config, activeLiterature: void 0, activeCorpus: void 0 };
    }
    const activeInfo = databases.find((c) => c.fileName === active);
    const dir = this.workspaceRoot ? getLiteratureDir(this.workspaceRoot) : "";
    const stats = active ? this.cachedStats.get(path.basename(active)) : void 0;
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
      stats
    };
  }
  async createDatabase(rawName) {
    const root = this.requireRoot();
    const name = sanitizeLiteratureName(rawName);
    if (!name)
      throw new Error("Literature database name must contain at least one letter or number.");
    const fileName = `${name}${LITERATURE_EXT}`;
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
      perturbations: 0
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
        throw new Error(`Literature database '${fileName}' not found in ${LITERATURE_REL_DIR}.`);
    }
    const cfg = this.getConfig();
    const base = fileName ? path.basename(fileName) : void 0;
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
        perturbations: Number(raw.perturbations ?? raw.perturbation_count ?? 0)
      };
      this.cachedStats.set(path.basename(target), normalizedStats);
      return {
        ...res,
        stats: normalizedStats,
        data: {
          ...res.data,
          stats: normalizedStats,
          totals: {
            ...res.data.totals || {},
            ...normalizedStats
          }
        }
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
          results: rows
        }
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
    const outPath = path.isAbsolute(outputRelativePath) ? outputRelativePath : path.join(this.requireRoot(), outputRelativePath);
    return await this.runCli("report", [dbPath, outPath], true);
  }
  resolveLiteraturePath(fileName) {
    const base = path.basename(fileName);
    const withExt = base.toLowerCase().endsWith(LITERATURE_EXT) ? base : `${base}${LITERATURE_EXT}`;
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
      } catch {
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
        const kind = PDF_EXTS.has(ext) ? "pdf" : TABLE_EXTS.has(ext) ? "table" : void 0;
        if (!kind)
          continue;
        let size = 0;
        try {
          size = fs.statSync(abs).size;
        } catch {
        }
        found.push({
          id: `q${found.length + 1}`,
          fileName: e.name,
          absPath: abs,
          relPath: path.relative(folder, abs).replace(/\\/g, "/"),
          kind,
          sizeBytes: size,
          stage: "queued"
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
    this.ingestFolder = void 0;
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
    const destDir = path.join(this.workspaceRoot, LITERATURE_SCRIPTS_REL_DIR);
    try {
      fs.mkdirSync(destDir, { recursive: true });
      for (const f of fs.readdirSync(srcDir)) {
        if (f.endsWith(".R"))
          fs.copyFileSync(path.join(srcDir, f), path.join(destDir, f));
      }
    } catch (err) {
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
      path.join(__dirname, "..", "..", "templates", "shared", "tools", "corpus")
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
      const wsLit = path.join(this.workspaceRoot, LITERATURE_SCRIPTS_REL_DIR, "literature_cli.R");
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
      "/usr/bin/Rscript"
    ];
    const pathDirs = (process.env.PATH || "").split(path.delimiter).filter(Boolean);
    const exe = process.platform === "win32" ? "Rscript.exe" : "Rscript";
    for (const d of pathDirs)
      candidates.unshift(path.join(d, exe));
    const hit = candidates.find((c) => {
      try {
        return fs.statSync(c).isFile();
      } catch {
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
  runCli(cmd, args, _isWrite = true, timeoutMs = 12e4) {
    const exec2 = () => this.execR(this.findCliScript(), [cmd, ...args], timeoutMs);
    const next = this.writeChain.then(exec2, exec2);
    this.writeChain = next.catch(() => void 0);
    return next;
  }
  execR(script, args, timeoutMs) {
    return new Promise((resolve3) => {
      let rscript;
      try {
        rscript = this.resolveRscript();
      } catch (e) {
        resolve3({ ok: false, error: e.message });
        return;
      }
      (0, import_child_process.execFile)(
        rscript,
        [script, ...args],
        { cwd: this.workspaceRoot || void 0, timeout: timeoutMs, maxBuffer: 20 * 1024 * 1024 },
        (error, stdout, stderr) => {
          const lines = String(stdout || "").split(/\r?\n/);
          const line = lines.find((l) => l.startsWith(JSON_MARKER) || l.startsWith(LEGACY_JSON_MARKER));
          if (line) {
            try {
              const marker = line.startsWith(JSON_MARKER) ? JSON_MARKER : LEGACY_JSON_MARKER;
              const payload = JSON.parse(line.slice(marker.length));
              if (payload && payload.ok) {
                resolve3({ ok: true, data: payload, stderr: String(stderr || "") });
              } else {
                resolve3({ ok: false, error: payload?.error || "Unknown R error", stderr: String(stderr || "") });
              }
              return;
            } catch (parseErr) {
              resolve3({ ok: false, error: `Could not parse R output: ${parseErr.message}`, stderr: String(stderr || "") });
              return;
            }
          }
          const errCode = error?.code;
          let msg;
          if (errCode === "ENOENT") {
            msg = `Rscript not found ('${rscript}'). Install R or set 'tidyproteomicsagent.rscriptPath' in Settings.`;
          } else if (error?.killed) {
            msg = `R process timed out after ${Math.round(timeoutMs / 1e3)}s.`;
          } else {
            const tail = String(stderr || error?.message || "").trim().split(/\r?\n/).slice(-6).join("\n");
            msg = tail || "R process exited without output.";
          }
          resolve3({ ok: false, error: msg, stderr: String(stderr || "") });
        }
      );
    });
  }
};

// src/agent/ContextBuilder.ts
var ContextBuilder = class {
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
      if (!this.workspaceRoot && !path2.isAbsolute(relPath))
        return "";
      const fullPath = path2.isAbsolute(relPath) ? relPath : path2.join(this.workspaceRoot, relPath);
      return await fs2.readFile(fullPath, "utf-8");
    } catch {
      return "";
    }
  }
  /**
   * Resolves the list of skill names required for a phase.
   * Checks YAML frontmatter in the phase directive first, then applies intelligent phase defaults.
   */
  getSkillsForPhase(_phaseFileName, _phaseContent) {
    return [];
  }
  /**
   * Builds the prompt context for a phase using persistent MCP in-memory tool calling.
   */
  async buildPhaseContext(phaseFileName, _overrideMode) {
    let agentDir = this.promptsDir;
    let protocol = await this.readFileSafe(path2.join(agentDir, "PROTOCOL.md"));
    if (!protocol && agentDir === "agent") {
      const fallback = await this.readFileSafe(path2.join("prompts", "PROTOCOL.md"));
      if (fallback) {
        agentDir = "prompts";
        protocol = fallback;
      } else {
        const tplFallback = await this.readFileSafe(path2.join("extension", "templates", "shared", "agent", "PROTOCOL.md"));
        if (tplFallback) {
          agentDir = path2.join("extension", "templates", "shared", "agent");
          protocol = tplFallback;
        }
      }
    }
    if (!protocol) {
      const clinerules = await this.readFileSafe(".clinerules");
      const instruct = await this.readFileSafe(path2.join(agentDir, "INSTRUCT.md"));
      protocol = `${clinerules}

${instruct}`.trim();
    }
    let phasePath = phaseFileName;
    if (!phaseFileName.includes("/") && !phaseFileName.includes("\\")) {
      phasePath = path2.join(this.analysisDir, phaseFileName);
      const contentCheck = await this.readFileSafe(phasePath);
      if (!contentCheck) {
        const tplPhase = path2.join("extension", "templates", "pipelines", "differential_expression", phaseFileName);
        const tplContent = await this.readFileSafe(tplPhase);
        if (tplContent) {
          phasePath = tplPhase;
        }
      }
    }
    const phaseContent = await this.readFileSafe(phasePath);
    const experiment = await this.readFileSafe(path2.join("docs", "experiment.md"));
    const staticPrefixForCache = `
# AUTONOMOUS ANALYSIS PROTOCOL & QUALITY GATES
${protocol}
`.trim();
    const systemPrompt = staticPrefixForCache;
    const executiveBlackboard = await this.buildExecutiveBlackboard(phaseFileName, "mcp");
    const llm = await this.readFileSafe(path2.join("docs", "llm.md"));
    const blackboardState = `
## CURRENT RUNTIME STATE (Shared Memory)
${executiveBlackboard}

### docs/llm.md (ACTIVE MODEL & AGENT SPECIFICATION - READ ONLY):
${llm || "No active model summary found."}
${this.buildLiteratureSection()}
`.trim();
    const workspaceManifest = await this.buildWorkspaceManifest();
    const engineSection = `
### EXECUTION ENGINE: TIDYPROTEOMICS MCP (Live In-Memory Session)
- **Live Tool Calling Enabled**: The persistent tidyproteomics MCP server is CONNECTED and maintains the S3 dataset in memory. All analysis operations are executed via live \`tpa_*\` MCP tools.
- **Direct Tools Available**: You have direct access to live \`tpa_*\` MCP tools dynamically scoped for this phase.
- **Standard MCP-First Workflow**:
  1. **Phase 1 Ingestion**: Ingest the dataset directly via \`tpa_load(source = "<URL_OR_PATH>", platform = "<PLATFORM>", analyte = "proteins")\`. Remote HTTPS URLs are automatically downloaded to \`data/raw/\` and imported into memory. If custom regex or column mapping adjustments are needed (e.g. bare accession headers without pipes, or LFQ vs raw intensity), export the mapping template with \`tpa_export_config\`, modify the TSV, and pass \`config = "<platform>_<analyte>.tsv"\` to \`tpa_load\`.
  2. **Phase 2+ State Continuity**: In subsequent phases, the dataset is already held in memory from prior phases. If reloading is needed, call \`tpa_load(source = "data/tidyproteomics_data.rds")\`.
  3. **In-Memory Transformation**: Execute subsetting, normalization benchmarking, imputation, and contrast testing directly using the corresponding \`tpa_*\` MCP tools. All tool executions and outputs are automatically recorded to \`logs/<phase>/console.log\`.
  4. **Phase Checkpoint Gates & Artifact Generation**: When completing each phase, invoke \`tpa_export_state(rds_path = "data/tidyproteomics_data.rds", script_path = "code/<NN>_<phase>.R")\`. This automatically saves the data object to \`data/tidyproteomics_data.rds\` and writes the reproducible script to \`code/<NN>_<phase>.R\`, fully satisfying all checkpoint gates.
  5. **No Redundant Script Authoring**: Do NOT author manual R scripts from scratch or run redundant R scripts via 'execute_command' when live 'tpa_*' MCP tools perform the tasks in memory. 'tpa_export_state' produces the required reproducible script automatically.
  6. **Strict Tool Discipline (No Ad-Hoc Python or Shell Data Munging)**: Do NOT invoke Python, pandas, openpyxl, Rscript, or shell scripts via 'execute_command' to inspect, parse, or manipulate dataset files or raw tables. All study metadata, raw acquisition files, sample IDs, condition groups, and replicate layouts MUST be inspected through \`tpa_inspect(what = "experiments")\` and \`tpa_summary()\`.
`.trim();
    const normalizedPhaseName = path2.basename(phaseFileName).replace(/\.md$/, "").toUpperCase();
    const phasePrompt = `
${workspaceManifest ? `${workspaceManifest}

---

` : ""}${blackboardState}

---

## EXPERIMENT SPECIFICATION & DATASET PARAMETERS (docs/experiment.md)
${experiment || "No dataset parameters provided. See docs/experiment.md."}

---

## ACTIVE PHASE DIRECTIVE (${phaseFileName})
${phaseContent}

${engineSection}

### Execution Instructions:
- Adhere strictly to the guidelines and gate checkpoints for this phase.
- Standard Workspace Manifest Pre-Indexed: Key workspace files across code/, data/, docs/, tools/, and logs/ are pre-indexed in [WORKSPACE MANIFEST] above. Do NOT waste Turn 1 calling 'list_directory' to inspect existing files; proceed immediately to phase execution tasks.
- Execute phase tasks directly using the available \`tpa_*\` MCP tools.
- MCP-First Workflow: Do NOT author manual R scripts from scratch or run redundant R scripts via 'execute_command' when live 'tpa_*' MCP tools can perform the transformations in memory. Use 'tpa_export_state' to export the persisted data object and reproducible script ('code/<phase>.R') automatically upon completing in-memory tasks.
- Strict Tool Discipline: Never run ad-hoc Python, pandas, or shell scripts via 'execute_command' to inspect data tables, read Excel sheets, or parse sample metadata. Rely strictly on \`tpa_inspect(what = "experiments")\` for sample, replicate, and file mappings, and \`tpa_summary()\` for quality distributions. 'execute_command' is strictly reserved for environment checks (Phase 0), AST linting ('tools/lint_tidyproteomics.R'), and literature CLI tools ('tools/literature/*').
- Document Editing Discipline: In docs/experiment.md, never overwrite or modify Sections 1 & 2 (user hypotheses and dataset parameters). Update Section 3 (Sample Grouping, Recoding & Contrast Designations) using 'replace_file_content' or 'write_file'. When modifying markdown documents with 'replace_file_content', ensure targetContent matches exact line numbering, bullet styles, and indentation; if making multiple non-contiguous edits to the same document, perform them sequentially across turns or use 'write_file'. Do NOT execute Python or shell scripts (e.g. pathlib, sed, awk) via 'execute_command' to modify documents.
- For scripts and documents under 150 lines, always write or overwrite the full file using 'write_file'.
- When authoring or updating any report or document (e.g. in docs/), reference 'docs/llm.md' and place the metadata header immediately beneath the title:
  Title

  Created: YYYY-MM-DD HH:MM
  Author: PROVIDER | LLM-MODEL
  Agent: TidyProteomicsAgent vX.X.X
- Standardized Note Ownership: Do not directly append phase completion headers or raw execution blocks to docs/notes.md from manual file commands. The orchestration framework automatically records a single, clean markdown summary upon complete_phase(phaseName = "${normalizedPhaseName}", summary = "...").
- Once all checkpoints for this phase are satisfied and verified, invoke complete_phase(phaseName = "${normalizedPhaseName}", summary = "...").
- If a mandatory pre-flight gate, configuration prerequisite, or checkpoint fails and requires user intervention (such as unconfigured placeholders or unconfirmed contrasts in docs/experiment.md Section 3.C), scaffold concrete suggestions directly into Section 3 of docs/experiment.md, then immediately invoke fail_phase(phaseName = "${normalizedPhaseName}", reason = "...", actionableInsights = "...") to halt execution and present actionable insights to the user.
`.trim();
    return {
      systemPrompt,
      phasePrompt,
      blackboardState,
      staticPrefixForCache,
      phaseContent,
      loadedSkillFiles: [],
      phaseSkillFiles: []
    };
  }
  async buildWorkspaceManifest() {
    if (!this.workspaceRoot)
      return "";
    const targetDirs = ["code", "data", "docs", "tools", "logs"];
    const lines = ["[WORKSPACE MANIFEST]"];
    for (const dirName of targetDirs) {
      const fullDir = path2.join(this.workspaceRoot, dirName);
      try {
        const stat5 = await fs2.stat(fullDir);
        if (stat5.isDirectory()) {
          const entries = await fs2.readdir(fullDir);
          const cleanFiles = entries.filter((f) => !f.startsWith(".") && f !== "node_modules").sort();
          if (cleanFiles.length > 0) {
            let displayList;
            if (cleanFiles.length <= 15) {
              displayList = cleanFiles.join(", ");
            } else {
              const head = cleanFiles.slice(0, 12).join(", ");
              displayList = `${head}, ... (${cleanFiles.length} files total)`;
            }
            lines.push(`${dirName}/: ${displayList}`);
          } else {
            lines.push(`${dirName}/: (empty)`);
          }
        }
      } catch {
      }
    }
    if (lines.length === 1)
      return "";
    return lines.join("\n");
  }
  /**
   * Builds a lean, rolling Executive Blackboard for Turn 1 injection.
   * Replaces raw multi-KB docs/notes.md with a lightweight summary containing ONLY:
   * 1. Active Data State (number of proteins, active assay, imputation status)
   * 2. Confirmed Study Design (sample groups, contrast pair)
   * 3. Prior Phase Summary (ONLY the immediately preceding phase summary)
   */
  async buildExecutiveBlackboard(currentPhaseFileName, activeMode = "mcp") {
    const notesContent = await this.readFileSafe(path2.join("docs", "notes.md"));
    const experimentContent = await this.readFileSafe(path2.join("docs", "experiment.md"));
    let proteinCount = "Not yet loaded (pre-ingestion)";
    let activeAssay = "raw (unnormalized)";
    let imputationStatus = "Unimputed / pending Phase 3";
    if (notesContent) {
      const proteinMatches = [...notesContent.matchAll(/(\b\d[\d,]*)\s+(?:human\s+)?proteins\b/gi)];
      if (proteinMatches.length > 0) {
        proteinCount = proteinMatches[proteinMatches.length - 1][1] + " proteins";
      }
      if (/\brandomforest\b/i.test(notesContent)) {
        activeAssay = "randomforest";
      } else if (/\bloess\b/i.test(notesContent)) {
        activeAssay = "loess";
      } else if (/\blinear\b/i.test(notesContent)) {
        activeAssay = "linear";
      } else if (/\bmedian\b/i.test(notesContent)) {
        activeAssay = "median";
      } else if (/\blimma\b/i.test(notesContent)) {
        activeAssay = "limma";
      }
      if (/imput(?:ed|ation)|zero missing|0%\s+missing/i.test(notesContent)) {
        if (/column[\s/-]?min(?:imum)?/i.test(notesContent)) {
          imputationStatus = "Imputed (column-minimum, 0% missing)";
        } else if (/half[\s/-]?min(?:imum)?/i.test(notesContent)) {
          imputationStatus = "Imputed (half-minimum, 0% missing)";
        } else if (/upstream.*imput/i.test(notesContent)) {
          imputationStatus = "Preserved upstream imputation (0% missing)";
        } else if (/0%\s+missing|zero\s+missing/i.test(notesContent)) {
          imputationStatus = "Complete cases / 0% missing";
        } else {
          imputationStatus = "Imputed (post-Phase 3)";
        }
      }
    }
    let contrastPair = "Pending Phase 1 confirmation";
    let sampleGroups = [];
    if (experimentContent) {
      const contrastMatch = experimentContent.match(/###\s*3\.C[^\n]*\n+([^\n\r#]+)/i);
      if (contrastMatch) {
        const raw = contrastMatch[1].replace(/[`*]/g, "").trim();
        if (raw && !raw.includes("[REQUIRED:")) {
          contrastPair = raw;
        }
      }
      const discoveredGroups = /* @__PURE__ */ new Set();
      const match3B = experimentContent.match(/###\s*3\.B[^\n]*\n([\s\S]*?)(?=\n###|$)/i);
      if (match3B) {
        const lines3B = match3B[1].split("\n").filter((l) => l.trim().startsWith("|"));
        for (const line of lines3B) {
          const cols = line.split("|").map((c) => c.trim().replace(/[`*]/g, ""));
          if (cols.length >= 3) {
            const val = cols[2];
            if (val && !val.includes("---") && !/proposed|clean|label|current/i.test(val)) {
              discoveredGroups.add(val);
            }
          }
        }
      }
      if (discoveredGroups.size === 0) {
        const match3A = experimentContent.match(/###\s*3\.A[^\n]*\n([\s\S]*?)(?=\n###|$)/i);
        if (match3A) {
          const lines3A = match3A[1].split("\n").filter((l) => l.trim().startsWith("|"));
          for (const line of lines3A) {
            const cols = line.split("|").map((c) => c.trim().replace(/[`*]/g, ""));
            if (cols.length >= 2) {
              const val = cols[1];
              if (val && !val.includes("---") && !/discovered|sample|group/i.test(val)) {
                discoveredGroups.add(val);
              }
            }
          }
        }
      }
      if (discoveredGroups.size > 0) {
        sampleGroups = Array.from(discoveredGroups);
      }
    }
    if (sampleGroups.length === 0) {
      sampleGroups = ["Pending discovery in Phase 1"];
    }
    let priorPhaseTitle = "Prior Phase";
    let priorPhaseStatus = "COMPLETED";
    let priorPhaseSummary = "No prior phase executed. Initializing pipeline.";
    if (notesContent) {
      const sections = notesContent.split(/\n(?=###\s+)/);
      const parsedRecords = [];
      for (const sec of sections) {
        const fileMatch = sec.match(/- \*\*File\*\*:\s*`([^`]+)`/);
        if (!fileMatch)
          continue;
        const fileName = fileMatch[1].trim();
        const titleMatch = sec.match(/###\s+([^-\n\r]+?)\s*-\s*(COMPLETED|FAILED)/i);
        const title = titleMatch ? titleMatch[1].trim() : fileName;
        const status = titleMatch ? titleMatch[2].toUpperCase() : "COMPLETED";
        const summaryMatch = sec.match(/- \*\*Summary\*\*:\s*\n([\s\S]*?)(?:\n---|\n###|$)/);
        const summary = summaryMatch ? summaryMatch[1].trim() : "";
        if (summary) {
          parsedRecords.push({ title, fileName, status, summary });
        }
      }
      if (parsedRecords.length > 0) {
        const curBase = path2.basename(currentPhaseFileName).toLowerCase();
        let targetIdx = parsedRecords.length - 1;
        for (let i = 0; i < parsedRecords.length; i++) {
          if (path2.basename(parsedRecords[i].fileName).toLowerCase() === curBase) {
            targetIdx = i - 1;
            break;
          }
        }
        if (targetIdx >= 0 && targetIdx < parsedRecords.length) {
          const rec = parsedRecords[targetIdx];
          priorPhaseTitle = rec.title;
          priorPhaseStatus = rec.status;
          priorPhaseSummary = rec.summary;
        } else if (targetIdx === -1) {
          priorPhaseTitle = "Prior Phase";
          priorPhaseStatus = "N/A";
          priorPhaseSummary = "No prior phase executed. Initializing pipeline.";
        } else {
          const rec = parsedRecords[parsedRecords.length - 1];
          priorPhaseTitle = rec.title;
          priorPhaseStatus = rec.status;
          priorPhaseSummary = rec.summary;
        }
      }
    }
    const engineLabel = "Live MCP Server (In-Memory Session)";
    return `
### EXECUTIVE BLACKBOARD (Active Memory):
- **Active Execution Engine**: ${engineLabel}
- **Active Data State**:
  - Quantified Proteins: ${proteinCount}
  - Active Assay / Normalization: ${activeAssay}
  - Imputation Status: ${imputationStatus}
- **Confirmed Study Design**:
  - Active Sample Groups: ${sampleGroups.join(", ")}
  - Confirmed Contrast Pair: ${contrastPair}
- **Prior Phase Summary (${priorPhaseTitle} - ${priorPhaseStatus})**:
${priorPhaseSummary.split("\n").map((line) => `  ${line}`).join("\n")}
`.trim();
  }
  /**
   * Describes the active DuckDB literature database (toggled from the Literature tab).
   * Placed in the dynamic blackboard (not the cached prefix) because it can change between phases.
   */
  buildLiteratureSection() {
    if (!this.workspaceRoot)
      return "";
    const cfg = readLiteratureConfig(this.workspaceRoot);
    const activeName = cfg.activeLiterature || cfg.activeCorpus;
    if (!activeName && !cfg.useInSynthesis)
      return "";
    const active = getActiveSynthesisLiterature(this.workspaceRoot);
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
};

// src/agent/AgentLoop.ts
var AgentLoop = class {
  constructor(phaseName, phaseTitle, client, tools, context, onProgress, chatLogger, isCancelled) {
    this.phaseName = phaseName;
    this.phaseTitle = phaseTitle;
    this.client = client;
    this.tools = tools;
    this.context = context;
    this.onProgress = onProgress;
    this.chatLogger = chatLogger;
    this.isCancelled = isCancelled;
  }
  messages = [];
  totalUsage = {
    promptTokens: 0,
    completionTokens: 0,
    totalTokens: 0,
    cachedPromptTokens: 0
  };
  getTotalUsage() {
    return { ...this.totalUsage };
  }
  async run(maxTurns = 30) {
    const startTimeMs = Date.now();
    this.tools.setActivePhase(this.phaseName);
    this.messages.push({
      role: "user",
      content: this.context.phasePrompt,
      turn: 0
    });
    if (this.chatLogger) {
      this.chatLogger.setPhase(this.phaseName);
      const cfg = this.client.getConfig();
      await this.chatLogger.logPhaseStart({
        phaseTitle: this.phaseTitle || this.phaseName,
        phaseFileName: this.phaseName,
        model: cfg.model,
        provider: cfg.provider,
        systemPromptFiles: [
          "agent/PROTOCOL.md"
        ],
        inputPromptFiles: [
          this.phaseName.includes("/") ? this.phaseName : `analysis/${this.phaseName}`,
          ...this.context.phaseSkillFiles && this.context.phaseSkillFiles.length > 0 ? this.context.phaseSkillFiles : [],
          "docs/experiment.md",
          "Executive Blackboard (Active State & Prior Summary)",
          "docs/llm.md"
        ]
      });
    }
    let turn = 0;
    let completedSummary = "";
    let consecutiveNoToolTurns = 0;
    while (turn < maxTurns) {
      if (this.isCancelled && this.isCancelled()) {
        const stopSummary = "Execution stopped by user.";
        if (this.chatLogger) {
          const durationSeconds2 = Math.round((Date.now() - startTimeMs) / 1e3);
          await this.chatLogger.logPhaseEnd({
            phaseTitle: this.phaseTitle || this.phaseName,
            phaseFileName: this.phaseName,
            success: false,
            summary: stopSummary,
            durationSeconds: durationSeconds2,
            tokensUsed: this.totalUsage,
            turnCount: turn
          });
        }
        return {
          success: false,
          summary: stopSummary,
          tokensUsed: this.totalUsage,
          phaseName: this.phaseName,
          turnCount: turn
        };
      }
      turn++;
      this.onProgress({ type: "thought", data: `Starting Turn ${turn}/${maxTurns}...` });
      let response;
      const maxRetries = 2;
      let attempt = 0;
      let lastError = null;
      while (attempt <= maxRetries) {
        attempt++;
        if (this.isCancelled && this.isCancelled()) {
          break;
        }
        try {
          response = await this.client.chat({
            system: this.context.systemPrompt,
            messages: this.messages,
            tools: this.tools.getDefinitions(this.phaseName, this.context?.phaseContent),
            onToken: (text) => {
              this.onProgress({ type: "text", data: text });
            }
          });
          lastError = null;
          break;
        } catch (err) {
          lastError = err;
          const isRetryable = err.isRetryable === true || err.isTimeout === true || err.isNetworkError === true || err.name === "TimeoutError" || err.name === "AbortError" || err.status === 429 || err.status >= 500 && err.status <= 504 || /timeout|aborted|ETIMEDOUT|ECONNRESET|ECONNREFUSED|ENOTFOUND|ConnectTimeoutError|fetch failed|rate limit|temporar/i.test(
            err.message || ""
          ) || err.cause && /timeout|aborted|ETIMEDOUT|ECONNRESET|ECONNREFUSED|ENOTFOUND|ConnectTimeoutError/i.test(
            (err.cause.name || "") + " " + (err.cause.code || "") + " " + (err.cause.message || "")
          );
          if (isRetryable && attempt <= maxRetries && (!this.isCancelled || !this.isCancelled())) {
            const backoffMs = attempt * 3e3;
            const shortReason = err.message ? err.message.length > 80 ? err.message.slice(0, 77) + "..." : err.message : "Network/API glitch";
            this.onProgress({
              type: "thought",
              data: `Turn ${turn} connection/API glitch on attempt ${attempt}/${maxRetries + 1} (${shortReason}). Retrying in ${backoffMs / 1e3}s...`
            });
            await new Promise((r) => setTimeout(r, backoffMs));
            continue;
          }
          break;
        }
      }
      if (!response) {
        const errorSummary = lastError ? `LLM API Error during turn ${turn}: ${lastError.message}` : "Execution stopped by user.";
        if (this.chatLogger) {
          const durationSeconds2 = Math.round((Date.now() - startTimeMs) / 1e3);
          await this.chatLogger.logPhaseEnd({
            phaseTitle: this.phaseTitle || this.phaseName,
            phaseFileName: this.phaseName,
            success: false,
            summary: errorSummary,
            durationSeconds: durationSeconds2,
            tokensUsed: this.totalUsage,
            turnCount: turn
          });
        }
        return {
          success: false,
          summary: errorSummary,
          tokensUsed: this.totalUsage,
          phaseName: this.phaseName,
          turnCount: turn
        };
      }
      this.totalUsage.promptTokens += response.usage.promptTokens;
      this.totalUsage.completionTokens += response.usage.completionTokens;
      this.totalUsage.totalTokens += response.usage.totalTokens;
      this.totalUsage.cachedPromptTokens = (this.totalUsage.cachedPromptTokens || 0) + (response.usage.cachedPromptTokens || 0);
      this.onProgress({
        type: "tokens",
        data: {
          turn,
          turnUsage: response.usage,
          totalUsage: { ...this.totalUsage }
        }
      });
      this.messages.push({
        role: "assistant",
        content: response.content,
        tool_calls: response.tool_calls,
        turn
      });
      if (this.chatLogger) {
        await this.chatLogger.logAssistantResponse(
          turn,
          response.content,
          response.tool_calls,
          response.usage
        );
      }
      if (response.truncationDetected) {
        const warnMsg = `Output limit reached (finish_reason: "${response.finishReason || "length"}", tokens: ${response.usage.completionTokens}). Generation was truncated.`;
        this.onProgress({
          type: "thought",
          data: warnMsg
        });
        if (this.chatLogger) {
          await this.chatLogger.logTruncationWarning(
            turn,
            response.finishReason || "length",
            response.usage.completionTokens
          );
        }
      }
      if (response.tool_calls && response.tool_calls.length > 0) {
        consecutiveNoToolTurns = 0;
        for (const tc of response.tool_calls) {
          this.onProgress({
            type: "tool_start",
            data: { name: tc.name, args: tc.args }
          });
          const result = await this.tools.execute(tc.name, tc.args);
          this.onProgress({
            type: "tool_end",
            data: { name: tc.name, result: result.content, isError: result.isError }
          });
          let toolMessageContent = result.content;
          let maxChars = 24e3;
          if (tc.name === "read_file") {
            maxChars = 6e4;
          } else if (tc.name === "execute_command") {
            maxChars = 32e3;
          } else if ([
            "list_directory",
            "check_checkpoint_gate",
            "tpa_health",
            "tpa_operations",
            "tpa_export_state",
            "file_exists"
          ].includes(tc.name)) {
            maxChars = 8e3;
          }
          if (toolMessageContent && toolMessageContent.length > maxChars) {
            const headChars = Math.floor(maxChars * 0.55);
            const tailChars = Math.floor(maxChars * 0.35);
            const head = toolMessageContent.slice(0, headChars);
            const tail = toolMessageContent.slice(-tailChars);
            const omitted = toolMessageContent.length - (headChars + tailChars);
            toolMessageContent = `${head}

... [Output truncated: ${omitted.toLocaleString()} characters omitted to preserve context economy. See complete output in workspace/logs/ or inspect with 'read_file'] ...

${tail}`;
          }
          this.messages.push({
            role: "tool",
            tool_call_id: tc.id,
            tool_name: tc.name,
            content: toolMessageContent,
            turn
          });
          if (this.chatLogger) {
            await this.chatLogger.logToolResult(tc.name, tc.id, result.content, result.isError, tc.args);
          }
          if (tc.name === "fail_phase") {
            const failReason = tc.args.reason || "Phase gate or checkpoint failed";
            const actionable = tc.args.actionableInsights || "";
            const summary = actionable ? `[Failed] Pre-flight Gate / Checkpoint: ${failReason}

Actionable Insights:
${actionable}` : `[Failed] Pre-flight Gate / Checkpoint: ${failReason}`;
            const durationSeconds2 = Math.round((Date.now() - startTimeMs) / 1e3);
            if (this.chatLogger) {
              await this.chatLogger.logPhaseEnd({
                phaseTitle: this.phaseTitle || this.phaseName,
                phaseFileName: this.phaseName,
                success: false,
                summary,
                durationSeconds: durationSeconds2,
                tokensUsed: this.totalUsage,
                turnCount: turn
              });
            }
            return {
              success: false,
              summary,
              tokensUsed: this.totalUsage,
              phaseName: this.phaseName,
              turnCount: turn
            };
          }
          if (tc.name === "complete_phase") {
            completedSummary = tc.args.summary || response.content;
            const durationSeconds2 = Math.round((Date.now() - startTimeMs) / 1e3);
            if (this.chatLogger) {
              await this.chatLogger.logPhaseEnd({
                phaseTitle: this.phaseTitle || this.phaseName,
                phaseFileName: this.phaseName,
                success: true,
                summary: completedSummary,
                durationSeconds: durationSeconds2,
                tokensUsed: this.totalUsage,
                turnCount: turn
              });
            }
            return {
              success: true,
              summary: completedSummary,
              tokensUsed: this.totalUsage,
              phaseName: this.phaseName,
              turnCount: turn
            };
          }
        }
      } else {
        consecutiveNoToolTurns++;
        if (response.content.includes("PHASE_COMPLETED") || response.content.includes("CHECKPOINT_PASSED")) {
          const durationSeconds2 = Math.round((Date.now() - startTimeMs) / 1e3);
          if (this.chatLogger) {
            await this.chatLogger.logPhaseEnd({
              phaseTitle: this.phaseTitle || this.phaseName,
              phaseFileName: this.phaseName,
              success: true,
              summary: response.content,
              durationSeconds: durationSeconds2,
              tokensUsed: this.totalUsage,
              turnCount: turn
            });
          }
          return {
            success: true,
            summary: response.content,
            tokensUsed: this.totalUsage,
            phaseName: this.phaseName,
            turnCount: turn
          };
        } else if (this.isPhaseFailureOrHalt(response.content)) {
          const durationSeconds2 = Math.round((Date.now() - startTimeMs) / 1e3);
          if (this.chatLogger) {
            await this.chatLogger.logPhaseEnd({
              phaseTitle: this.phaseTitle || this.phaseName,
              phaseFileName: this.phaseName,
              success: false,
              summary: response.content,
              durationSeconds: durationSeconds2,
              tokensUsed: this.totalUsage,
              turnCount: turn
            });
          }
          return {
            success: false,
            summary: response.content,
            tokensUsed: this.totalUsage,
            phaseName: this.phaseName,
            turnCount: turn
          };
        } else if (consecutiveNoToolTurns >= 2) {
          const summary = `Execution halted: Agent stopped calling tools and provided instructions to user:

${response.content}`;
          const durationSeconds2 = Math.round((Date.now() - startTimeMs) / 1e3);
          if (this.chatLogger) {
            await this.chatLogger.logPhaseEnd({
              phaseTitle: this.phaseTitle || this.phaseName,
              phaseFileName: this.phaseName,
              success: false,
              summary,
              durationSeconds: durationSeconds2,
              tokensUsed: this.totalUsage,
              turnCount: turn
            });
          }
          return {
            success: false,
            summary,
            tokensUsed: this.totalUsage,
            phaseName: this.phaseName,
            turnCount: turn
          };
        } else if (response.truncationDetected) {
          this.messages.push({
            role: "user",
            content: `[System Notice]: Your response reached the maximum output token limit (finish_reason: "${response.finishReason || "length"}", completion tokens: ${response.usage.completionTokens}). Any attempted tool call was truncated before completion and could not be parsed. Please write the output in smaller sections or verify that Max Output Tokens in settings is set sufficiently high.`
          });
        } else {
          this.messages.push({
            role: "user",
            content: "Please execute the required tools to fulfill the objectives of this phase, or call complete_phase when finished, or call fail_phase if a prerequisite/gate failed."
          });
        }
      }
    }
    const failureSummary = `Turn limit reached (${maxTurns} turns) without completing phase checkpoints.`;
    const durationSeconds = Math.round((Date.now() - startTimeMs) / 1e3);
    if (this.chatLogger) {
      await this.chatLogger.logPhaseEnd({
        phaseTitle: this.phaseTitle || this.phaseName,
        phaseFileName: this.phaseName,
        success: false,
        summary: failureSummary,
        durationSeconds,
        tokensUsed: this.totalUsage,
        turnCount: maxTurns
      });
    }
    return {
      success: false,
      summary: failureSummary,
      tokensUsed: this.totalUsage,
      phaseName: this.phaseName,
      turnCount: maxTurns
    };
  }
  isPhaseFailureOrHalt(content) {
    if (!content)
      return false;
    const lower = content.toLowerCase();
    const failurePatterns = [
      /pre-flight\s+gate\s+fail/i,
      /specification\s+gate\s+fail/i,
      /checkpoint\s+gate\s+fail/i,
      /\bgate\s+failed\b/i,
      /\bphase\s+(?:[0-9a-zA-Z_]+\s+)?(?:is\s+blocked|remains\s+blocked|cannot\s+be\s+completed|is\s+halted)\b/i,
      /\bphase_failed\b/i,
      /\bphase_blocked\b/i,
      /\bphase_halted\b/i,
      /\bblocked_specification_gate\b/i,
      /\bhalt(?:ed)?\s+(?:immediately\s+)?with\s+status\s+`?failed`?/i,
      /\bhalt\s+directive\b/i
    ];
    if (failurePatterns.some((pattern) => pattern.test(content))) {
      return true;
    }
    if (content.includes("\u274C") && (lower.includes("placeholder") || lower.includes("blocked") || lower.includes("rerun phase") || lower.includes("gate"))) {
      return true;
    }
    return false;
  }
};

// src/agent/ChatLogger.ts
var fs3 = __toESM(require("fs/promises"));
var path3 = __toESM(require("path"));
var ChatLogger = class {
  constructor(workspaceRoot, initialPhase = "") {
    this.workspaceRoot = workspaceRoot;
    this.workspaceRoot = workspaceRoot || "";
    if (initialPhase) {
      this.setPhase(initialPhase);
    } else {
      this.pipelineLogPath = this.resolveLogPath("logs/pipeline.md");
    }
  }
  currentPhaseTag = "";
  logPath = "";
  consoleLogPath = "";
  pipelineLogPath = "";
  writeQueue = Promise.resolve();
  setWorkspaceRoot(newRoot) {
    this.workspaceRoot = newRoot || "";
    if (this.currentPhaseTag) {
      this.setPhase(this.currentPhaseTag);
    } else {
      this.pipelineLogPath = this.resolveLogPath("logs/pipeline.md");
    }
  }
  /**
   * Switches the active logging context to a specific phase directory:
   *   logs/<phaseTag>/chat.md      -> Phase chat & LLM reasoning trace
   *   logs/<phaseTag>/console.log  -> Raw R / command stdout and stderr
   */
  setPhase(phaseFileNameOrTag) {
    if (!phaseFileNameOrTag)
      return;
    let tag = path3.basename(phaseFileNameOrTag).replace(/\.md$/i, "").toLowerCase();
    if (tag.startsWith("instruct")) {
      tag = "00_install";
    }
    this.currentPhaseTag = tag;
    this.logPath = this.resolveLogPath(`logs/${tag}/chat.md`);
    this.consoleLogPath = this.resolveLogPath(`logs/${tag}/console.log`);
    this.pipelineLogPath = this.resolveLogPath("logs/pipeline.md");
  }
  getPhaseTag() {
    return this.currentPhaseTag;
  }
  getLogPath() {
    return this.logPath || this.pipelineLogPath;
  }
  getConsoleLogPath() {
    return this.consoleLogPath;
  }
  getPipelineLogPath() {
    return this.pipelineLogPath;
  }
  resolveLogPath(fileName) {
    if (path3.isAbsolute(fileName)) {
      return fileName;
    }
    if (!this.workspaceRoot)
      return "";
    return path3.join(this.workspaceRoot, fileName);
  }
  async appendToFile(targetPath, text) {
    if (!this.workspaceRoot || !targetPath)
      return;
    this.writeQueue = this.writeQueue.then(async () => {
      try {
        const dir = path3.dirname(targetPath);
        await fs3.mkdir(dir, { recursive: true });
        await fs3.appendFile(targetPath, text + "\n", "utf-8");
      } catch (err) {
        console.error(`[ChatLogger] Failed to write to ${targetPath}:`, err);
      }
    });
    return this.writeQueue;
  }
  async append(text) {
    const target = this.logPath || this.pipelineLogPath;
    return this.appendToFile(target, text);
  }
  /**
   * Initializes or updates the master logs/pipeline.md summary table.
   */
  async ensurePipelineSummaryHeader() {
    if (!this.workspaceRoot || !this.pipelineLogPath)
      return;
    try {
      await fs3.stat(this.pipelineLogPath);
    } catch {
      const header = [
        "# TidyProteomics Pipeline Execution Summary",
        "",
        "> Master index of autonomous reasoning traces and raw execution logs per phase.",
        "",
        "| Phase | Title | Status | Duration | Total Tokens | Logs |",
        "| :--- | :--- | :--- | :--- | :--- | :--- |"
      ].join("\n");
      await this.appendToFile(this.pipelineLogPath, header);
    }
  }
  /**
   * Logs phase initialization. Documents WHICH prompts were sent into the persistent system frame
   * and dynamic input directives WITHOUT dumping their entire text contents, keeping the log lean.
   */
  async logPhaseStart(params) {
    this.setPhase(params.phaseFileName);
    await this.ensurePipelineSummaryHeader();
    if (this.consoleLogPath) {
      await this.writeQueue.then(async () => {
        try {
          await fs3.mkdir(path3.dirname(this.consoleLogPath), { recursive: true });
          await fs3.appendFile(
            this.consoleLogPath,
            `=== Phase Started: ${params.phaseTitle} [${(/* @__PURE__ */ new Date()).toISOString()}] ===
`,
            "utf-8"
          );
        } catch {
        }
      });
    }
    const timestamp = (/* @__PURE__ */ new Date()).toISOString();
    const systemFiles = params.systemPromptFiles || [
      "agent/PROTOCOL.md",
      "docs/experiment.md"
    ];
    const inputFiles = params.inputPromptFiles || [
      params.phaseFileName.includes("/") ? params.phaseFileName : `analysis/${params.phaseFileName}`,
      "docs/notes.md",
      "docs/llm.md"
    ];
    const lines = [
      "",
      "---",
      "",
      `# [${timestamp}] Phase Start: ${params.phaseTitle}`,
      `- **Phase Directive**: \`${params.phaseFileName}\``,
      `- **Model**: \`${params.model}\` | **Provider**: \`${params.provider}\``,
      `- **Console Output**: [\`logs/${this.currentPhaseTag}/console.log\`](./console.log)`,
      "",
      "### Persistent System Frame (Sent & Cached Prefix)",
      ...systemFiles.map((f) => `- \`${f}\``),
      "",
      "### Input Prompts & Blackboard Directives (Turn 1)",
      ...inputFiles.map((f) => `- \`${f}\``),
      ""
    ];
    await this.append(lines.join("\n"));
  }
  async logAssistantResponse(turn, content, toolCalls, usage) {
    const timestamp = (/* @__PURE__ */ new Date()).toISOString();
    const lines = [
      `### [${timestamp}] Assistant (Turn ${turn})`
    ];
    if (content && content.trim().length > 0) {
      lines.push("");
      lines.push(content.trim());
    }
    if (toolCalls && toolCalls.length > 0) {
      lines.push("");
      lines.push("**Tool Calls**:");
      for (const tc of toolCalls) {
        lines.push(`- **\`${tc.name}\`** (id: \`${tc.id}\`)`);
        lines.push("  ```json");
        lines.push(
          JSON.stringify(tc.args, null, 2).split("\n").map((l) => `  ${l}`).join("\n")
        );
        lines.push("  ```");
      }
    }
    if (usage) {
      const cached = usage.cachedPromptTokens || 0;
      lines.push("");
      lines.push(
        `> **Metrics**: Turn Tokens: **${usage.totalTokens.toLocaleString()}** (Prompt: ${usage.promptTokens.toLocaleString()}, Completion: ${usage.completionTokens.toLocaleString()}, Cached: ${cached.toLocaleString()})`
      );
    }
    lines.push("");
    await this.append(lines.join("\n"));
  }
  async logTruncationWarning(turn, finishReason, completionTokens) {
    const timestamp = (/* @__PURE__ */ new Date()).toISOString();
    const lines = [
      `> **WARNING (Turn ${turn})**: Generation hit output token limit (\`finish_reason: "${finishReason}"\`, completion tokens: **${completionTokens.toLocaleString()}**). Response or pending tool calls were truncated mid-stream!`,
      ""
    ];
    await this.append(lines.join("\n"));
  }
  /**
   * Logs tool results. For `execute_command` (especially R scripts), writes the complete, unvarnished
   * stdout and stderr to `logs/<phaseTag>/console.log` while inserting a lean "Execution Card" into `chat.md`.
   */
  async logToolResult(toolName, callId, result, isError, toolArgs) {
    const timestamp = (/* @__PURE__ */ new Date()).toISOString();
    const status = isError ? "FAILED" : "SUCCESS";
    const cleanResult = result ? result.trim() : "(No output)";
    if (toolName === "execute_command") {
      const command = toolArgs?.command || "(command string unavailable)";
      const isLogSelfInspection = /(?:grep|sed|tail|head|cat|awk|less|more)\b.*logs\/[^\s;&|]+\/console\.log/.test(command);
      if (this.consoleLogPath && !isLogSelfInspection) {
        const consoleEntry = [
          "================================================================================",
          `[${timestamp}] Command: ${command}`,
          `Status: ${status} (id: ${callId})`,
          "================================================================================",
          cleanResult,
          ""
        ].join("\n");
        await this.appendToFile(this.consoleLogPath, consoleEntry);
      }
      const relConsole = `./console.log`;
      const lines2 = [
        `#### [${timestamp}] Tool Result: \`${toolName}\` [${status}] (id: \`${callId}\`)`,
        `- **Command**: \`${command}\``,
        `- **Status**: ${isError ? "\u274C Command failed" : "\u2713 Command executed successfully"}`
      ];
      if (!isLogSelfInspection) {
        lines2.push(`- **Console Output**: Logged to [\`logs/${this.currentPhaseTag}/console.log\`](${relConsole})`);
      }
      if (isError) {
        const rawLines = cleanResult.split("\n");
        const errorLines = rawLines.filter(
          (l) => /error|failed|exception|cannot|fatal/i.test(l)
        );
        const snippetLines = errorLines.length > 0 ? errorLines.slice(-10) : rawLines.slice(-10);
        lines2.push("- **Error Excerpt**:");
        lines2.push("  ```text");
        for (const el of snippetLines) {
          lines2.push(`  ${el.trim()}`);
        }
        lines2.push("  ```");
      } else {
        const passLines = cleanResult.split("\n").filter((l) => /CHECKPOINT.*PASS|ALL_CHECKPOINTS_PASSED|PHASE_.*_PASS/i.test(l)).slice(0, 3);
        if (passLines.length > 0) {
          for (const pl of passLines) {
            lines2.push(`- **Checkpoint Highlight**: \`${pl.trim()}\``);
          }
        } else {
          const lineCount = cleanResult.split("\n").length;
          lines2.push(`- **Console Volume**: ${lineCount.toLocaleString()} lines captured in console.log`);
        }
      }
      lines2.push("");
      await this.append(lines2.join("\n"));
      return;
    }
    if (toolName === "write_file") {
      const filePath = toolArgs?.filePath || "";
      const lines2 = [
        `#### [${timestamp}] Tool Result: \`${toolName}\` [${status}] (id: \`${callId}\`)`,
        `- **Target File**: \`${filePath}\``,
        `- **Result**: ${cleanResult}`,
        ""
      ];
      await this.append(lines2.join("\n"));
      return;
    }
    if (toolName === "read_file") {
      const filePath = toolArgs?.filePath || "";
      const rawLines = cleanResult.split("\n");
      const lines2 = [
        `#### [${timestamp}] Tool Result: \`${toolName}\` [${status}] (id: \`${callId}\`)`,
        `- **Inspected File**: \`${filePath}\``
      ];
      if (rawLines.length > 25) {
        const preview = rawLines.slice(0, 15).join("\n");
        lines2.push("```");
        lines2.push(preview);
        lines2.push(`
... [${(rawLines.length - 15).toLocaleString()} lines omitted in chat log for economy] ...`);
        lines2.push("```");
      } else {
        lines2.push("```");
        lines2.push(cleanResult);
        lines2.push("```");
      }
      lines2.push("");
      await this.append(lines2.join("\n"));
      return;
    }
    const lines = [
      `#### [${timestamp}] Tool Result: \`${toolName}\` [${status}] (id: \`${callId}\`)`,
      "```",
      cleanResult,
      "```",
      ""
    ];
    await this.append(lines.join("\n"));
  }
  async logPhaseEnd(params) {
    const timestamp = (/* @__PURE__ */ new Date()).toISOString();
    const statusIcon = params.success ? "\u2713" : "\u274C";
    const statusText = params.success ? "COMPLETED" : "FAILED";
    const cached = params.tokensUsed.cachedPromptTokens || 0;
    let phaseTag = this.currentPhaseTag;
    if (params.phaseFileName) {
      let t = path3.basename(params.phaseFileName).replace(/\.md$/i, "").toLowerCase();
      if (t.startsWith("instruct")) {
        t = "00_install";
      }
      phaseTag = t;
    }
    const banner = [
      `### [${timestamp}] ${statusIcon} Phase ${statusText}: ${params.phaseTitle}`,
      `- **Duration**: ${params.durationSeconds}s | **Total Turns**: ${params.turnCount}`,
      `- **Cumulative Tokens**: Total: **${params.tokensUsed.totalTokens.toLocaleString()}** | Prompt: ${params.tokensUsed.promptTokens.toLocaleString()} | Completion: ${params.tokensUsed.completionTokens.toLocaleString()} | Cached: ${cached.toLocaleString()}`,
      `- **Logs**: [\`chat.md\`](./chat.md) | [\`console.log\`](./console.log)`,
      "",
      `**Summary**:`,
      params.summary,
      "",
      "---",
      ""
    ].join("\n");
    const targetChatLog = this.resolveLogPath(`logs/${phaseTag}/chat.md`);
    await this.appendToFile(targetChatLog || this.logPath || this.pipelineLogPath, banner);
    if (this.pipelineLogPath) {
      const summaryRow = `| ${statusIcon} **${phaseTag}** | ${params.phaseTitle} | ${statusText} | ${params.durationSeconds}s | ${params.tokensUsed.totalTokens.toLocaleString()} | [Chat](./${phaseTag}/chat.md) \\| [Console](./${phaseTag}/console.log) |`;
      await this.appendToFile(this.pipelineLogPath, summaryRow);
    }
  }
};

// src/orchestrator/ModelSummaryWriter.ts
var fs4 = __toESM(require("fs/promises"));
var path4 = __toESM(require("path"));
function formatDateTime(d = /* @__PURE__ */ new Date()) {
  const pad = (n) => n.toString().padStart(2, "0");
  const year = d.getFullYear();
  const month = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const hours = pad(d.getHours());
  const minutes = pad(d.getMinutes());
  return `${year}-${month}-${day} ${hours}:${minutes}`;
}
function generateActiveModelSummaryMarkdown(config, extensionVersion = "0.1.0", date = /* @__PURE__ */ new Date(), engine = "mcp") {
  const timestampStr = formatDateTime(date);
  const providerStr = (config.provider || "anthropic").toUpperCase();
  const modelStr = config.model || "claude-3-7-sonnet-20250219";
  const cachingStr = config.provider === "anthropic" || config.provider === "openrouter" ? "Active \u26A1" : "Standard";
  const maxTokensStr = (config.maxTokens || 32768).toLocaleString();
  const timeoutStr = `${config.timeoutSeconds || 600}s`;
  const keyStatusStr = config.apiKey ? "Configured" : config.provider === "ollama" ? "Not Required (Local)" : "Missing";
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
| **Execution Engine** | ${engine === "mcp" ? "MCP Server (Live In-Memory)" : "Markdown Skills (Script Generation)"} |
| **Author** | ${authorStr} |
| **Agent** | ${agentStr} |
| **Prompt Caching** | ${cachingStr} |
| **Max Output Tokens** | ${maxTokensStr} |
| **Request Timeout** | ${timeoutStr} |
| **Key Status** | ${keyStatusStr} |
| **Base URL** | ${baseUrlStr} |

---

## Agent Document Header Standard
All agent-authored documents and reports (including \`docs/observations.md\`, \`docs/knowledge.md\`, \`docs/websearch.md\`, \`docs/literature.md\`, \`docs/manuscript.md\`, and any other generated markdown reports) must reference this specification and place the following metadata block immediately below the title:

\`\`\`markdown
Title

Created: YYYY-MM-DD HH:MM
Author: ${authorStr}
Agent: ${agentStr}
\`\`\`
`;
}
async function writeActiveModelSummaryFile(workspaceRoot, config, extensionVersion = "0.1.0", engine = "mcp") {
  if (!workspaceRoot)
    return "";
  const docsDir = path4.join(workspaceRoot, "docs");
  await fs4.mkdir(docsDir, { recursive: true });
  const llmPath = path4.join(docsDir, "llm.md");
  const markdown = generateActiveModelSummaryMarkdown(config, extensionVersion, /* @__PURE__ */ new Date(), engine);
  try {
    const existing = await fs4.readFile(llmPath, "utf-8");
    const stripCreated = (s) => s.replace(/Created:\s*\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}/g, "");
    if (stripCreated(existing) === stripCreated(markdown)) {
      return llmPath;
    }
  } catch {
  }
  await fs4.writeFile(llmPath, markdown, "utf-8");
  return llmPath;
}

// src/orchestrator/PipelineOrchestrator.ts
var PipelineOrchestrator = class {
  constructor(workspaceRoot, client, tools, onStateChange, onLog, extensionVersion = "0.1.0", onAgentActivity, onAgentObservation) {
    this.workspaceRoot = workspaceRoot;
    this.client = client;
    this.tools = tools;
    this.onStateChange = onStateChange;
    this.onLog = onLog;
    this.extensionVersion = extensionVersion;
    this.onAgentActivity = onAgentActivity;
    this.onAgentObservation = onAgentObservation;
    this.workspaceRoot = workspaceRoot || "";
    this.chatLogger = new ChatLogger(this.workspaceRoot);
    if (this.workspaceRoot) {
      this.rescanPhases().catch((err) => {
        console.error("[PipelineOrchestrator] Error rescanning phases:", err);
      });
    }
  }
  phases = [];
  isRunning = false;
  isFullPipelineRunning = false;
  shouldStop = false;
  chatLogger;
  setExtensionVersion(version) {
    this.extensionVersion = version || "0.1.0";
  }
  async syncModelSummary() {
    if (!this.workspaceRoot)
      return "";
    return await writeActiveModelSummaryFile(this.workspaceRoot, this.client.getConfig(), this.extensionVersion);
  }
  ts() {
    const d = /* @__PURE__ */ new Date();
    return d.toTimeString().split(" ")[0];
  }
  logPhase(tag, message, updateLast = false) {
    const line = `[${this.ts()}] ${tag}: ${message}`;
    this.onLog(this.truncateTo(line, 120), updateLast);
  }
  logPipeline(message, updateLast = false) {
    this.logPhase("Pipeline", message, updateLast);
  }
  truncateTo(line, maxLen = 120) {
    if (line.length <= maxLen)
      return line;
    return line.slice(0, maxLen - 3) + "...";
  }
  formatToolHeader(name, args) {
    switch (name) {
      case "execute_command": {
        const cmd = String(args?.command || "").trim().replace(/\s+/g, " ");
        return `[Command] ${cmd}`;
      }
      case "read_file": {
        const filePath = String(args?.filePath || "").trim();
        const range = args?.startLine ? ` (lines ${args.startLine}-${Number(args.startLine) + Number(args.maxLines || 0) - 1})` : "";
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
        const display = !dp || dp === "." || dp === "./" ? "directory contents" : dp;
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
        const cfg = args?.config ? ` (config: ${path5.basename(String(args.config))})` : "";
        return `[MCP Load] ${path5.basename(String(src)) || src}${cfg}`;
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
        return `[MCP Export State] ${path5.basename(String(args?.script_path || "pipeline.R"))}`;
      }
      case "tpa_extract": {
        return `[MCP Extract] ${args?.values || "values"}`;
      }
      case "tpa_operations": {
        return `[MCP Audit Operations]`;
      }
      case "tpa_reassign": {
        const target = args?.target || "sample";
        const desc = args?.mapping ? `${Object.keys(args.mapping).length} sample mappings` : args?.condition ? `${args.condition} -> ${args.replace}` : "";
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
  formatNaturalActivity(name, args, phaseTitle) {
    switch (name) {
      case "tpa_load": {
        const src = args?.source || args?.load_local || "";
        const base = path5.basename(String(src)) || "dataset";
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
        if (what === "overview")
          return "Inspecting dataset topology, sample groups, and protein counts...";
        if (what === "samples")
          return "Auditing sample metadata and replicate annotations...";
        if (what === "operations")
          return "Checking operations history and normalization status...";
        return `Inspecting dataset ${what}...`;
      }
      case "tpa_summary": {
        const by = String(args?.by || args?.what || "sample");
        return `Calculating quality metrics across ${by}s...`;
      }
      case "tpa_normalize": {
        const methods = Array.isArray(args?.methods) ? args.methods.join(", ") : args?.methods || args?.method || "algorithms";
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
        const fp = path5.basename(String(args?.filePath || "file"));
        return `Reading \`${fp}\`...`;
      }
      case "write_file": {
        const fp = path5.basename(String(args?.filePath || "file"));
        return `Writing \`${fp}\`...`;
      }
      case "replace_file_content": {
        const fp = path5.basename(String(args?.filePath || "file"));
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
  extractToolObservation(name, args, result) {
    if (!result || typeof result !== "string")
      return null;
    const res = result.trim();
    if (name === "tpa_load" || name === "tpa_inspect" && args?.what === "overview") {
      const sampleMatch = res.match(/(?:samples?|files?)\s*[:=]\s*(\d+)/i) || res.match(/(\d+)\s+samples?/i);
      const proteinMatch = res.match(/(?:proteins?|peptides?|features?)\s*[:=]\s*([\d,]+)/i) || res.match(/([\d,]+)\s+proteins?/i);
      const missingMatch = res.match(/(?:missing(?:ness)?)\s*[:=]\s*([\d\.]+)%/i) || res.match(/([\d\.]+)%\s+missing/i);
      if (sampleMatch || proteinMatch) {
        const parts = [];
        if (sampleMatch)
          parts.push(`**${sampleMatch[1]}** samples`);
        if (proteinMatch)
          parts.push(`**${proteinMatch[1]}** quantified features`);
        if (missingMatch)
          parts.push(`**${missingMatch[1]}%** missingness`);
        return {
          text: `Dataset topology confirmed: identified ${parts.join(", ")}.`,
          badge: "Topology"
        };
      }
    }
    if (name === "tpa_normalize" || name === "tpa_select_normalization") {
      const cvMatch = res.match(/cv\s*[:=]?\s*([\d\.]+)/i);
      const method = args?.method || (Array.isArray(args?.methods) ? args.methods[0] : args?.methods) || "optimal";
      return {
        text: `Benchmarked normalization candidates. Selected **${method}** normalization${cvMatch ? ` (CV: ${cvMatch[1]})` : ""}.`,
        badge: "Normalization"
      };
    }
    if (name === "tpa_impute") {
      const imputedMatch = res.match(/(\d+[\d,]*|\d+\.?\d*%)\s*(?:imputed|missing)/i);
      const method = args?.algorithm || args?.method || "LOD";
      return {
        text: `Completed missing value imputation using **${method}** strategy${imputedMatch ? ` (${imputedMatch[0]})` : ""}.`,
        badge: "Imputation"
      };
    }
    if (name === "tpa_expression") {
      const sigMatch = res.match(/(\d+)\s*(?:significant|differentially expressed)/i);
      const comp = args?.comparison || args?.contrast || "designated comparison";
      return {
        text: `Differential expression testing complete for \`${comp}\`${sigMatch ? `: detected **${sigMatch[1]}** significant proteins` : ""}.`,
        badge: "Expression"
      };
    }
    if (name === "tpa_enrichment") {
      const term = args?.term || args?.terms || "pathways";
      return {
        text: `Pathway enrichment analysis completed for \`${term}\` ontologies.`,
        badge: "Enrichment"
      };
    }
    return null;
  }
  getIsRunning() {
    return this.isRunning;
  }
  getIsFullPipelineRunning() {
    return this.isFullPipelineRunning;
  }
  async setWorkingDirectory(newRoot) {
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
  getWorkingDirectory() {
    return this.workspaceRoot;
  }
  /**
   * Dynamically inspects the workspace directory for analysis/*.md phases and agent/INSTRUCT.md
   */
  async loadNotesRecords() {
    const map = /* @__PURE__ */ new Map();
    if (!this.workspaceRoot)
      return map;
    try {
      const notesPath = path5.join(this.workspaceRoot, "docs", "notes.md");
      const content = await fs5.readFile(notesPath, "utf-8");
      const sections = content.split(/\n(?=###\s+)/);
      for (const section of sections) {
        const fileMatch = section.match(/- \*\*File\*\*:\s*`([^`]+)`/);
        if (!fileMatch)
          continue;
        const rawFileName = fileMatch[1].trim();
        const durationMatch = section.match(/- \*\*Duration\*\*:\s*(\d+)s/);
        const durationSeconds = durationMatch ? parseInt(durationMatch[1], 10) : void 0;
        const startMatch = section.match(/- \*\*Start\*\*:\s*([^\n\r]+)/);
        const startTime = startMatch ? startMatch[1].trim() : void 0;
        const endMatch = section.match(/- \*\*End\*\*:\s*([^\n\r]+)/);
        const endTime = endMatch ? endMatch[1].trim() : void 0;
        const tokenMatch = section.match(
          /- \*\*Token Usage\*\*:\s*Total:\s*(\d+|N\/A),\s*Prompt:\s*(\d+|N\/A),\s*Completion:\s*(\d+|N\/A)(?:,\s*Cached:\s*(\d+|N\/A))?/i
        );
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
        const summary = summaryMatch ? summaryMatch[1].trim() : void 0;
        const record = { status, durationSeconds, tokenUsage, summary, startTime, endTime };
        map.set(rawFileName, record);
        const base = path5.basename(rawFileName);
        if (!map.has(base)) {
          map.set(base, record);
        }
      }
    } catch {
    }
    try {
      const pipelineLogPath = path5.join(this.workspaceRoot, "logs", "pipeline.md");
      const pipelineContent = await fs5.readFile(pipelineLogPath, "utf-8");
      const lines = pipelineContent.split("\n");
      for (const line of lines) {
        const match = line.match(
          /\|\s*([✓❌⏳\?])\s*\*\*([^\*]+)\*\*\s*\|\s*([^\|]+)\|\s*([A-Z]+)\s*\|\s*(\d+)s\s*\|\s*([\d,]+)\s*\|/i
        );
        if (match) {
          const rawTag = match[2].trim().toLowerCase();
          const statusText = match[4].trim().toUpperCase();
          const status = statusText === "COMPLETED" ? "completed" : statusText === "FAILED" ? "failed" : "pending";
          const durationSeconds = parseInt(match[5], 10);
          const totalTokens = parseInt(match[6].replace(/,/g, ""), 10);
          const record = {
            status,
            durationSeconds,
            tokenUsage: { totalTokens, promptTokens: 0, completionTokens: 0, cachedPromptTokens: 0 },
            summary: void 0
          };
          const existing = map.get(rawTag) || map.get(`${rawTag.toUpperCase()}.md`);
          if (!existing || existing.status !== "completed" && status === "completed") {
            map.set(rawTag, record);
            map.set(`${rawTag.toUpperCase()}.md`, record);
            map.set(`${rawTag}.md`, record);
          }
        }
      }
    } catch {
    }
    return map;
  }
  async forceReloadFromDisk() {
    if (this.isRunning) {
      this.logPipeline("Cannot force reload while an active pipeline run is in flight.");
      return;
    }
    await this.rescanPhases(true);
    this.logPipeline("Reloaded all tasks and progress from disk.");
  }
  async resetAllState() {
    if (this.isRunning) {
      this.logPipeline("Cannot reset state while an active run is in flight.");
      return;
    }
    const notesPath = path5.join(this.workspaceRoot, "docs", "notes.md");
    try {
      const header = `# Autonomous Proteomics Analysis Notes
Model: ${this.client.getConfig().model}

`;
      await fs5.writeFile(notesPath, header, "utf-8");
    } catch {
    }
    for (const p of this.phases) {
      p.status = "pending";
      p.startTime = void 0;
      p.endTime = void 0;
      p.durationSeconds = void 0;
      p.tokenUsage = void 0;
      p.summary = void 0;
      p.error = void 0;
    }
    await this.rescanPhases(true);
    this.logPipeline("State and runtime blackboard reset to initial state.");
  }
  async rescanPhases(forceReload = false) {
    if (this.isRunning) {
      return;
    }
    if (!this.workspaceRoot) {
      this.phases = [];
      await this.notifyState();
      return;
    }
    const notesRecords = await this.loadNotesRecords();
    const existingMap = forceReload ? /* @__PURE__ */ new Map() : new Map(this.phases.map((p) => [p.fileName, p]));
    const enabledMap = new Map(this.phases.map((p) => [p.fileName, p.enabled]));
    const newPhases = [];
    const analysisDir = path5.join(this.workspaceRoot, "analysis");
    let hasSetupInAnalysis = false;
    try {
      const files = await fs5.readdir(analysisDir);
      const mdFiles = files.filter((f) => f.endsWith(".md")).sort();
      for (let i = 0; i < mdFiles.length; i++) {
        const fileName = mdFiles[i];
        if (fileName.startsWith("00_")) {
          hasSetupInAnalysis = true;
        }
        const prev = existingMap.get(fileName);
        const noteRec = notesRecords.get(fileName) || notesRecords.get(path5.basename(fileName)) || notesRecords.get(fileName.replace(/\.md$/i, "").toLowerCase());
        let title = prev?.title;
        if (!title) {
          try {
            const content = await fs5.readFile(path5.join(analysisDir, fileName), "utf-8");
            const firstHeader = content.split("\n").find((l) => l.trim().startsWith("#"));
            if (firstHeader) {
              title = firstHeader.replace(/^#+\s*/, "").trim();
            }
          } catch {
          }
          if (!title) {
            title = fileName.replace(/^[0-9]+[a-zA-Z]?_/, "").replace(/\.md$/, "").replace(/_/g, " ");
            title = `Phase: ${title}`;
          }
        }
        const id = fileName.match(/^([0-9]+[a-zA-Z]?)/)?.[1] || fileName.match(/^([0-9]+)/)?.[1] || String(i + 1).padStart(2, "0");
        const isMaster = fileName.startsWith("00_");
        let resolvedStatus = "pending";
        if (prev?.status && prev.status !== "running") {
          resolvedStatus = prev.status;
        } else if (noteRec?.status) {
          resolvedStatus = noteRec.status;
        }
        const isEnabled = enabledMap.has(fileName) ? enabledMap.get(fileName) : prev ? prev.enabled : true;
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
          error: prev?.error || (resolvedStatus === "failed" ? noteRec?.summary : void 0)
        });
      }
    } catch (e) {
      this.logPipeline(`Note: 'analysis' directory not found in ${this.workspaceRoot}`);
    }
    if (!hasSetupInAnalysis) {
      let instructRel = "agent/INSTRUCT.md";
      let instructPath = path5.join(this.workspaceRoot, "agent", "INSTRUCT.md");
      try {
        await fs5.stat(instructPath);
      } catch {
        instructRel = "prompts/INSTRUCT.md";
        instructPath = path5.join(this.workspaceRoot, "prompts", "INSTRUCT.md");
      }
      try {
        await fs5.stat(instructPath);
        const prev = existingMap.get(instructRel) || existingMap.get("agent/INSTRUCT.md") || existingMap.get("prompts/INSTRUCT.md");
        const noteRec = notesRecords.get(instructRel) || notesRecords.get("agent/INSTRUCT.md") || notesRecords.get("prompts/INSTRUCT.md") || notesRecords.get("INSTRUCT.md");
        let resolvedStatus = "pending";
        if (prev?.status && prev.status !== "running") {
          resolvedStatus = prev.status;
        } else if (noteRec?.status) {
          resolvedStatus = noteRec.status;
        }
        const isEnabled = enabledMap.has(instructRel) ? enabledMap.get(instructRel) : prev ? prev.enabled : true;
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
          error: prev?.error || (resolvedStatus === "failed" ? noteRec?.summary : void 0)
        });
      } catch {
      }
    }
    this.phases = newPhases;
    await this.notifyState();
  }
  async getPromptFiles() {
    let agentDir = "agent";
    try {
      await fs5.stat(path5.join(this.workspaceRoot, "agent"));
    } catch {
      agentDir = "prompts";
    }
    const list = [
      { name: "Analysis Protocol", relPath: `${agentDir}/PROTOCOL.md` },
      { name: "Experiment & Dataset Spec", relPath: "docs/experiment.md" },
      { name: "Shared Memory", relPath: "docs/notes.md" },
      { name: "Active Model Summary", relPath: "docs/llm.md" },
      { name: "Pipeline Summary", relPath: "logs/pipeline.md" }
    ];
    try {
      const logsDir = path5.join(this.workspaceRoot, "logs");
      const entries = await fs5.readdir(logsDir, { withFileTypes: true });
      for (const ent of entries) {
        if (ent.isDirectory()) {
          const phaseDir = ent.name;
          const chatRel = `logs/${phaseDir}/chat.md`;
          const consoleRel = `logs/${phaseDir}/console.log`;
          list.push({ name: `${phaseDir} Chat Trace`, relPath: chatRel });
          list.push({ name: `${phaseDir} Console Log`, relPath: consoleRel });
        }
      }
    } catch {
    }
    try {
      await fs5.stat(path5.join(this.workspaceRoot, "logs/llm_chat.md"));
      list.push({ name: "Legacy LLM Chat Log", relPath: "logs/llm_chat.md" });
    } catch {
    }
    try {
      await fs5.stat(path5.join(this.workspaceRoot, `${agentDir}/BIOLOGY.md`));
      list.splice(1, 0, { name: "Curated Biological Context", relPath: `${agentDir}/BIOLOGY.md` });
    } catch {
    }
    try {
      await fs5.stat(path5.join(this.workspaceRoot, `${agentDir}/VARIABLES.md`));
      list.splice(1, 0, { name: "Legacy Dataset Variables", relPath: `${agentDir}/VARIABLES.md` });
    } catch {
    }
    const result = [];
    for (const item of list) {
      let exists = false;
      try {
        await fs5.stat(path5.join(this.workspaceRoot, item.relPath));
        exists = true;
      } catch {
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
    const analysisDir = path5.join(this.workspaceRoot, "analysis");
    await fs5.mkdir(analysisDir, { recursive: true });
    const fullPath = path5.join(analysisDir, cleanFileName);
    const defaultTitle = title || cleanFileName.replace(/\.md$/, "").replace(/_/g, " ");
    const template = `### Phase: ${defaultTitle}
Construct and execute code for this phase, capturing output to logs.

#### Tasks:
- [ ] Task 1: Initialize step.
- [ ] Task 2: Execute analysis in R or shell.
- [ ] Checkpoint: Verify outputs and log files.
`;
    await fs5.writeFile(fullPath, template, "utf-8");
    await this.rescanPhases();
    return fullPath;
  }
  async removePhase(phaseId) {
    const idx = this.phases.findIndex((p) => p.id === phaseId);
    if (idx !== -1) {
      const phase = this.phases[idx];
      if (!phase.isMasterSetup) {
        try {
          await fs5.unlink(path5.join(this.workspaceRoot, "analysis", phase.fileName));
        } catch {
        }
      }
      this.phases.splice(idx, 1);
      await this.notifyState();
    }
  }
  async getFoldersStatus() {
    let agentFolder = "agent";
    try {
      await fs5.stat(path5.join(this.workspaceRoot, "agent"));
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
      { name: "data", relPath: "data", description: "Raw Input Proteomics Data" }
    ];
    const result = [];
    if (!this.workspaceRoot)
      return result;
    for (const item of list) {
      const full = path5.join(this.workspaceRoot, item.relPath);
      let exists = false;
      let itemCount = 0;
      try {
        const stat5 = await fs5.stat(full);
        if (stat5.isDirectory()) {
          exists = true;
          const files = await fs5.readdir(full);
          itemCount = files.filter((f) => !f.startsWith(".")).length;
        }
      } catch {
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
    const isAnalysisMissingOrEmpty = !this.workspaceRoot || !analysisFolder || !analysisFolder.exists || (analysisFolder.itemCount || 0) === 0 || this.phases.length === 0;
    return {
      workingDirectory: this.workspaceRoot,
      workspaceName: this.workspaceRoot ? path5.basename(this.workspaceRoot) : "No Folder Open",
      model: config.model,
      provider: config.provider,
      startTime: (/* @__PURE__ */ new Date()).toISOString(),
      isRunning: this.isRunning,
      isFullPipelineRunning: this.isFullPipelineRunning,
      currentPhaseIndex: this.phases.findIndex((p) => p.status === "running"),
      phases: this.phases,
      promptFiles,
      folders,
      totalTokens: {
        promptTokens: totalPrompt,
        completionTokens: totalCompletion,
        totalTokens,
        cachedPromptTokens: totalCached
      },
      isAnalysisMissingOrEmpty,
      literature: readLiteratureConfig(this.workspaceRoot),
      knowledgeCorpus: readLiteratureConfig(this.workspaceRoot)
    };
  }
  async notifyState() {
    try {
      const state = await this.getState();
      this.onStateChange(state);
    } catch (err) {
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
    this.logPipeline("Execution stopped by user.");
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
    const filesToRemove = /* @__PURE__ */ new Set();
    for (const p of targetPhases) {
      if (!p.enabled)
        continue;
      filesToRemove.add(p.fileName);
      filesToRemove.add(path5.basename(p.fileName));
      if (p.isMasterSetup) {
        filesToRemove.add("agent/INSTRUCT.md");
        filesToRemove.add("prompts/INSTRUCT.md");
        filesToRemove.add("INSTRUCT.md");
      }
    }
    if (filesToRemove.size === 0)
      return;
    const notesPath = path5.join(this.workspaceRoot, "docs", "notes.md");
    try {
      const content = await fs5.readFile(notesPath, "utf-8");
      const sections = content.split(/\n(?=###\s+)/);
      const kept = [];
      for (const section of sections) {
        const fileMatch = section.match(/- \*\*File\*\*:\s*`([^`]+)`/);
        if (fileMatch) {
          const rawFileName = fileMatch[1].trim();
          const baseName = path5.basename(rawFileName);
          if (filesToRemove.has(rawFileName) || filesToRemove.has(baseName)) {
            continue;
          }
        }
        kept.push(section);
      }
      const updated = kept.join("\n").replace(/\n{3,}/g, "\n\n").trim() + "\n";
      await fs5.writeFile(notesPath, updated, "utf-8");
    } catch {
    }
  }
  /**
   * Run a single phase in isolation with automatic cascading reset of downstream phases
   */
  async runSinglePhase(phaseId) {
    if (this.isRunning) {
      this.logPipeline("Execution busy: A pipeline or phase is already running. Please wait or stop it first.");
      return;
    }
    const phaseIndex = this.phases.findIndex((p) => p.id === phaseId);
    if (phaseIndex === -1) {
      this.logPipeline(`Phase ID '${phaseId}' not found.`);
      return;
    }
    this.isRunning = true;
    this.isFullPipelineRunning = false;
    this.shouldStop = false;
    for (let i = phaseIndex; i < this.phases.length; i++) {
      const p = this.phases[i];
      if (i !== phaseIndex && !p.enabled)
        continue;
      if (i === phaseIndex) {
        p.status = "running";
        p.startTime = (/* @__PURE__ */ new Date()).toISOString();
        p.endTime = void 0;
        p.durationSeconds = void 0;
        p.tokenUsage = void 0;
        p.summary = void 0;
        p.error = void 0;
      } else {
        p.status = "pending";
        p.startTime = void 0;
        p.endTime = void 0;
        p.durationSeconds = void 0;
        p.tokenUsage = void 0;
        p.summary = void 0;
        p.error = void 0;
      }
    }
    await this.pruneNotesFromPhase(phaseIndex);
    await this.notifyState();
    try {
      await this.executePhase(phaseIndex);
    } catch (err) {
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
  async resumePipeline(fromPhaseId) {
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
      startIndex = this.phases.findIndex((p) => p.enabled && p.status !== "completed");
    }
    if (startIndex === -1) {
      startIndex = this.phases.findIndex((p) => p.enabled);
    }
    if (startIndex === -1) {
      this.logPipeline("No enabled analysis tasks found to execute. Please enable at least one task in the pipeline list.");
      return;
    }
    this.isRunning = true;
    this.isFullPipelineRunning = true;
    this.shouldStop = false;
    const startPhase = this.phases[startIndex];
    const hasAnyCompleted = this.phases.some((p) => p.status === "completed");
    const resumeVerb = startIndex === 0 && !hasAnyCompleted ? "Starting" : "Resuming";
    this.logPipeline(`${resumeVerb} autonomous pipeline at ${(/* @__PURE__ */ new Date()).toLocaleTimeString()} from Phase ${startPhase.id} (${startPhase.title})`);
    this.logPipeline(`Working Directory: ${this.workspaceRoot}`);
    for (let i = startIndex; i < this.phases.length; i++) {
      const p = this.phases[i];
      if (!p.enabled)
        continue;
      p.status = "pending";
      p.startTime = void 0;
      p.endTime = void 0;
      p.durationSeconds = void 0;
      p.tokenUsage = void 0;
      p.summary = void 0;
      p.error = void 0;
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
    } catch (err) {
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
  async restartPipeline() {
    return this.runFullPipeline(true);
  }
  /**
   * Run the complete multi-phase pipeline sequentially.
   * If not forced from beginning, automatically resumes from the first incomplete phase.
   */
  async runFullPipeline(forceFromBeginning = false) {
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
    this.isRunning = true;
    this.isFullPipelineRunning = true;
    this.shouldStop = false;
    for (const p of this.phases) {
      if (!p.enabled)
        continue;
      p.status = "pending";
      p.startTime = void 0;
      p.endTime = void 0;
      p.durationSeconds = void 0;
      p.tokenUsage = void 0;
      p.summary = void 0;
      p.error = void 0;
    }
    await this.notifyState();
    this.logPipeline(`Starting autonomous run at ${(/* @__PURE__ */ new Date()).toLocaleTimeString()}`);
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
        await this.pruneNotesFromPhase(i);
        const success = await this.executePhase(i);
        if (!success) {
          this.logPipeline(`Pipeline paused due to checkpoint failure in ${phase.title}`);
          break;
        }
      }
    } catch (err) {
      this.logPipeline(`Full pipeline error: ${err.message}`);
    } finally {
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
    const phaseTag = path5.basename(phase.fileName).replace(/\.md$/i, "");
    const cleanTitle = (phase.title || "").replace(/^Phase\s+\d+:\s*/i, "").trim();
    this.chatLogger.setPhase(phase.fileName);
    phase.status = "running";
    phase.startTime = (/* @__PURE__ */ new Date()).toISOString();
    phase.endTime = void 0;
    phase.error = void 0;
    if (!phase.tokenUsage) {
      phase.tokenUsage = { promptTokens: 0, completionTokens: 0, totalTokens: 0, cachedPromptTokens: 0 };
    }
    const startTimeMs = Date.now();
    await this.notifyState();
    this.logPhase(phaseTag, `[Starting] ${cleanTitle} (${phase.fileName})`);
    let loop;
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
          } else if (event.type === "tool_start") {
            const rawHeader = this.formatToolHeader(event.data.name, event.data.args);
            const prefix = `[${this.ts()}] ${phaseTag}: `;
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
            const naturalAction = this.formatNaturalActivity(event.data.name, event.data.args, cleanTitle);
            this.onAgentActivity?.(phase, naturalAction);
          } else if (event.type === "tool_end") {
            const base = lastToolPendingText ? lastToolPendingText.replace(/\s*\.{3}$/, "") : `[${this.ts()}] ${phaseTag}: [${event.data.name}]`;
            if (event.data.isError) {
              this.onLog(`${base} ... \u274C  [failed]`, true);
              let failSnippet = "failed";
              if (event.data.result) {
                const firstLine = String(event.data.result).trim().split("\n")[0].trim();
                if (firstLine && !firstLine.startsWith("{") && firstLine.length < 50) {
                  failSnippet = `failed: ${firstLine.replace(/^Error:\s*/i, "")}`;
                }
              }
              this.logPhase(phaseTag, `\u274C  ${failSnippet}`, false);
            } else {
              this.onLog(`${base} ...  \u2713 [completed]`, true);
              if (event.data.name === "complete_phase") {
                const summary = event.data.args?.summary || "Phase objectives and quality gates successfully passed.";
                this.onAgentObservation?.(phase, summary, { badge: `Phase ${phase.id} Complete` });
              } else if (event.data.name === "fail_phase") {
                const reason = event.data.args?.reason || "Pipeline checkpoint pause.";
                this.onAgentObservation?.(phase, `\u26A0\uFE0F Halted: ${reason}`, { badge: "Action Required" });
              } else {
                const obs = this.extractToolObservation(event.data.name, event.data.args, event.data.result);
                if (obs) {
                  this.onAgentObservation?.(phase, obs.text, { badge: obs.badge });
                }
              }
            }
            lastToolPendingText = "";
          } else if (event.type === "tokens") {
            const currentPhase2 = getActivePhase();
            currentPhase2.tokenUsage = { ...event.data.totalUsage };
            await this.notifyState();
          }
        },
        this.chatLogger,
        () => this.shouldStop
      );
      const maxTurns = vscode.workspace.getConfiguration("tidyproteomicsagent").get("maxTurns") || 30;
      const result = await loop.run(maxTurns);
      const durationSeconds = Math.max(1, Math.round((Date.now() - startTimeMs) / 1e3));
      const currentPhase = getActivePhase();
      currentPhase.endTime = (/* @__PURE__ */ new Date()).toISOString();
      currentPhase.durationSeconds = durationSeconds;
      currentPhase.tokenUsage = result.tokensUsed;
      currentPhase.summary = result.summary;
      if (result.success) {
        currentPhase.status = "completed";
        this.logPhase(
          phaseTag,
          `[Completed] ${cleanTitle} in ${durationSeconds}s (${result.tokensUsed.totalTokens.toLocaleString()} tokens)`
        );
        await this.appendPhaseRecordToNotes(currentPhase);
        await this.notifyState();
        return true;
      } else {
        currentPhase.status = "failed";
        currentPhase.error = result.summary;
        const summaryText = String(result.summary || "Phase failed").trim();
        const lines = summaryText.split("\n");
        const firstLine = lines[0];
        this.logPhase(phaseTag, `\u274C [Failed] ${cleanTitle}: ${firstLine}`);
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
    } catch (err) {
      const currentPhase = getActivePhase();
      currentPhase.status = "failed";
      currentPhase.error = err.message;
      if (loop && (!currentPhase.tokenUsage || currentPhase.tokenUsage.totalTokens === 0)) {
        currentPhase.tokenUsage = loop.getTotalUsage();
      }
      this.logPhase(phaseTag, `\u274C Error in ${cleanTitle}: ${err.message}`);
      await this.notifyState();
      return false;
    }
  }
  async appendPhaseRecordToNotes(phase) {
    const notesPath = path5.join(this.workspaceRoot, "docs", "notes.md");
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
      await fs5.mkdir(path5.dirname(notesPath), { recursive: true });
      let current = "";
      try {
        current = await fs5.readFile(notesPath, "utf-8");
      } catch {
        current = `# Autonomous Proteomics Analysis Notes
Model: ${this.client.getConfig().model}

`;
      }
      const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const titlePattern = new RegExp(
        `(\\n*###\\s*${escapeRegExp(phase.title)}[\\s\\S]*?(?=\\n###|\\n---\\s*\\n###|$)(?:\\n---\\s*\\n)?)`,
        "i"
      );
      if (titlePattern.test(current)) {
        current = current.replace(titlePattern, entry);
      } else {
        current = current.trimEnd() + "\n" + entry;
      }
      await fs5.writeFile(notesPath, current, "utf-8");
    } catch (e) {
      this.logPipeline(`Warning: Failed to update docs/notes.md: ${e}`);
    }
  }
};

// src/llm/ProviderClient.ts
var ProviderClient = class {
  constructor(config) {
    this.config = config;
  }
  updateConfig(config) {
    this.config = { ...this.config, ...config };
  }
  getConfig() {
    return { ...this.config };
  }
  getTimeoutSeconds() {
    return this.config.timeoutSeconds && this.config.timeoutSeconds > 0 ? this.config.timeoutSeconds : 600;
  }
  getTimeoutMs() {
    return this.getTimeoutSeconds() * 1e3;
  }
  async chat(params) {
    switch (this.config.provider) {
      case "anthropic":
        return this.chatAnthropic(params);
      case "gemini":
        return this.chatGemini(params);
      case "openrouter":
        return this.chatOpenRouter(params);
      case "ollama":
        return this.chatOllama(params);
      case "openai":
      default:
        return this.chatOpenAI(params);
    }
  }
  /**
   * Anthropic Messages API with native Prompt Caching enabled on the static system prompt!
   */
  async chatAnthropic(params) {
    const url = "https://api.anthropic.com/v1/messages";
    const anthropicTools = params.tools.map((t) => ({
      name: t.name,
      description: t.description,
      input_schema: t.parameters
    }));
    const rawAnthropic = [];
    let i = 0;
    while (i < params.messages.length) {
      const msg = params.messages[i];
      if (msg.role === "system") {
        i++;
        continue;
      }
      if (msg.role === "tool") {
        const toolResults = [];
        while (i < params.messages.length && params.messages[i].role === "tool") {
          const tm = params.messages[i];
          toolResults.push({
            type: "tool_result",
            tool_use_id: tm.tool_call_id,
            content: tm.content
          });
          i++;
        }
        rawAnthropic.push({
          role: "user",
          content: toolResults
        });
        continue;
      } else if (msg.role === "assistant" && msg.tool_calls && msg.tool_calls.length > 0) {
        const contentBlocks = [];
        if (msg.content) {
          contentBlocks.push({ type: "text", text: msg.content });
        }
        for (const tc of msg.tool_calls) {
          contentBlocks.push({
            type: "tool_use",
            id: tc.id,
            name: tc.name,
            input: tc.args
          });
        }
        rawAnthropic.push({ role: "assistant", content: contentBlocks });
      } else {
        rawAnthropic.push({
          role: msg.role === "assistant" ? "assistant" : "user",
          content: msg.content
        });
      }
      i++;
    }
    const anthropicMessages = [];
    for (const m of rawAnthropic) {
      const last = anthropicMessages[anthropicMessages.length - 1];
      if (last && last.role === m.role) {
        const lastBlocks = Array.isArray(last.content) ? last.content : [{ type: "text", text: String(last.content) }];
        const currBlocks = Array.isArray(m.content) ? m.content : [{ type: "text", text: String(m.content) }];
        last.content = [...lastBlocks, ...currBlocks];
      } else {
        anthropicMessages.push(m);
      }
    }
    while (anthropicMessages.length > 0 && anthropicMessages[0].role === "assistant") {
      anthropicMessages.shift();
    }
    if (anthropicMessages.length === 0) {
      anthropicMessages.push({ role: "user", content: "Hello" });
    }
    const systemPayload = [
      {
        type: "text",
        text: params.system,
        cache_control: { type: "ephemeral" }
      }
    ];
    const maxTokens = this.config.maxTokens || 16384;
    const body = {
      model: this.config.model || "claude-3-7-sonnet-20250219",
      max_tokens: maxTokens,
      temperature: this.config.temperature ?? 0.2,
      system: systemPayload,
      messages: anthropicMessages,
      tools: anthropicTools
    };
    const timeoutSeconds = this.getTimeoutSeconds();
    let res;
    try {
      res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": this.config.apiKey,
          "anthropic-version": "2023-06-01",
          "anthropic-beta": "prompt-caching-2024-07-31"
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(this.getTimeoutMs())
      });
    } catch (err) {
      this.handleFetchError(err, "Anthropic", url, timeoutSeconds);
    }
    if (!res.ok) {
      await this.handleHttpError(res, "Anthropic", url);
    }
    const data = await res.json();
    let textContent = "";
    const toolCalls = [];
    for (const block of data.content || []) {
      if (block.type === "text") {
        textContent += block.text;
        if (params.onToken)
          params.onToken(block.text);
      } else if (block.type === "tool_use") {
        toolCalls.push({
          id: block.id,
          name: block.name,
          args: block.input || {}
        });
      }
    }
    const stopReason = data.stop_reason;
    const isTruncated = stopReason === "max_tokens";
    if (isTruncated) {
      console.warn(`[ProviderClient] Anthropic generation cut off: hit max_tokens limit (${maxTokens}).`);
    }
    const cacheRead = data.usage?.cache_read_input_tokens || 0;
    const cacheCreation = data.usage?.cache_creation_input_tokens || 0;
    const rawInput = data.usage?.input_tokens || 0;
    const completionTokens = data.usage?.output_tokens || 0;
    const promptTokens = rawInput + cacheRead + cacheCreation;
    const totalTokens = promptTokens + completionTokens;
    const usage = {
      promptTokens,
      completionTokens,
      totalTokens,
      cachedPromptTokens: cacheRead
    };
    return {
      content: textContent,
      tool_calls: toolCalls.length > 0 ? toolCalls : void 0,
      usage,
      finishReason: stopReason,
      truncationDetected: isTruncated
    };
  }
  /**
   * Google Gemini API implementation
   */
  async chatGemini(params) {
    const model = this.config.model || "gemini-1.5-pro";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${this.config.apiKey}`;
    const geminiTools = [
      {
        functionDeclarations: params.tools.map((t) => ({
          name: t.name,
          description: t.description,
          parameters: t.parameters
        }))
      }
    ];
    const rawContents = [];
    let j = 0;
    while (j < params.messages.length) {
      const msg = params.messages[j];
      if (msg.role === "system") {
        j++;
        continue;
      }
      if (msg.role === "tool") {
        const functionParts = [];
        while (j < params.messages.length && params.messages[j].role === "tool") {
          const tm = params.messages[j];
          functionParts.push({
            functionResponse: {
              name: tm.tool_name || tm.tool_call_id || "tool_result",
              response: { output: tm.content }
            }
          });
          j++;
        }
        rawContents.push({ role: "user", parts: functionParts });
        continue;
      } else if (msg.role === "assistant" && msg.tool_calls) {
        const parts = [];
        if (msg.content)
          parts.push({ text: msg.content });
        for (const tc of msg.tool_calls) {
          parts.push({
            functionCall: {
              name: tc.name,
              args: tc.args
            }
          });
        }
        rawContents.push({ role: "model", parts });
      } else {
        rawContents.push({
          role: msg.role === "assistant" ? "model" : "user",
          parts: [{ text: msg.content }]
        });
      }
      j++;
    }
    const contents = [];
    for (const c of rawContents) {
      const last = contents[contents.length - 1];
      if (last && last.role === c.role) {
        last.parts.push(...c.parts);
      } else {
        contents.push(c);
      }
    }
    while (contents.length > 0 && contents[0].role === "model") {
      contents.shift();
    }
    if (contents.length === 0) {
      contents.push({ role: "user", parts: [{ text: "Hello" }] });
    }
    const maxTokens = this.config.maxTokens || 16384;
    const body = {
      systemInstruction: {
        parts: [{ text: params.system }]
      },
      contents,
      tools: geminiTools,
      generationConfig: {
        temperature: this.config.temperature ?? 0.2,
        maxOutputTokens: maxTokens
      }
    };
    const timeoutSeconds = this.getTimeoutSeconds();
    let res;
    try {
      res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(this.getTimeoutMs())
      });
    } catch (err) {
      this.handleFetchError(err, "Gemini", url, timeoutSeconds);
    }
    if (!res.ok) {
      await this.handleHttpError(res, "Gemini", url);
    }
    const data = await res.json();
    const candidate = data.candidates?.[0];
    const finishReason = candidate?.finishReason;
    const isTruncated = finishReason === "MAX_TOKENS";
    if (isTruncated) {
      console.warn(`[ProviderClient] Gemini generation cut off: hit MAX_TOKENS limit (${maxTokens}).`);
    }
    let textContent = "";
    const toolCalls = [];
    for (const part of candidate?.content?.parts || []) {
      if (part.text) {
        textContent += part.text;
        if (params.onToken)
          params.onToken(part.text);
      }
      if (part.functionCall) {
        toolCalls.push({
          id: `call_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          name: part.functionCall.name,
          args: part.functionCall.args || {}
        });
      }
    }
    const promptTokens = data.usageMetadata?.promptTokenCount || 0;
    const completionTokens = data.usageMetadata?.candidatesTokenCount || 0;
    const cachedPromptTokens = data.usageMetadata?.cachedContentTokenCount || 0;
    const totalTokens = data.usageMetadata?.totalTokenCount ?? promptTokens + completionTokens;
    const usage = {
      promptTokens,
      completionTokens,
      totalTokens,
      cachedPromptTokens
    };
    return {
      content: textContent,
      tool_calls: toolCalls.length > 0 ? toolCalls : void 0,
      usage,
      finishReason,
      truncationDetected: isTruncated
    };
  }
  /**
   * OpenAI / Compatible API implementation
   */
  async chatOpenAI(params) {
    const baseUrl = this.config.baseUrl || "https://api.openai.com/v1";
    const url = `${baseUrl}/chat/completions`;
    const openAiTools = params.tools.map((t) => ({
      type: "function",
      function: {
        name: t.name,
        description: t.description,
        parameters: t.parameters
      }
    }));
    const formattedMessages = [{ role: "system", content: params.system }];
    for (const msg of params.messages) {
      if (msg.role === "tool") {
        formattedMessages.push({
          role: "tool",
          tool_call_id: msg.tool_call_id,
          content: msg.content
        });
      } else if (msg.role === "assistant" && msg.tool_calls) {
        formattedMessages.push({
          role: "assistant",
          content: msg.content || null,
          tool_calls: msg.tool_calls.map((tc) => ({
            id: tc.id,
            type: "function",
            function: {
              name: tc.name,
              arguments: JSON.stringify(tc.args)
            }
          }))
        });
      } else {
        formattedMessages.push({
          role: msg.role,
          content: msg.content
        });
      }
    }
    const maxTokens = this.config.maxTokens || 16384;
    const body = {
      model: this.config.model || "gpt-4o",
      messages: formattedMessages,
      tools: openAiTools.length > 0 ? openAiTools : void 0,
      temperature: this.config.temperature ?? 0.2,
      max_tokens: maxTokens
    };
    const timeoutSeconds = this.getTimeoutSeconds();
    let res;
    try {
      res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.config.apiKey}`
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(this.getTimeoutMs())
      });
    } catch (err) {
      this.handleFetchError(err, "OpenAI", url, timeoutSeconds);
    }
    if (!res.ok) {
      await this.handleHttpError(res, "OpenAI", url);
    }
    const data = await res.json();
    const message = data.choices?.[0]?.message;
    const finishReason = data.choices?.[0]?.finish_reason;
    const isTruncated = finishReason === "length" || finishReason === "max_tokens";
    const textContent = message?.content || "";
    if (textContent && params.onToken) {
      params.onToken(textContent);
    }
    const toolCalls = [];
    for (const tc of message?.tool_calls || []) {
      try {
        toolCalls.push({
          id: tc.id,
          name: tc.function.name,
          args: typeof tc.function.arguments === "string" ? JSON.parse(tc.function.arguments) : tc.function.arguments || {}
        });
      } catch (err) {
        console.error(`[ProviderClient] Failed to parse tool call arguments for ${tc.function?.name}:`, err);
        if (isTruncated) {
          console.error(`[ProviderClient] Output truncated at max_tokens (${maxTokens}) with finish_reason="${finishReason}". Tool call JSON was incomplete.`);
        }
      }
    }
    const promptTokens = data.usage?.prompt_tokens || 0;
    const completionTokens = data.usage?.completion_tokens || 0;
    const cachedPromptTokens = data.usage?.prompt_tokens_details?.cached_tokens || 0;
    const totalTokens = data.usage?.total_tokens ?? promptTokens + completionTokens;
    const usage = {
      promptTokens,
      completionTokens,
      totalTokens,
      cachedPromptTokens
    };
    return {
      content: textContent,
      tool_calls: toolCalls.length > 0 ? toolCalls : void 0,
      usage,
      finishReason,
      truncationDetected: isTruncated
    };
  }
  /**
   * OpenRouter API implementation (Unified gateway for Claude, DeepSeek, Llama, Qwen, etc.)
   */
  async chatOpenRouter(params) {
    const baseUrl = (this.config.baseUrl || "https://openrouter.ai/api/v1").replace(/\/+$/, "");
    const url = `${baseUrl}/chat/completions`;
    const openAiTools = params.tools.map((t) => ({
      type: "function",
      function: {
        name: t.name,
        description: t.description,
        parameters: t.parameters
      }
    }));
    const formattedMessages = [{ role: "system", content: params.system }];
    for (const msg of params.messages) {
      if (msg.role === "tool") {
        formattedMessages.push({
          role: "tool",
          tool_call_id: msg.tool_call_id,
          content: msg.content
        });
      } else if (msg.role === "assistant" && msg.tool_calls) {
        formattedMessages.push({
          role: "assistant",
          content: msg.content || null,
          tool_calls: msg.tool_calls.map((tc) => ({
            id: tc.id,
            type: "function",
            function: {
              name: tc.name,
              arguments: JSON.stringify(tc.args)
            }
          }))
        });
      } else {
        formattedMessages.push({
          role: msg.role,
          content: msg.content
        });
      }
    }
    const maxTokens = this.config.maxTokens || 32768;
    const body = {
      model: this.config.model || "anthropic/claude-3.7-sonnet",
      messages: formattedMessages,
      tools: openAiTools.length > 0 ? openAiTools : void 0,
      temperature: this.config.temperature ?? 0.2,
      max_tokens: maxTokens
    };
    const timeoutSeconds = this.getTimeoutSeconds();
    let res;
    try {
      res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.config.apiKey}`,
          "HTTP-Referer": "https://github.com/tidyproteomicsagent",
          "X-Title": "TidyProteomicsAgent"
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(this.getTimeoutMs())
      });
    } catch (err) {
      this.handleFetchError(err, "OpenRouter", url, timeoutSeconds);
    }
    if (!res.ok) {
      await this.handleHttpError(res, "OpenRouter", url);
    }
    const data = await res.json();
    const message = data.choices?.[0]?.message;
    const finishReason = data.choices?.[0]?.finish_reason;
    const isTruncated = finishReason === "length" || finishReason === "max_tokens";
    const textContent = message?.content || "";
    if (textContent && params.onToken) {
      params.onToken(textContent);
    }
    const toolCalls = [];
    for (const tc of message?.tool_calls || []) {
      try {
        toolCalls.push({
          id: tc.id,
          name: tc.function.name,
          args: typeof tc.function.arguments === "string" ? JSON.parse(tc.function.arguments) : tc.function.arguments || {}
        });
      } catch (err) {
        console.error(`[ProviderClient] Failed to parse tool call arguments for ${tc.function?.name}:`, err);
        if (isTruncated) {
          console.error(`[ProviderClient] Output truncated at max_tokens (${maxTokens}) with finish_reason="${finishReason}". Tool call JSON was incomplete.`);
        }
      }
    }
    const promptTokens = data.usage?.prompt_tokens || 0;
    const completionTokens = data.usage?.completion_tokens || 0;
    const cachedPromptTokens = data.usage?.prompt_tokens_details?.cached_tokens ?? data.usage?.cache_read_input_tokens ?? 0;
    const totalTokens = data.usage?.total_tokens ?? promptTokens + completionTokens;
    const usage = {
      promptTokens,
      completionTokens,
      totalTokens,
      cachedPromptTokens
    };
    return {
      content: textContent,
      tool_calls: toolCalls.length > 0 ? toolCalls : void 0,
      usage,
      finishReason,
      truncationDetected: isTruncated
    };
  }
  /**
   * Remote Hosted Ollama API implementation (OpenAI-compatible endpoint with function calling)
   */
  async chatOllama(params) {
    let baseUrl = (this.config.baseUrl || "http://localhost:11434").replace(/\/+$/, "");
    if (!baseUrl.endsWith("/v1")) {
      baseUrl += "/v1";
    }
    const url = `${baseUrl}/chat/completions`;
    const openAiTools = params.tools.map((t) => ({
      type: "function",
      function: {
        name: t.name,
        description: t.description,
        parameters: t.parameters
      }
    }));
    const formattedMessages = [{ role: "system", content: params.system }];
    for (const msg of params.messages) {
      if (msg.role === "tool") {
        formattedMessages.push({
          role: "tool",
          tool_call_id: msg.tool_call_id,
          content: msg.content
        });
      } else if (msg.role === "assistant" && msg.tool_calls) {
        formattedMessages.push({
          role: "assistant",
          content: msg.content || null,
          tool_calls: msg.tool_calls.map((tc) => ({
            id: tc.id,
            type: "function",
            function: {
              name: tc.name,
              arguments: JSON.stringify(tc.args)
            }
          }))
        });
      } else {
        formattedMessages.push({
          role: msg.role,
          content: msg.content
        });
      }
    }
    const maxTokens = this.config.maxTokens || 16384;
    const body = {
      model: this.config.model || "llama3.3:70b",
      messages: formattedMessages,
      tools: openAiTools.length > 0 ? openAiTools : void 0,
      temperature: this.config.temperature ?? 0.2,
      max_tokens: maxTokens,
      options: {
        num_predict: maxTokens
      },
      stream: false
    };
    const headers = {
      "Content-Type": "application/json"
    };
    if (this.config.apiKey) {
      headers["Authorization"] = `Bearer ${this.config.apiKey}`;
    }
    const timeoutSeconds = this.getTimeoutSeconds();
    let res;
    try {
      res = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(this.getTimeoutMs())
      });
    } catch (err) {
      this.handleFetchError(err, "Remote Ollama", url, timeoutSeconds);
    }
    if (!res.ok) {
      await this.handleHttpError(res, "Remote Ollama", url);
    }
    const data = await res.json();
    const message = data.choices?.[0]?.message;
    const finishReason = data.choices?.[0]?.finish_reason || data.done_reason;
    const isTruncated = finishReason === "length";
    const textContent = message?.content || "";
    if (textContent && params.onToken) {
      params.onToken(textContent);
    }
    const toolCalls = [];
    for (const tc of message?.tool_calls || []) {
      try {
        toolCalls.push({
          id: tc.id || `call_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          name: tc.function.name,
          args: typeof tc.function.arguments === "string" ? JSON.parse(tc.function.arguments) : tc.function.arguments || {}
        });
      } catch (err) {
        console.error(`[ProviderClient] Failed to parse tool call arguments for ${tc.function?.name}:`, err);
        if (isTruncated) {
          console.error(`[ProviderClient] Output truncated at max_tokens (${maxTokens}) with finish_reason="${finishReason}".`);
        }
      }
    }
    const promptTokens = data.usage?.prompt_tokens ?? data.prompt_eval_count ?? 0;
    const completionTokens = data.usage?.completion_tokens ?? data.eval_count ?? 0;
    const totalTokens = data.usage?.total_tokens ?? promptTokens + completionTokens;
    const usage = {
      promptTokens,
      completionTokens,
      totalTokens,
      cachedPromptTokens: 0
    };
    return {
      content: textContent,
      tool_calls: toolCalls.length > 0 ? toolCalls : void 0,
      usage,
      finishReason,
      truncationDetected: isTruncated
    };
  }
  /**
   * Translates low-level fetch/network/timeout errors into actionable diagnostic Error objects.
   */
  handleFetchError(err, providerLabel, url, timeoutSeconds) {
    const isTimeout = err.name === "TimeoutError" || err.name === "AbortError" || /timeout|aborted|ETIMEDOUT/i.test(err.message || "");
    if (isTimeout) {
      const e2 = new Error(
        `${providerLabel} API request timed out after ${timeoutSeconds}s at ${url}. Increase Request Timeout in settings if running large models or heavy synthesis turns.`
      );
      e2.isTimeout = true;
      e2.isRetryable = true;
      throw e2;
    }
    const cause = err.cause;
    const causeName = cause?.name || "";
    const causeCode = cause?.code || "";
    const causeMsg = cause?.message || "";
    if (causeName === "ConnectTimeoutError" || causeCode === "UND_ERR_CONNECT_TIMEOUT") {
      const e2 = new Error(
        `${providerLabel} connection timed out establishing connection to ${url}. Check your internet connection, VPN, or firewall settings (ConnectTimeoutError).`
      );
      e2.isNetworkError = true;
      e2.isRetryable = true;
      throw e2;
    }
    if (causeCode === "ENOTFOUND" || /getaddrinfo ENOTFOUND/i.test(causeMsg)) {
      const e2 = new Error(
        `${providerLabel} host lookup failed at ${url}. Unable to resolve host via DNS. Check internet connection or DNS configuration (ENOTFOUND).`
      );
      e2.isNetworkError = true;
      e2.isRetryable = true;
      throw e2;
    }
    if (causeCode === "ECONNREFUSED") {
      const e2 = new Error(
        `${providerLabel} connection refused at ${url}. Ensure the server/endpoint is active and reachable (ECONNREFUSED).`
      );
      e2.isNetworkError = true;
      e2.isRetryable = true;
      throw e2;
    }
    if (causeCode === "ECONNRESET") {
      const e2 = new Error(
        `${providerLabel} connection reset by peer at ${url}. The connection was unexpectedly closed (ECONNRESET).`
      );
      e2.isNetworkError = true;
      e2.isRetryable = true;
      throw e2;
    }
    if (/CERT_|certificate|SSL|TLS/i.test(causeCode + " " + causeMsg)) {
      const e2 = new Error(
        `${providerLabel} SSL/TLS certificate verification failed for ${url} (${causeCode || causeMsg}). Check system clock and SSL proxy settings.`
      );
      e2.isNetworkError = true;
      e2.isRetryable = false;
      throw e2;
    }
    if (err.message === "fetch failed") {
      const detail = causeMsg || causeCode || "unable to connect";
      const e2 = new Error(
        `${providerLabel} network connection failed connecting to ${url} (${detail}). Verify internet access and provider endpoint.`
      );
      e2.isNetworkError = true;
      e2.isRetryable = true;
      throw e2;
    }
    const e = new Error(`${providerLabel} request failed: ${err.message || String(err)}`);
    e.isNetworkError = true;
    e.isRetryable = true;
    throw e;
  }
  /**
   * Formats HTTP error status codes with targeted, actionable diagnostics.
   */
  async handleHttpError(res, providerLabel, url) {
    const rawText = await res.text().catch(() => "");
    let cleanMessage = rawText.trim();
    try {
      const parsed = JSON.parse(rawText);
      cleanMessage = parsed.error?.message || parsed.message || parsed.error || rawText;
      if (typeof cleanMessage === "object")
        cleanMessage = JSON.stringify(cleanMessage);
    } catch (_) {
    }
    let friendly = "";
    let isRetryable = false;
    switch (res.status) {
      case 401:
        friendly = `${providerLabel} authentication failed (HTTP 401): Invalid or missing API key. Please check your credentials in settings.`;
        break;
      case 402:
        friendly = `${providerLabel} payment required (HTTP 402): Insufficient credits or account balance limit reached.`;
        break;
      case 403:
        friendly = `${providerLabel} access forbidden (HTTP 403): Account lacks permission for this model or region.`;
        break;
      case 404:
        friendly = `${providerLabel} resource not found (HTTP 404): The specified model '${this.config.model}' or endpoint does not exist.`;
        break;
      case 429:
        friendly = `${providerLabel} rate limited (HTTP 429): Request or token quota exceeded. Retrying may succeed.`;
        isRetryable = true;
        break;
      case 500:
      case 502:
      case 503:
      case 504:
        friendly = `${providerLabel} server error (HTTP ${res.status}): Provider service is temporarily degraded or undergoing maintenance.`;
        isRetryable = true;
        break;
      default:
        friendly = `${providerLabel} API error (${res.status}): ${cleanMessage || "Unexpected response"}`;
        break;
    }
    const errorMsg = cleanMessage && cleanMessage !== friendly ? `${friendly} [Detail: ${cleanMessage.length > 200 ? cleanMessage.slice(0, 197) + "..." : cleanMessage}]` : friendly;
    const err = new Error(errorMsg);
    err.status = res.status;
    err.isRetryable = isRetryable;
    throw err;
  }
};

// src/tools/ToolRegistry.ts
var fs6 = __toESM(require("fs/promises"));
var fsSync = __toESM(require("fs"));
var readline = __toESM(require("readline"));
var path6 = __toESM(require("path"));
var import_child_process2 = require("child_process");
var import_util = require("util");
var execAsync = (0, import_util.promisify)(import_child_process2.exec);
function parseToolsFromFrontmatter(content) {
  if (!content) {
    return void 0;
  }
  let frontmatter;
  const startFmMatch = content.match(/^\s*---\r?\n([\s\S]*?)\r?\n---/);
  if (startFmMatch) {
    frontmatter = startFmMatch[1];
  } else {
    const embeddedFmMatch = content.match(/(?:^|\n)---\r?\n([\s\S]*?tools:\s*[\s\S]*?)\r?\n---/);
    if (embeddedFmMatch) {
      frontmatter = embeddedFmMatch[1];
    }
  }
  if (!frontmatter) {
    return void 0;
  }
  if (/tools:\s*["']?(?:\*|all|ALL)["']?\s*(?:$|\r?\n)/m.test(frontmatter)) {
    return "all";
  }
  const inlineMatch = frontmatter.match(/tools:\s*\[([\s\S]*?)\]/);
  if (inlineMatch) {
    return inlineMatch[1].split(",").map((s) => s.trim().replace(/^['"]|['"]$/g, "")).filter((s) => s.length > 0);
  }
  const listMatch = frontmatter.match(/tools:\s*\r?\n((?:\s*-\s*[^\r\n]+\r?\n?)+)/);
  if (listMatch) {
    return listMatch[1].split(/\r?\n/).map((line) => line.replace(/^\s*-\s*/, "").trim().replace(/^['"]|['"]$/g, "")).filter((s) => s.length > 0);
  }
  const singleMatch = frontmatter.match(/tools:\s*([a-zA-Z0-9_-]+)\s*(?:$|\r?\n)/m);
  if (singleMatch) {
    const val = singleMatch[1].trim();
    if (val.toLowerCase() === "all" || val === "*") {
      return "all";
    }
    return [val];
  }
  return void 0;
}
var ToolRegistry = class {
  constructor(workspaceRoot) {
    this.workspaceRoot = workspaceRoot;
    this.workspaceRoot = workspaceRoot || "";
    this.registerDefaultTools();
  }
  tools = /* @__PURE__ */ new Map();
  mcpToolNames = /* @__PURE__ */ new Set();
  mcpPhaseListener;
  setWorkspaceRoot(newRoot) {
    this.workspaceRoot = newRoot || "";
  }
  setMcpPhaseListener(listener) {
    this.mcpPhaseListener = listener;
  }
  setActivePhase(phaseName) {
    if (this.mcpPhaseListener) {
      this.mcpPhaseListener(phaseName);
    }
  }
  getDefinitions(phaseFileName, phaseContent) {
    const allDefs = Array.from(this.tools.values()).map((t) => t.definition);
    if (!phaseFileName && !phaseContent) {
      return allDefs;
    }
    let rawContent = phaseContent;
    if (!rawContent && phaseFileName) {
      const candidatePaths = [
        path6.isAbsolute(phaseFileName) ? phaseFileName : "",
        this.workspaceRoot ? path6.join(this.workspaceRoot, "analysis", phaseFileName.endsWith(".md") ? phaseFileName : `${phaseFileName}.md`) : "",
        this.workspaceRoot ? path6.join(this.workspaceRoot, phaseFileName.endsWith(".md") ? phaseFileName : `${phaseFileName}.md`) : "",
        this.workspaceRoot ? path6.join(this.workspaceRoot, phaseFileName) : "",
        this.workspaceRoot ? path6.join(this.workspaceRoot, "extension", "templates", "pipelines", "differential_expression", phaseFileName.endsWith(".md") ? phaseFileName : `${phaseFileName}.md`) : "",
        this.workspaceRoot ? path6.join(this.workspaceRoot, "extension", "templates", "pipelines", "quality_control_only", phaseFileName.endsWith(".md") ? phaseFileName : `${phaseFileName}.md`) : ""
      ].filter(Boolean);
      for (const p of candidatePaths) {
        if (fsSync.existsSync(p)) {
          try {
            rawContent = fsSync.readFileSync(p, "utf-8");
            break;
          } catch {
          }
        }
      }
    }
    const allowedMcpTools = rawContent ? parseToolsFromFrontmatter(rawContent) : void 0;
    if (allowedMcpTools === void 0 || allowedMcpTools === "all") {
      return allDefs;
    }
    const allowedSet = new Set(allowedMcpTools);
    return allDefs.filter((def) => {
      if (!this.mcpToolNames.has(def.name)) {
        return true;
      }
      return allowedSet.has(def.name);
    });
  }
  async execute(name, args) {
    const handler = this.tools.get(name);
    if (!handler) {
      return {
        tool_call_id: "",
        content: `Error: Tool '${name}' not found. Available tools: ${Array.from(this.tools.keys()).join(", ")}`,
        isError: true
      };
    }
    try {
      const output = await handler.execute(args);
      return {
        tool_call_id: "",
        content: output,
        isError: false
      };
    } catch (err) {
      return {
        tool_call_id: "",
        content: `Error executing tool '${name}': ${err.message || String(err)}`,
        isError: true
      };
    }
  }
  resolvePath(filePath) {
    const root = this.workspaceRoot || "";
    if (!root) {
      throw new Error("No active workspace directory set.");
    }
    const resolved = path6.isAbsolute(filePath) ? path6.resolve(filePath) : path6.resolve(root, filePath);
    const normalizedRoot = path6.resolve(root);
    if (resolved !== normalizedRoot && !resolved.startsWith(normalizedRoot + path6.sep)) {
      throw new Error(`Security restriction: access to '${filePath}' outside workspace root is denied.`);
    }
    return resolved;
  }
  assertNotProtected(filePath) {
    const root = this.workspaceRoot || "";
    const resolved = path6.isAbsolute(filePath) ? path6.resolve(filePath) : path6.resolve(root, filePath);
    const normalizedRel = root ? path6.relative(path6.resolve(root), resolved).replace(/\\/g, "/") : filePath.replace(/\\/g, "/");
    const isProtected = ["docs/llm.md", "agent/PROTOCOL.md", "agent/VARIABLES.md"].some(
      (p) => normalizedRel === p || normalizedRel.endsWith("/" + p)
    );
    if (isProtected) {
      throw new Error(
        `Security Policy Violation: '${filePath}' is a protected user or extension specification file and cannot be modified by the agent. Record runtime logs in 'docs/notes.md' and biological findings across docs/ (observations.md, knowledge.md, websearch.md, literature.md).`
      );
    }
  }
  registerDefaultTools() {
    this.tools.set("execute_command", {
      definition: {
        name: "execute_command",
        description: "Executes a shell command in the workspace directory (e.g. running Rscript code/01_inspect_dataset.R). Captures stdout and stderr.",
        parameters: {
          type: "object",
          properties: {
            command: {
              type: "string",
              description: "The shell command line to run"
            },
            timeoutMs: {
              type: "number",
              description: "Optional execution timeout in milliseconds (default: 600000ms / 10m)"
            }
          },
          required: ["command"]
        }
      },
      execute: async (args) => {
        const timeout = args.timeoutMs || 6e5;
        try {
          const effectiveCwd = this.workspaceRoot;
          if (!effectiveCwd) {
            throw new Error("Cannot execute command: No active workspace directory is configured.");
          }
          const defaultShell = process.platform === "win32" ? void 0 : fsSync.existsSync("/bin/bash") ? "/bin/bash" : process.env.SHELL && fsSync.existsSync(process.env.SHELL) ? process.env.SHELL : "/bin/sh";
          let commandToRun = args.command;
          commandToRun = commandToRun.replace(/(?:\s*2>&1)?\s*(?:>|>>|\|\s*tee(?:\s+-a)?)\s+logs\/[^\s;&|]+\/console\.log/g, "").replace(/;\s*test\s+["']?(?:\$\{?PIPESTATUS\[0\]\}?|\$\?)["']?\s+-eq\s+0/g, "");
          const { stdout, stderr } = await execAsync(commandToRun, {
            cwd: effectiveCwd,
            timeout,
            maxBuffer: 10 * 1024 * 1024,
            shell: defaultShell
          });
          let result = "";
          if (stdout)
            result += `STDOUT:
${stdout}
`;
          if (stderr)
            result += `STDERR:
${stderr}
`;
          return result.trim() || "Command executed successfully with no console output.";
        } catch (error) {
          let errOutput = `Command failed with exit code ${error.code ?? "unknown"}
`;
          if (error.stdout)
            errOutput += `STDOUT:
${error.stdout}
`;
          if (error.stderr)
            errOutput += `STDERR:
${error.stderr}
`;
          if (error.message)
            errOutput += `Error message: ${error.message}
`;
          throw new Error(errOutput.trim());
        }
      }
    });
    this.tools.set("read_file", {
      definition: {
        name: "read_file",
        description: "Reads file content from the workspace with optional startLine and maxLines for context economy.",
        parameters: {
          type: "object",
          properties: {
            filePath: {
              type: "string",
              description: "Relative or absolute path to the file to read"
            },
            startLine: {
              type: "number",
              description: "Optional 1-based start line number"
            },
            maxLines: {
              type: "number",
              description: "Optional maximum lines to read (prevents dumping large logs or tables)"
            }
          },
          required: ["filePath"]
        }
      },
      execute: async (args) => {
        const fullPath = this.resolvePath(args.filePath);
        const start = Math.max(1, args.startLine || 1);
        const max = Math.max(1, args.maxLines || 2e3);
        const fileStream = fsSync.createReadStream(fullPath, { encoding: "utf-8" });
        const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });
        const selected = [];
        let lineIdx = 0;
        let totalLines = 0;
        for await (const line of rl) {
          lineIdx++;
          totalLines = lineIdx;
          if (lineIdx >= start && selected.length < max) {
            selected.push(`${lineIdx}: ${line}`);
          }
        }
        const endLine = selected.length > 0 ? start + selected.length - 1 : start;
        return `File: ${args.filePath} (Lines ${start}-${endLine} of ${totalLines}):
${selected.join("\n")}`;
      }
    });
    this.tools.set("write_file", {
      definition: {
        name: "write_file",
        description: "Creates or overwrites a file in the workspace with new content.",
        parameters: {
          type: "object",
          properties: {
            filePath: {
              type: "string",
              description: "Relative path to the file to write"
            },
            content: {
              type: "string",
              description: "Complete text content to write into the file"
            }
          },
          required: ["filePath", "content"]
        }
      },
      execute: async (args) => {
        this.assertNotProtected(args.filePath);
        const fullPath = this.resolvePath(args.filePath);
        await fs6.mkdir(path6.dirname(fullPath), { recursive: true });
        await fs6.writeFile(fullPath, args.content, "utf-8");
        return `Successfully wrote ${args.content.length} characters to ${args.filePath}`;
      }
    });
    this.tools.set("replace_file_content", {
      definition: {
        name: "replace_file_content",
        description: "Replaces an exact target substring with replacement content in an existing file. Note: For analysis scripts and files under 150 lines, prefer 'write_file' to overwrite the complete file cleanly and avoid whitespace mismatch errors. Ensure targetContent matches exact indentation, line prefixes, and bullet/number formatting in the target file, and issue multiple edits to the same file serially across turns.",
        parameters: {
          type: "object",
          properties: {
            filePath: {
              type: "string",
              description: "Relative path to the file to edit"
            },
            targetContent: {
              type: "string",
              description: "Exact substring to find and replace"
            },
            replacementContent: {
              type: "string",
              description: "New content to replace the target substring with"
            }
          },
          required: ["filePath", "targetContent", "replacementContent"]
        }
      },
      execute: async (args) => {
        this.assertNotProtected(args.filePath);
        const fullPath = this.resolvePath(args.filePath);
        const content = await fs6.readFile(fullPath, "utf-8");
        if (!content.includes(args.targetContent)) {
          throw new Error(`Target content was not found in ${args.filePath}. Ensure exact whitespace and line match.`);
        }
        const updated = content.replace(args.targetContent, () => args.replacementContent);
        await fs6.writeFile(fullPath, updated, "utf-8");
        return `Successfully replaced content in ${args.filePath}`;
      }
    });
    this.tools.set("list_directory", {
      definition: {
        name: "list_directory",
        description: "Lists files and folders inside a given workspace directory.",
        parameters: {
          type: "object",
          properties: {
            dirPath: {
              type: "string",
              description: "Relative path to directory to inspect (e.g. 'data', 'logs', 'code')"
            }
          },
          required: ["dirPath"]
        }
      },
      execute: async (args) => {
        const fullPath = this.resolvePath(args.dirPath || ".");
        const entries = await fs6.readdir(fullPath, { withFileTypes: true });
        const list = entries.map((e) => `${e.isDirectory() ? "[DIR]" : "[FILE]"} ${e.name}`).join("\n");
        return `Directory '${args.dirPath}':
${list || "(empty)"}`;
      }
    });
    this.tools.set("check_checkpoint_gate", {
      definition: {
        name: "check_checkpoint_gate",
        description: "Checks whether required checkpoint files exist, are non-empty, and returns their file size.",
        parameters: {
          type: "object",
          properties: {
            requiredFiles: {
              type: "array",
              description: "Array of relative paths to files that must exist (e.g. ['logs/01_data_quality.log', 'data/tidyproteomics_data.rds'])",
              items: { type: "string" }
            }
          },
          required: ["requiredFiles"]
        }
      },
      execute: async (args) => {
        const results = [];
        let allPassed = true;
        for (const file of args.requiredFiles) {
          const fullPath = this.resolvePath(file);
          if (file.includes("*")) {
            const dir = path6.dirname(fullPath);
            const basePattern = path6.basename(file);
            try {
              const entries = await fs6.readdir(dir);
              const regexStr = "^" + basePattern.replace(/[-/\\^$+?.()|[\]{}]/g, "\\$&").replace(/\\\*/g, ".*") + "$";
              const regex = new RegExp(regexStr);
              const matched = entries.filter((e) => regex.test(e));
              if (matched.length > 0) {
                let anyValid = false;
                for (const m of matched) {
                  const s = await fs6.stat(path6.join(dir, m));
                  if (s.size > 0) {
                    anyValid = true;
                    results.push(`PASS: ${path6.join(path6.dirname(file), m)} (size: ${s.size} bytes)`);
                  }
                }
                if (!anyValid) {
                  results.push(`FAIL: ${file} matched files but all had 0 bytes`);
                  allPassed = false;
                }
              } else {
                results.push(`FAIL: ${file} matched 0 files in directory`);
                allPassed = false;
              }
            } catch {
              results.push(`FAIL: Directory for ${file} does not exist`);
              allPassed = false;
            }
          } else {
            try {
              const stat5 = await fs6.stat(fullPath);
              if (stat5.size > 0) {
                results.push(`PASS: ${file} (size: ${stat5.size} bytes)`);
              } else {
                results.push(`FAIL: ${file} exists but has 0 bytes`);
                allPassed = false;
              }
            } catch {
              results.push(`FAIL: ${file} does not exist`);
              allPassed = false;
            }
          }
        }
        return `Checkpoint Gate Status: ${allPassed ? "ALL CHECKPOINTS PASSED" : "GATE FAILED"}
${results.join("\n")}`;
      }
    });
    this.tools.set("complete_phase", {
      definition: {
        name: "complete_phase",
        description: "Signals that the current phase's objectives, code execution, and quality gates have completed successfully.",
        parameters: {
          type: "object",
          properties: {
            phaseName: {
              type: "string",
              description: "The name or filename of the completed phase"
            },
            summary: {
              type: "string",
              description: "Structured summary of findings, verified outputs, and gate status to update notes.md"
            }
          },
          required: ["phaseName", "summary"]
        }
      },
      execute: async (args) => {
        return `PHASE_COMPLETED: ${args.phaseName}
Summary:
${args.summary}`;
      }
    });
    this.tools.set("fail_phase", {
      definition: {
        name: "fail_phase",
        description: "Halts execution and marks the current phase as failed when an immutable specification gate, mandatory prerequisite, or unrecoverable error occurs. Use this to exit the phase loop immediately and provide actionable insights for the user to resolve before rerunning.",
        parameters: {
          type: "object",
          properties: {
            phaseName: {
              type: "string",
              description: "The name or filename of the phase (e.g. '00_INSTALL', '01_INSPECT')"
            },
            reason: {
              type: "string",
              description: "Concise summary of why the phase failed or was halted (e.g. 'Pre-flight Gate Failed: docs/experiment.md contains unconfigured placeholders')"
            },
            actionableInsights: {
              type: "string",
              description: "Specific, actionable instructions for the researcher explaining what to edit, configure, or verify to resolve the blocker before rerunning the phase."
            }
          },
          required: ["phaseName", "reason", "actionableInsights"]
        }
      },
      execute: async (args) => {
        return `PHASE_HALTED_FAILED: ${args.phaseName}
Reason: ${args.reason}
Actionable Insights:
${args.actionableInsights}`;
      }
    });
  }
  registerMcpTools(tools, executor) {
    this.unregisterMcpTools();
    for (const def of tools) {
      this.tools.set(def.name, {
        definition: def,
        execute: (args) => executor(def.name, args)
      });
      this.mcpToolNames.add(def.name);
    }
  }
  unregisterMcpTools() {
    for (const name of this.mcpToolNames) {
      this.tools.delete(name);
    }
    this.mcpToolNames.clear();
  }
};

// src/literature/IngestionRunner.ts
var path7 = __toESM(require("path"));
var fs7 = __toESM(require("fs"));
var import_child_process3 = require("child_process");
var IngestionRunner = class {
  constructor(literatureService, client, extensionPath, onProgress, onLog) {
    this.literatureService = literatureService;
    this.client = client;
    this.extensionPath = extensionPath;
    this.onProgress = onProgress;
    this.onLog = onLog;
  }
  isRunning = false;
  shouldAbort = false;
  getIsRunning() {
    return this.isRunning;
  }
  abort() {
    this.shouldAbort = true;
  }
  ts() {
    return (/* @__PURE__ */ new Date()).toTimeString().split(" ")[0];
  }
  async runIngestion(dbFileName) {
    if (this.isRunning) {
      throw new Error("An ingestion process is already running.");
    }
    const viewState = this.literatureService.getViewState();
    const queue = viewState.queue;
    if (queue.length === 0) {
      throw new Error("No files in the ingestion queue. Select a literature folder first.");
    }
    const wsRoot = this.literatureService.getWorkspaceRoot();
    if (!wsRoot) {
      throw new Error("No active workspace directory set.");
    }
    const targetDir = viewState.literatureDir || viewState.corporaDir || getLiteratureDir(wsRoot);
    const dbPath = path7.join(targetDir, path7.basename(dbFileName));
    if (!fs7.existsSync(dbPath)) {
      throw new Error(`Literature database does not exist: ${dbFileName}`);
    }
    this.isRunning = true;
    this.shouldAbort = false;
    let processed = 0;
    let errors = 0;
    this.onLog(`[${this.ts()}] Literature: Starting batch ingestion of ${queue.length} files into ${path7.basename(dbFileName)}`);
    try {
      for (let i = 0; i < queue.length; i++) {
        if (this.shouldAbort) {
          this.onLog(`[${this.ts()}] Literature: Ingestion aborted by user.`);
          break;
        }
        const item = queue[i];
        if (item.stage === "indexed") {
          continue;
        }
        try {
          await this.processItem(item, dbPath, i + 1, queue.length);
          processed++;
        } catch (err) {
          errors++;
          item.stage = "failed";
          item.message = err.message || String(err);
          this.literatureService.updateQueueItem(item.id, { stage: "failed", message: item.message });
          this.onProgress({
            item,
            stage: "failed",
            message: item.message,
            processedCount: i + 1,
            totalCount: queue.length
          });
          this.onLog(`[${this.ts()}] Literature: \u274C Failed to ingest ${item.fileName}: ${item.message}`);
        }
      }
    } finally {
      this.isRunning = false;
      this.shouldAbort = false;
      this.literatureService.syncWorkspaceScripts();
    }
    this.onLog(`[${this.ts()}] Literature: Ingestion batch complete: ${processed} indexed, ${errors} failed.`);
    if (processed > 0) {
      try {
        this.onLog(`[${this.ts()}] Literature: Updating database accounting report (docs/literature_database.md)...`);
        await this.literatureService.generateReport(path7.basename(dbFileName));
        this.onLog(`[${this.ts()}] Literature: \u2713 Updated docs/literature_database.md`);
      } catch (repErr) {
        this.onLog(`[${this.ts()}] Literature: Notice: could not auto-update report: ${repErr.message}`);
      }
    }
    return { success: errors === 0, processed, errors };
  }
  async processItem(item, dbPath, currentIndex, totalCount) {
    const notify = (stage, message) => {
      item.stage = stage;
      item.message = message;
      this.literatureService.updateQueueItem(item.id, { stage, message });
      this.onProgress({
        item,
        stage,
        message,
        processedCount: currentIndex,
        totalCount
      });
    };
    notify("parsing_pdf", "Extracting text and tables...");
    this.onLog(`[${this.ts()}] Literature: [${currentIndex}/${totalCount}] Parsing ${item.fileName}...`);
    const extractScript = this.findScript("extract_text_or_table.R");
    const rscript = this.literatureService.resolveRscript();
    const extractPayload = await this.execRJson(rscript, extractScript, [item.absPath, "25"]);
    if (!extractPayload.ok) {
      throw new Error(extractPayload.error || "Failed to extract text from file.");
    }
    notify("llm_extraction", "LLM structured extraction...");
    this.onLog(`[${this.ts()}] Literature: [${currentIndex}/${totalCount}] Extracting assertions from ${item.fileName}...`);
    let studyId = `doi_${path7.basename(item.fileName, path7.extname(item.fileName))}`;
    let extractedPayload = null;
    if (extractPayload.kind === "pdf") {
      extractedPayload = await this.llmExtractFromPdfText(item.fileName, extractPayload.text);
    } else {
      extractedPayload = await this.llmExtractFromTable(item.fileName, extractPayload.columns, extractPayload.rows);
    }
    if (!extractedPayload || !extractedPayload.study) {
      throw new Error("LLM failed to return structured extraction payload.");
    }
    extractedPayload.db_path = dbPath;
    if (extractedPayload.study && extractedPayload.study.study_id) {
      studyId = extractedPayload.study.study_id;
    } else {
      extractedPayload.study.study_id = studyId;
    }
    extractedPayload.study.filename = item.fileName;
    notify("normalization", "Normalizing symbols and orthologs...");
    this.onLog(`[${this.ts()}] Literature: [${currentIndex}/${totalCount}] Normalizing symbols via R (limma/babelgene)...`);
    let normScript;
    try {
      normScript = this.findScript("normalize_and_insert_literature.R");
    } catch {
      normScript = this.findScript("normalize_and_insert_corpus.R");
    }
    const wsRoot = this.literatureService.getWorkspaceRoot();
    const litDir = getLiteratureDir(wsRoot);
    fs7.mkdirSync(litDir, { recursive: true });
    const tmpJson = path7.join(litDir, `_tmp_ingest_${Date.now()}.json`);
    try {
      fs7.writeFileSync(tmpJson, JSON.stringify(extractedPayload, null, 2), "utf-8");
      const normRes = await this.execRJson(rscript, normScript, [tmpJson, dbPath]);
      if (!normRes.ok) {
        throw new Error(normRes.error || "Normalization and insertion failed in R.");
      }
      if ((normRes.assertions_inserted || 0) === 0) {
        notify("indexed", "Indexed 0 assertions (no explicit protein relationships found)");
        this.onLog(
          `[${this.ts()}] Literature: Warning: 0 assertions extracted from ${item.fileName}. Check if document contains explicit protein interactions or is a conceptual overview.`
        );
      } else {
        notify(
          "indexed",
          `Indexed ${normRes.assertions_inserted} assertions (${normRes.symbols_normalized || 0} normalized)`
        );
        this.onLog(
          `[${this.ts()}] Literature: \u2713 [${currentIndex}/${totalCount}] Indexed ${item.fileName}: ${normRes.assertions_inserted} assertions into DuckDB.`
        );
      }
    } finally {
      try {
        if (fs7.existsSync(tmpJson))
          fs7.unlinkSync(tmpJson);
      } catch {
      }
    }
  }
  async llmExtractFromPdfText(fileName, rawText) {
    const systemPrompt = `You are an expert molecular biologist, biochemist, and biocuration specialist.
Your task is to extract structured scientific facts from literature text for ingestion into a Perturbation-Centric Knowledge Graph.

CRITICAL INSTRUCTIONS:
1. Extract ALL specific proteins, co-factors, adapters, substrates, binding partners, and pathway members mentioned across the text (Abstract, Introduction, Results, Figures, Discussion, or Review sections).
2. For experimental perturbation papers (KO, KD, chemical inhibition): extract altered targets, secondary hits, downstream destabilized targets, and co-regulated modules.
3. For structural, biochemical, or review papers: extract the primary target, its known physical interactors (e.g. adapters, co-chaperones, E3 ligases), direct substrates, and functional pathways (e.g. ERAD, autophagy, proteasome, ribosome quality control).
4. Do NOT return an empty list if any proteins, complexes, or molecular interactions are discussed in the paper. Always extract the relevant molecular entities with their biological relationship type.

OUTPUT SCHEMA (Must be raw valid JSON matching this exact structure):
{
  "study": {
    "study_id": "DOI or paper title slug (e.g. 10.1038/s41589-021-00800-0)",
    "title": "Full title of paper",
    "year": 2021,
    "core_thesis": "2-3 sentence summary of the primary biological conclusions"
  },
  "experimental_contexts": [
    {
      "context_id": "c1",
      "system_category": "cell_line | primary_cells | in_vivo_animal | human_clinical",
      "organism": "Homo sapiens | Mus musculus | Saccharomyces cerevisiae",
      "model_name": "HeLa | U2OS | HEK293T | C57BL/6",
      "perturbation_type": "CRISPR_KO | siRNA_KD | chemical_inhibitor | infection",
      "perturbation_target": "Exact perturbation target (e.g. VCP / p97, CB-5083)",
      "assay_modality": "whole_cell_proteomics | AP-MS | diGly_ubiquitinomics | RNA_seq | western_blot",
      "context_metadata": "Dose, timepoint, or condition details"
    }
  ],
  "molecular_assertions": [
    {
      "context_id": "c1",
      "raw_entity_name": "Exact protein/gene name used in paper (e.g. p97, p47, UBXD8, Cdc48)",
      "relationship_type": "ACCUMULATES_UP | DEPLETED_DOWN | PHYSICAL_INTERACTOR | DIRECT_SUBSTRATE | COMPENSATORY_PATHWAY | NO_CHANGE",
      "functional_module": "e.g. ERAD, RQC, Mitophagy, Proteasome, Golgi reassembly",
      "quantitative_note": "Fold change or statistical metric if stated",
      "evidence_quote": "Verbatim short sentence or table reference from the text"
    }
  ]
}

Return ONLY the raw JSON object. Do not include markdown code fences or conversational text.`;
    const userMessage = `Paper Filename: ${fileName}

Text Content:
${rawText.slice(0, 5e4)}

Extract all studies, contexts, and molecular assertions.`;
    const response = await this.client.chat({
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
      tools: []
    });
    return this.cleanAndParseJson(response.content);
  }
  async llmExtractFromTable(fileName, columns, rows) {
    const systemPrompt = `You are a biocuration specialist. Convert a supplementary proteomics/genomics table into structured assertions.
Return ONLY valid JSON with { "study": {...}, "experimental_contexts": [...], "molecular_assertions": [...] }.`;
    const userMessage = `Table Filename: ${fileName}
Columns: ${columns.join(", ")}
Top Data Rows (JSON):
${JSON.stringify(rows.slice(0, 40), null, 2)}

Extract the study, context, and all molecular assertions with raw_entity_name and relationship_type.`;
    const response = await this.client.chat({
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
      tools: []
    });
    return this.cleanAndParseJson(response.content);
  }
  cleanAndParseJson(content) {
    let clean = (content || "").trim();
    if (clean.startsWith("```json"))
      clean = clean.slice(7);
    else if (clean.startsWith("```"))
      clean = clean.slice(3);
    if (clean.endsWith("```"))
      clean = clean.slice(0, -3);
    clean = clean.trim();
    const firstBrace = clean.indexOf("{");
    const lastBrace = clean.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace !== -1) {
      clean = clean.substring(firstBrace, lastBrace + 1);
    }
    return JSON.parse(clean);
  }
  findScript(scriptName) {
    const candidates = [
      path7.join(this.extensionPath, "templates", "shared", "tools", "literature", scriptName),
      path7.join(this.extensionPath, "extension", "templates", "shared", "tools", "literature", scriptName),
      path7.join(__dirname, "..", "templates", "shared", "tools", "literature", scriptName),
      path7.join(__dirname, "..", "..", "templates", "shared", "tools", "literature", scriptName),
      // Legacy fallbacks
      path7.join(this.extensionPath, "templates", "shared", "tools", "corpus", scriptName),
      path7.join(this.extensionPath, "extension", "templates", "shared", "tools", "corpus", scriptName),
      path7.join(__dirname, "..", "templates", "shared", "tools", "corpus", scriptName),
      path7.join(__dirname, "..", "..", "templates", "shared", "tools", "corpus", scriptName)
    ];
    const hit = candidates.find((c) => fs7.existsSync(c));
    if (hit)
      return hit;
    throw new Error(`Literature script '${scriptName}' not found in extension templates.`);
  }
  execRJson(rscript, scriptPath, args) {
    return new Promise((resolve3) => {
      (0, import_child_process3.execFile)(
        rscript,
        [scriptPath, ...args],
        { timeout: 9e4, maxBuffer: 15 * 1024 * 1024 },
        (error, stdout, stderr) => {
          const lines = String(stdout || "").split(/\r?\n/);
          const line = lines.find((l) => l.startsWith("@@LITERATURE_JSON@@") || l.startsWith("@@CORPUS_JSON@@"));
          if (line) {
            try {
              const marker = line.startsWith("@@LITERATURE_JSON@@") ? "@@LITERATURE_JSON@@" : "@@CORPUS_JSON@@";
              resolve3(JSON.parse(line.slice(marker.length)));
              return;
            } catch (err) {
              resolve3({ ok: false, error: `JSON parse error: ${err.message}`, stderr });
              return;
            }
          }
          const msg = String(stderr || error?.message || "").trim();
          resolve3({ ok: false, error: msg || "R process finished without output.", stderr });
        }
      );
    });
  }
};

// src/agent/AgentService.ts
var fs9 = __toESM(require("fs/promises"));
var fsSync3 = __toESM(require("fs"));
var path9 = __toESM(require("path"));

// src/agent/ExperimentManager.ts
var fs8 = __toESM(require("fs/promises"));
var fsSync2 = __toESM(require("fs"));
var path8 = __toESM(require("path"));
var ExperimentManager = class {
  constructor(workspaceRoot, extensionUriPath) {
    this.workspaceRoot = workspaceRoot;
    this.extensionUriPath = extensionUriPath;
  }
  setWorkspaceRoot(newRoot) {
    this.workspaceRoot = newRoot || "";
  }
  getExperimentPath() {
    return path8.join(this.workspaceRoot, "docs", "experiment.md");
  }
  /**
   * Ensures docs/experiment.md exists by copying the template if needed.
   */
  async ensureExperimentDoc() {
    const expPath = this.getExperimentPath();
    if (fsSync2.existsSync(expPath)) {
      return await fs8.readFile(expPath, "utf-8");
    }
    const docsDir = path8.dirname(expPath);
    if (!fsSync2.existsSync(docsDir)) {
      await fs8.mkdir(docsDir, { recursive: true });
    }
    let templateContent = "";
    if (this.extensionUriPath) {
      const templatePath = path8.join(this.extensionUriPath, "templates", "shared", "docs", "experiment.md");
      if (fsSync2.existsSync(templatePath)) {
        templateContent = await fs8.readFile(templatePath, "utf-8");
      }
    }
    if (!templateContent) {
      templateContent = `# Experiment & Dataset Specification

## 1. Input Dataset Parameters
\u{1F449} [USER ACTION REQUIRED - CONFIGURE DATASET PARAMETERS]:

- **PATH_TO_DATA_FILE**: [REQUIRED: Enter URL or relative path to data file]
- **PLATFORM**: [REQUIRED: Enter search platform]
- **ANALYTE**: [REQUIRED: proteins or peptides]

## 2. Experimental Hypothesis & Study Design
\u{1F449} [USER ACTION REQUIRED - DESCRIBE STUDY & HYPOTHESIS]:

[REQUIRED: Describe the experimental hypothesis, biological system, treatment conditions, control groups, and key biological questions to investigate.]

## 3. Sample Grouping, Recoding & Contrast Designations

### A. Discovered Sample Groups in Dataset:
\u2139\uFE0F [AUTO-GENERATED REFERENCE - READ ONLY]:
- *(Pending Phase 1 data ingestion)*

### B. Sample Group Renaming & Pooling Map (Optional):
\u{1F449} [USER REVIEW & EDIT TABLE]:
| Raw Sample Group | Cleaned Group Name |
| :--- | :--- |

\u{1F449} [USER TOGGLE]:
- **Reassign Sample Names According to Pooling Map**: TRUE

### C. Target Contrasts:
\u{1F449} [USER ACTION REQUIRED - DEFINE TARGET CONTRASTS]:
- Contrast: <treatment> vs <control>

### D. Confounded Batch & Exploratory Comparison Authorization:
\u26A0\uFE0F [PRE-FLIGHT GATE DECISION]:
- **Proceed With Potential Batch Confounding**: FALSE

### E. Missing Value Imputation Strategy:
\u{1F449} [USER ACTION REQUIRED - CONFIRM IMPUTATION METHOD]:
- **Imputation Method**: randomforest_grouped
- **Confirm Imputation Strategy**: FALSE
`;
    }
    await fs8.writeFile(expPath, templateContent, "utf-8");
    return templateContent;
  }
  /**
   * Reads and parses docs/experiment.md, determining which fields are unassigned.
   */
  async readSpec() {
    const expPath = this.getExperimentPath();
    if (!fsSync2.existsSync(expPath)) {
      return {
        exists: false,
        pathToDataFile: null,
        platform: null,
        analyte: null,
        description: null,
        rawSampleGroups: [],
        discoveredGroups: [],
        contrastConfirmed: false,
        sampleRenamingMap: {},
        targetContrasts: [],
        batchConfoundingAuthorized: false,
        imputationMethod: "randomforest_grouped",
        imputationConfirmed: false,
        missingInitialFields: ["PATH_TO_DATA_FILE", "PLATFORM", "ANALYTE", "DESCRIPTION"]
      };
    }
    const content = await fs8.readFile(expPath, "utf-8");
    const missing = [];
    let pathToDataFile = null;
    const pathMatch = content.match(/-\s*\*\*PATH_TO_DATA_FILE\*\*:\s*(.*)/i);
    if (pathMatch) {
      const val = pathMatch[1].trim();
      if (val && !val.includes("[REQUIRED") && !val.startsWith("<") && !val.includes("Enter URL")) {
        pathToDataFile = val;
      }
    }
    if (!pathToDataFile)
      missing.push("PATH_TO_DATA_FILE");
    let platform = null;
    const platMatch = content.match(/-\s*\*\*PLATFORM\*\*:\s*(.*)/i);
    if (platMatch) {
      const val = platMatch[1].trim();
      if (val && !val.includes("[REQUIRED") && !val.startsWith("<") && !val.includes("Enter search platform")) {
        platform = val;
      }
    }
    if (!platform)
      missing.push("PLATFORM");
    let analyte = null;
    const analyteMatch = content.match(/-\s*\*\*ANALYTE\*\*:\s*(.*)/i);
    if (analyteMatch) {
      const val = analyteMatch[1].trim();
      if (val && !val.includes("[REQUIRED") && !val.startsWith("<") && !val.includes("proteins or peptides")) {
        analyte = val;
      }
    }
    if (!analyte)
      missing.push("ANALYTE");
    let description = null;
    const descSectionMatch = content.match(/## 2\. Experimental Hypothesis & Study Design[\s\S]*?(?=## 3\.|$)/i);
    if (descSectionMatch) {
      const secText = descSectionMatch[0];
      const cleaned = secText.replace(/## 2\. Experimental Hypothesis & Study Design/i, "").replace(/👉\s*\[USER ACTION REQUIRED[^\]]*\]:/gi, "").replace(/<!--[\s\S]*?-->/g, "").trim();
      if (cleaned && !cleaned.includes("[REQUIRED") && cleaned.length >= 10) {
        description = cleaned;
      }
    }
    if (!description)
      missing.push("DESCRIPTION");
    const targetContrasts = [];
    const contrastMatches = content.matchAll(/-\s*(?:Confirmed\s*)?Contrast:\s*(.*)/gi);
    for (const m of contrastMatches) {
      const c = m[1].trim();
      if (c && !c.includes("<treatment>") && !c.includes("<control>") && !c.includes("[REQUIRED")) {
        targetContrasts.push(c);
      }
    }
    const secCMatch = content.match(/###\s*(?:3\.C|C)\.?\s*Target [Cc]ontrasts[\s\S]*?(?=###\s*(?:3\.D|D)\.|$|##)/i);
    if (secCMatch) {
      const lines = secCMatch[0].split("\n");
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#") || trimmed.startsWith("\u{1F449}") || trimmed.startsWith("<!--") || trimmed.includes("[REQUIRED")) {
          continue;
        }
        const m = trimmed.match(/(?:-\s*(?:Confirmed\s*)?Contrast:\s*)?`?([a-zA-Z0-9_-]+)`?\s*(?:\/|vs\.?|versus)\s*`?([a-zA-Z0-9_-]+)`?/i);
        if (m) {
          const pair = `${m[1]} vs ${m[2]}`;
          if (!targetContrasts.includes(pair)) {
            targetContrasts.push(pair);
          }
        }
      }
    }
    const sampleRenamingMap = {};
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
    const rawGroups = [];
    const secAMatch = content.match(/###\s*(?:3\.A|A)\.?\s*Discovered sample groups[\s\S]*?(?=###\s*(?:3\.B|B)\.|$|##)/i);
    if (secAMatch) {
      const rows = secAMatch[0].split("\n");
      for (const row of rows) {
        const trimmed = row.trim();
        if (trimmed.startsWith("|") && !trimmed.includes("---") && !trimmed.includes("Discovered sample group") && !trimmed.includes("Raw Sample Group")) {
          const parts = trimmed.split("|").map((p) => p.trim()).filter(Boolean);
          if (parts.length >= 1) {
            const clean = parts[0].replace(/[`'"]/g, "").trim();
            if (clean && !rawGroups.includes(clean)) {
              rawGroups.push(clean);
            }
          }
        }
      }
    }
    const cleanBiologicalGroups = [];
    const secBMatch = content.match(/###\s*(?:3\.B|B)\.?\s*Sample Group Renaming[\s\S]*?(?=###\s*(?:3\.C|C)\.|$|##)/i);
    if (secBMatch) {
      const rows = secBMatch[0].split("\n");
      for (const row of rows) {
        const trimmed = row.trim();
        if (trimmed.startsWith("|") && !trimmed.includes("---") && !trimmed.includes("Proposed clean") && !trimmed.includes("Cleaned Group")) {
          const parts = trimmed.split("|").map((p) => p.trim()).filter(Boolean);
          if (parts.length >= 2) {
            const clean = parts[1].replace(/[`'"]/g, "").trim();
            if (clean && !cleanBiologicalGroups.includes(clean)) {
              cleanBiologicalGroups.push(clean);
            }
          }
        }
      }
    }
    const effectiveGroups = cleanBiologicalGroups.length >= 2 ? cleanBiologicalGroups : rawGroups;
    const secCText = secCMatch ? secCMatch[0] : "";
    const contrastConfirmed = /Status:\s*CONFIRMED/i.test(secCText) || /###\s*(?:3\.C|C)\.?\s*Target [Cc]ontrasts[^\n]*CONFIRMED/i.test(content) || targetContrasts.length > 0 && !secCText.includes("\u{1F449} [USER ACTION REQUIRED") && !secCText.includes("<treatment>");
    const batchConfoundingAuthorized = /-\s*\*\*Proceed With Potential Batch Confounding\*\*:\s*TRUE/i.test(content);
    const impMethodMatch = content.match(/-\s*\*\*Imputation Method\*\*:\s*([a-zA-Z0-9_.:-]+)/i);
    const imputationMethod = impMethodMatch ? impMethodMatch[1].trim() : "randomforest_grouped";
    const imputationConfirmed = /-\s*\*\*Confirm Imputation Strategy\*\*:\s*TRUE/i.test(content);
    return {
      exists: true,
      pathToDataFile,
      platform,
      analyte,
      description,
      rawSampleGroups: rawGroups,
      discoveredGroups: effectiveGroups,
      contrastConfirmed,
      sampleRenamingMap,
      targetContrasts,
      batchConfoundingAuthorized,
      imputationMethod,
      imputationConfirmed,
      missingInitialFields: missing
    };
  }
  getDiscoveredGroups(spec) {
    if (spec && spec.discoveredGroups && spec.discoveredGroups.length > 0) {
      return spec.discoveredGroups;
    }
    return [];
  }
  /**
   * Updates Section 1 parameter (PATH_TO_DATA_FILE, PLATFORM, or ANALYTE).
   */
  async setParameter(key, value) {
    await this.ensureExperimentDoc();
    const expPath = this.getExperimentPath();
    let content = await fs8.readFile(expPath, "utf-8");
    const regex = new RegExp(`(-\\s*\\*\\*${key}\\*\\*:\\s*)(.*)`, "i");
    if (regex.test(content)) {
      content = content.replace(regex, `$1${value.trim()}`);
    } else {
      content = content.replace(
        /(## 1\. Input Dataset Parameters[\s\S]*?)(?=## 2\.|$)/i,
        `$1
- **${key}**: ${value.trim()}
`
      );
    }
    await fs8.writeFile(expPath, content, "utf-8");
  }
  /**
   * Sets Section 2 experimental hypothesis & study design.
   */
  async setDescription(description) {
    await this.ensureExperimentDoc();
    const expPath = this.getExperimentPath();
    let content = await fs8.readFile(expPath, "utf-8");
    const sectionRegex = /(## 2\. Experimental Hypothesis & Study Design[\s\S]*?)(?=## 3\.|$)/i;
    const newSection = `## 2. Experimental Hypothesis & Study Design
\u{1F449} [USER ACTION REQUIRED - DESCRIBE STUDY & HYPOTHESIS]:

${description.trim()}

`;
    if (sectionRegex.test(content)) {
      content = content.replace(sectionRegex, newSection);
    } else {
      content += `

${newSection}`;
    }
    await fs8.writeFile(expPath, content, "utf-8");
  }
  /**
   * Sets Section 3B sample renaming and pooling map.
   */
  async setSampleRenamingMap(mapping) {
    await this.ensureExperimentDoc();
    const expPath = this.getExperimentPath();
    let content = await fs8.readFile(expPath, "utf-8");
    let table = "| Raw Sample Group | Cleaned Group Name |\n| :--- | :--- |\n";
    for (const [raw, clean] of Object.entries(mapping)) {
      table += `| ${raw} | ${clean} |
`;
    }
    const tableBlockRegex = /(### B\. Sample Group Renaming & Pooling Map[\s\S]*?)(?:\| Raw Sample Group \| Cleaned Group Name \|[\s\S]*?(?=\n\s*(?:👉|###|##|$)))/i;
    if (tableBlockRegex.test(content)) {
      content = content.replace(tableBlockRegex, `$1${table}`);
    } else {
      const sectionBRegex = /(### B\. Sample Group Renaming & Pooling Map[\s\S]*?)(?=### C\.|$)/i;
      if (sectionBRegex.test(content)) {
        content = content.replace(sectionBRegex, `### B. Sample Group Renaming & Pooling Map (Optional):
\u{1F449} [USER REVIEW & EDIT TABLE]:
${table}
\u{1F449} [USER TOGGLE]:
- **Reassign Sample Names According to Pooling Map**: TRUE

`);
      }
    }
    content = content.replace(
      /-\s*\*\*Reassign Sample Names According to (?:Sample Group Renaming & )?Pooling Map\*\*:\s*FALSE/i,
      "- **Reassign Sample Names According to Pooling Map**: TRUE"
    );
    await fs8.writeFile(expPath, content, "utf-8");
  }
  /**
   * Sets Section 3C target contrasts and marks them confirmed (removing action required tags).
   */
  async setTargetContrasts(contrasts) {
    await this.ensureExperimentDoc();
    const expPath = this.getExperimentPath();
    let content = await fs8.readFile(expPath, "utf-8");
    const formattedContrasts = contrasts.map((c) => {
      let clean = c.replace(/^[-\*]\s*(?:Confirmed\s*)?Contrast:\s*/i, "").trim();
      clean = clean.replace(/[`'"]/g, "").trim();
      const parts = clean.split(/\s*(?:\/|vs\.?|versus)\s*/i);
      if (parts.length === 2 && parts[0] && parts[1]) {
        return `\`${parts[0]}\` / \`${parts[1]}\``;
      }
      return clean;
    });
    const contrastList = formattedContrasts.join("\n");
    const newSectionC = `### 3.C Target contrasts
${contrastList}

Status: CONFIRMED

`;
    const sectionCRegex = /(###\s*(?:3\.C|C)\.?\s*Target [Cc]ontrasts[\s\S]*?)(?=###\s*(?:3\.D|D)\.|$|##)/i;
    if (sectionCRegex.test(content)) {
      content = content.replace(sectionCRegex, newSectionC);
    } else {
      const sectionDRegex = /(###\s*(?:3\.D|D)\.[\s\S]*)/i;
      if (sectionDRegex.test(content)) {
        content = content.replace(sectionDRegex, `${newSectionC}$1`);
      } else {
        content += `

${newSectionC}`;
      }
    }
    await fs8.writeFile(expPath, content, "utf-8");
  }
  /**
   * Confirms whatever contrasts are in Section 3.C, removing pending confirmation tags.
   */
  async confirmExistingContrasts() {
    await this.ensureExperimentDoc();
    const expPath = this.getExperimentPath();
    let content = await fs8.readFile(expPath, "utf-8");
    const spec = await this.readSpec();
    if (spec.targetContrasts.length > 0) {
      await this.setTargetContrasts(spec.targetContrasts);
      return;
    }
    const sectionCRegex = /(###\s*(?:3\.C|C)\.?\s*Target [Cc]ontrasts[\s\S]*?)(?=###\s*(?:3\.D|D)\.|$|##)/i;
    const match = content.match(sectionCRegex);
    if (match) {
      let secC = match[1];
      secC = secC.replace(/👉\s*\[USER ACTION REQUIRED[^\]]*\]:?/gi, "");
      secC = secC.replace(/\(suggested contrast requiring confirmation\)/gi, "");
      secC = secC.replace(/Status:\s*PENDING[^\n]*/gi, "");
      if (!/Status:\s*CONFIRMED/i.test(secC)) {
        secC = secC.trim() + "\n\nStatus: CONFIRMED\n\n";
      }
      content = content.replace(sectionCRegex, secC);
      await fs8.writeFile(expPath, content, "utf-8");
    }
  }
  /**
   * Sets Section 3D Proceed With Potential Batch Confounding (TRUE / FALSE).
   */
  async setBatchConfounding(authorized) {
    await this.ensureExperimentDoc();
    const expPath = this.getExperimentPath();
    let content = await fs8.readFile(expPath, "utf-8");
    const val = authorized ? "TRUE" : "FALSE";
    let updated = false;
    if (content.includes("Proceed With Potential Batch Confounding")) {
      content = content.replace(
        /(-\s*\*\*Proceed With Potential Batch Confounding\*\*:\s*)(TRUE|FALSE)/i,
        `$1${val}`
      );
      updated = true;
    }
    if (content.includes("Authorize Unadjusted Exploratory Comparison")) {
      content = content.replace(
        /(-\s*\*\*Authorize Unadjusted Exploratory Comparison\*\*:\s*)(TRUE|FALSE)/i,
        `$1${val}`
      );
      updated = true;
    }
    if (!updated) {
      content += `

### D. Confounded Batch & Exploratory Comparison Authorization:
- **Proceed With Potential Batch Confounding**: ${val}
`;
    }
    await fs8.writeFile(expPath, content, "utf-8");
  }
  /**
   * Sets Section 3E Missing Value Imputation Strategy and confirmation status.
   */
  async setImputationStrategy(method, confirmed = true) {
    await this.ensureExperimentDoc();
    const expPath = this.getExperimentPath();
    let content = await fs8.readFile(expPath, "utf-8");
    const spec = await this.readSpec();
    const finalMethod = method && method.trim() ? method.trim() : spec.imputationMethod || "randomforest_grouped";
    const confirmStr = confirmed ? "TRUE" : "FALSE";
    if (/-\s*\*\*Imputation Method\*\*:/i.test(content)) {
      content = content.replace(/(-\s*\*\*Imputation Method\*\*:\s*)([^\n]*)/i, `$1${finalMethod}`);
    } else if (/###\s*(?:3\.E|E)\.?\s*Missing Value Imputation Strategy/i.test(content)) {
      content = content.replace(
        /(###\s*(?:3\.E|E)\.?\s*Missing Value Imputation Strategy[^\n]*\n)/i,
        `$1- **Imputation Method**: ${finalMethod}
`
      );
    } else {
      content += `

### E. Missing Value Imputation Strategy:
- **Imputation Method**: ${finalMethod}
- **Confirm Imputation Strategy**: ${confirmStr}
`;
    }
    if (/-\s*\*\*Confirm Imputation Strategy\*\*:/i.test(content)) {
      content = content.replace(/(-\s*\*\*Confirm Imputation Strategy\*\*:\s*)(TRUE|FALSE)/i, `$1${confirmStr}`);
    } else {
      content = content.replace(
        /(-\s*\*\*Imputation Method\*\*:\s*[^\n]*\n)/i,
        `$1- **Confirm Imputation Strategy**: ${confirmStr}
`
      );
    }
    await fs8.writeFile(expPath, content, "utf-8");
    return finalMethod;
  }
  /**
   * Unified confirmation: sets target contrast(s) as confirmed in Section 3.C,
   * authorizes potential batch confounding in Section 3.D, and confirms imputation in Section 3.E.
   */
  async confirmContrastAndAuthorizeConfounding(contrasts) {
    await this.ensureExperimentDoc();
    let finalContrasts = contrasts && contrasts.length > 0 ? contrasts : [];
    if (finalContrasts.length === 0) {
      const spec = await this.readSpec();
      if (spec.targetContrasts.length > 0) {
        finalContrasts = spec.targetContrasts;
      } else {
        const groups = this.getDiscoveredGroups(spec);
        if (groups.length >= 2) {
          finalContrasts = [`${groups[0]} vs ${groups[1]}`];
        }
      }
    }
    if (finalContrasts.length > 0) {
      await this.setTargetContrasts(finalContrasts);
    } else {
      await this.confirmExistingContrasts();
    }
    await this.setBatchConfounding(true);
    await this.setImputationStrategy(void 0, true);
    return finalContrasts;
  }
};

// src/agent/AgentService.ts
var AgentService = class {
  constructor(workspaceRoot, client, getPipelineState, onStartPipeline, onAgentUpdated, extensionUriPath, onResumePipeline, onStopPipeline, onRestartPipeline) {
    this.workspaceRoot = workspaceRoot;
    this.client = client;
    this.getPipelineState = getPipelineState;
    this.onStartPipeline = onStartPipeline;
    this.onAgentUpdated = onAgentUpdated;
    this.onResumePipeline = onResumePipeline;
    this.onStopPipeline = onStopPipeline;
    this.onRestartPipeline = onRestartPipeline;
    this.workspaceRoot = workspaceRoot || "";
    this.experimentManager = new ExperimentManager(this.workspaceRoot, extensionUriPath);
  }
  messages = [];
  isBusy = false;
  abortRequested = false;
  experimentManager;
  lastHaltedPhaseId;
  lastSuggestedContrast;
  phaseEventsPosted = /* @__PURE__ */ new Set();
  notifyUpdated() {
    if (this.onAgentUpdated)
      this.onAgentUpdated();
  }
  async triggerResume(phaseId) {
    if (this.onResumePipeline) {
      await this.onResumePipeline(phaseId);
    } else if (this.onStartPipeline) {
      await this.onStartPipeline(phaseId);
    }
  }
  async triggerRestart() {
    if (this.onRestartPipeline) {
      await this.onRestartPipeline();
    } else if (this.onStartPipeline) {
      await this.onStartPipeline(void 0);
    }
  }
  async triggerStop() {
    if (this.onStopPipeline) {
      await this.onStopPipeline();
    }
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
      const fullPath = path9.isAbsolute(relPath) ? relPath : path9.join(this.workspaceRoot, relPath);
      return await fs9.readFile(fullPath, "utf-8");
    } catch {
      return "";
    }
  }
  /**
   * Defines agentic tools available to the Agent for configuring experiment.md and driving execution.
   */
  getAgentTools() {
    return [
      {
        name: "update_experiment_parameters",
        description: "Updates Section 1 of docs/experiment.md with the dataset file path, search platform, or analyte.",
        parameters: {
          type: "object",
          properties: {
            pathToDataFile: {
              type: "string",
              description: "Filesystem path or HTTP/HTTPS URL to the dataset file (e.g. data/raw/tmt_proteins.xlsx or data/raw/tidyproteomics_data.rds)"
            },
            platform: {
              type: "string",
              description: "Search platform or data type: ProteomeDiscoverer, MaxQuant, DIA-NN, Spectronaut, FragPipe, or tidyproteomics / rds"
            },
            analyte: {
              type: "string",
              description: "Type of analyte measured: 'proteins' or 'peptides'"
            }
          },
          required: []
        }
      },
      {
        name: "update_experiment_description",
        description: "Updates Section 2 of docs/experiment.md with the study hypothesis, biological model, treatment/control conditions, and key questions.",
        parameters: {
          type: "object",
          properties: {
            description: {
              type: "string",
              description: "Comprehensive scientific hypothesis and experiment design description"
            }
          },
          required: ["description"]
        }
      },
      {
        name: "update_sample_renaming",
        description: "Updates Section 3B of docs/experiment.md to pool or rename raw sample groups into clean biological cohorts (e.g. mapping batch tags into clean treatment/control groups).",
        parameters: {
          type: "object",
          properties: {
            sampleMapping: {
              type: "object",
              description: "Key-value dictionary mapping raw sample group names to cleaned group names, e.g. { 'active_batch5': 'active', 'healthy_batch8': 'healthy' }"
            }
          },
          required: ["sampleMapping"]
        }
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
              description: "Array of pairwise contrasts, e.g. ['Disease vs Control'] or ['Treated vs Untreated']"
            }
          },
          required: ["contrasts"]
        }
      },
      {
        name: "authorize_batch_confounding",
        description: "Updates Section 3D of docs/experiment.md to authorize Proceed With Potential Batch Confounding (TRUE or FALSE).",
        parameters: {
          type: "object",
          properties: {
            authorized: {
              type: "boolean",
              description: "Whether to authorize proceeding with unadjusted exploratory comparison despite batch confounding"
            }
          },
          required: ["authorized"]
        }
      },
      {
        name: "set_imputation_strategy",
        description: "Updates Section 3E of docs/experiment.md to configure and confirm the Missing Value Imputation Strategy ('randomforest_grouped', 'min_column', 'min_row_grouped', or 'none').",
        parameters: {
          type: "object",
          properties: {
            method: {
              type: "string",
              enum: ["randomforest_grouped", "min_column", "min_row_grouped", "none"],
              description: "Imputation method: 'randomforest_grouped' (MAR default: impute.randomforest, method='matrix', group_by_sample=TRUE), 'min_column' (MNAR/knockout: base::min, method='column'), 'min_row_grouped', or 'none'."
            },
            confirmed: {
              type: "boolean",
              description: "Whether the user has confirmed the imputation strategy (default TRUE)."
            }
          },
          required: ["confirmed"]
        }
      },
      {
        name: "start_or_resume_pipeline",
        description: "Triggers or resumes execution of the autonomous analysis pipeline when initial configuration is satisfied or when a halted phase's questions have been resolved.",
        parameters: {
          type: "object",
          properties: {
            phaseId: {
              type: "string",
              description: "Optional specific phase ID to rerun/resume, or omit to run the full pipeline"
            },
            reason: {
              type: "string",
              description: "Reason why the pipeline is starting or resuming"
            }
          },
          required: ["reason"]
        }
      },
      {
        name: "resume_pipeline",
        description: "Resumes execution of the autonomous analysis pipeline from the first incomplete phase or a specified phase.",
        parameters: {
          type: "object",
          properties: {
            fromPhase: {
              type: "string",
              description: "Optional specific phase ID to resume from (e.g. '04_expression'), or omit to resume from current checkpoint."
            },
            reason: {
              type: "string",
              description: "Reason why the pipeline is resuming"
            }
          },
          required: []
        }
      },
      {
        name: "restart_pipeline",
        description: "Restarts the entire autonomous analysis pipeline from Phase 0 from scratch.",
        parameters: {
          type: "object",
          properties: {
            reason: {
              type: "string",
              description: "Reason for restarting the pipeline"
            }
          },
          required: []
        }
      },
      {
        name: "stop_pipeline",
        description: "Pauses or stops the currently executing autonomous pipeline.",
        parameters: {
          type: "object",
          properties: {
            reason: {
              type: "string",
              description: "Reason for stopping the pipeline"
            }
          },
          required: []
        }
      },
      {
        name: "get_pipeline_status",
        description: "Fetches current pipeline execution status, completed phases, and error details.",
        parameters: {
          type: "object",
          properties: {},
          required: []
        }
      }
    ];
  }
  /**
   * Checks docs/experiment.md and generates proactive onboarding guidance if initial setup is incomplete.
   */
  async checkAndTriggerOnboarding() {
    if (!this.workspaceRoot)
      return false;
    const spec = await this.experimentManager.readSpec();
    if (spec.missingInitialFields.length > 0) {
      if (this.messages.length === 0) {
        const promptText = "\u{1F44B} **Welcome to TidyProteomicsAgent!**\n\nI am your live computational proteomics partner. I configure your study design and execute the 12-phase pipeline autonomously.\n\nTell me about your experiment in your own words (data file location, search platform, analyte, and comparison groups), or select a sample option below to get started!";
        const chips = [
          "data/raw/tidyproteomics_data.rds",
          "ProteomeDiscoverer",
          "DIA-NN",
          "MaxQuant",
          "Review docs/experiment.md \u2197"
        ];
        this.messages.push({
          id: "msg_onboard_" + Date.now(),
          role: "assistant",
          content: promptText,
          timestamp: (/* @__PURE__ */ new Date()).toLocaleTimeString(),
          quickChips: chips,
          type: "message"
        });
        this.notifyUpdated();
        return true;
      }
    } else if (this.messages.length === 0) {
      this.messages.push({
        id: "msg_ready_" + Date.now(),
        role: "assistant",
        content: "\u{1F44B} **Welcome back to TidyProteomicsAgent!**\n\nI reviewed `docs/experiment.md` and confirmed that all dataset parameters and your study hypothesis are configured! \u{1F680}\n\n**Ready to start the autonomous analysis pipeline?**",
        timestamp: (/* @__PURE__ */ new Date()).toLocaleTimeString(),
        quickChips: ["\u26A1 Yes, Start Pipeline", "Review docs/experiment.md \u2197"],
        type: "message"
      });
      this.notifyUpdated();
      return true;
    }
    return false;
  }
  /**
   * Posts or updates the live, in-progress activity status in the Agent panel.
   */
  handleStageActivity(phase, actionText) {
    const activityId = `activity_${phase.id}`;
    const title = phase.title || phase.fileName;
    const existingIdx = this.messages.findIndex((m) => m.id === activityId);
    const msg = {
      id: activityId,
      role: "assistant",
      content: actionText,
      timestamp: (/* @__PURE__ */ new Date()).toLocaleTimeString(),
      type: "activity",
      phaseId: phase.id,
      phaseTitle: title,
      badge: "In Progress"
    };
    if (existingIdx >= 0) {
      this.messages[existingIdx] = msg;
    } else {
      this.messages.push(msg);
    }
    this.notifyUpdated();
  }
  /**
   * Appends a structured scientific observation card discovered during phase execution.
   */
  handleStageObservation(phase, text, metadata) {
    const cleanText = String(text || "").trim();
    if (!cleanText)
      return;
    const isDuplicate = this.messages.some(
      (m) => m.type === "observation" && m.phaseId === phase.id && m.content === cleanText
    );
    if (isDuplicate)
      return;
    const title = phase.title || phase.fileName;
    const msg = {
      id: `obs_${phase.id}_${Date.now()}`,
      role: "assistant",
      content: cleanText,
      timestamp: (/* @__PURE__ */ new Date()).toLocaleTimeString(),
      type: "observation",
      phaseId: phase.id,
      phaseTitle: title,
      badge: metadata?.badge || "Observation"
    };
    this.messages.push(msg);
    this.notifyUpdated();
  }
  /**
   * Pushes a real-time activity card into the Agent chat when a phase starts execution.
   */
  handlePhaseStarted(phase) {
    const key = `started_${phase.id}_${phase.startTime || Date.now()}`;
    if (this.phaseEventsPosted.has(key))
      return;
    this.phaseEventsPosted.add(key);
    const title = phase.title || phase.fileName;
    const msg = {
      id: "msg_start_" + phase.id + "_" + Date.now(),
      role: "assistant",
      content: `\u25B6 **Starting Phase ${phase.id}:** ${title}`,
      timestamp: (/* @__PURE__ */ new Date()).toLocaleTimeString(),
      type: "milestone",
      phaseId: phase.id,
      phaseTitle: title,
      badge: "Phase Started"
    };
    this.messages.push(msg);
    this.notifyUpdated();
  }
  /**
   * Called when a phase completes successfully.
   * Removes in-progress activity and pushes a completion summary card into Agent chat.
   */
  async handlePhaseCompleted(phase) {
    if (this.lastHaltedPhaseId === phase.id) {
      this.lastHaltedPhaseId = void 0;
    }
    const activityId = `activity_${phase.id}`;
    const actIdx = this.messages.findIndex((m) => m.id === activityId);
    if (actIdx >= 0) {
      this.messages.splice(actIdx, 1);
    }
    const key = `completed_${phase.id}_${phase.endTime || Date.now()}`;
    if (!this.phaseEventsPosted.has(key)) {
      this.phaseEventsPosted.add(key);
      const title = phase.title || phase.fileName;
      const dur = phase.durationSeconds ? `${phase.durationSeconds}s` : "completed";
      const tokens = phase.tokenUsage?.totalTokens ? `${phase.tokenUsage.totalTokens.toLocaleString()} tokens` : "";
      const metrics = [dur, tokens].filter(Boolean).join(", ");
      const msg = {
        id: "msg_done_" + phase.id + "_" + Date.now(),
        role: "assistant",
        content: `\u2713 **Phase ${phase.id} Complete:** ${title}${metrics ? ` (${metrics})` : ""}`,
        timestamp: (/* @__PURE__ */ new Date()).toLocaleTimeString(),
        type: "milestone",
        phaseId: phase.id,
        phaseTitle: title,
        badge: "Phase Completed"
      };
      this.messages.push(msg);
      this.notifyUpdated();
    }
    return true;
  }
  /**
   * Pushes an alert card when the entire pipeline finishes.
   */
  handlePipelineFinished(state) {
    this.lastHaltedPhaseId = void 0;
    const key = `pipeline_finished_${state.endTime || Date.now()}`;
    if (this.phaseEventsPosted.has(key))
      return;
    this.phaseEventsPosted.add(key);
    const totalToks = state.totalTokens?.totalTokens ? state.totalTokens.totalTokens.toLocaleString() : "0";
    const msg = {
      id: "msg_finished_" + Date.now(),
      role: "assistant",
      content: `\u{1F389} **Autonomous Pipeline Finished**: All phases completed successfully!

\u2022 Total Tokens: **${totalToks}**
\u2022 Final Synthesis & Figures compiled in \`docs/\` and \`data/\``,
      timestamp: (/* @__PURE__ */ new Date()).toLocaleTimeString(),
      quickChips: ["Review docs/manuscript.md \u2197", "\u{1F4CA} Pipeline Status"]
    };
    this.messages.push(msg);
    this.notifyUpdated();
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
    const isImputationNeeded = /imputation|Section 3\.?E|Confirm Imputation Strategy|randomforest_grouped|min_column/i.test(errorText);
    if (phase.id === "03" || isImputationNeeded) {
      questionPrompt = `\u{1F9EC} **Imputation Strategy Confirmation in ${phase.title || phase.fileName}**

Per Karpievitch et al. (*BMC Bioinformatics* 2012), Random Forest (\`randomforest_grouped\`: \`impute.randomforest, method = 'matrix', group_by_sample = TRUE\`) excels for general MAR missingness, whereas column-wise minimum (\`min_column\`: \`base::min, method = 'column'\`) is recommended for intentional gene knockouts, suppressions, or MNAR binary switches.

Would you like to confirm the recommended strategy in Section 3.E of \`docs/experiment.md\` or switch methods?`;
      chips = ["\u{1F3AF} Confirm Imputation & Proceed", "Use Random Forest (MAR Default)", "Use Column Min (MNAR / Knockout)", "Review docs/experiment.md \u2197"];
    } else if (phase.id === "04" && (isConfounding || isContrastNeeded)) {
      questionPrompt = `\u{1F3AF} **Contrast Confirmation & Confounding Authorization in ${phase.title || phase.fileName}**

Phase 4 requires confirmation of target contrasts in Section 3.C and authorization of exploratory linear modeling in Section 3.D.

Would you like to confirm the target contrast and authorize proceeding?`;
      chips = ["\u{1F3AF} Confirm Contrast & Proceed", "Review docs/experiment.md \u2197"];
    } else if (isConfounding) {
      questionPrompt = `\u26A0\uFE0F **Batch Confounding Alert in ${phase.title || phase.fileName}**

The pipeline detected that biological conditions are correlated with technical processing batches. Linear models cannot mathematically separate batch variance from biology.

**Would you like to authorize an exploratory comparison despite potential batch confounding?**`;
      chips = ["\u{1F3AF} Confirm Contrast & Proceed", "\u26A1 Authorize Confounding & Resume", "No, do not proceed"];
    } else if (isSampleGrouping) {
      questionPrompt = `\u{1F9EA} **Sample Renaming & Grouping Required in ${phase.title || phase.fileName}**

The ingested dataset contains raw sample names with technical batch tags. How would you like to rename or group these samples? *(e.g., which samples are \`Control\` and which are \`Disease\`?)*`;
      chips = ["Review docs/experiment.md \u2197"];
    } else if (isContrastNeeded) {
      questionPrompt = `\u{1F3AF} **Target Contrast Required in ${phase.title || phase.fileName}**

Before calculating differential expression, what comparison would you like to test? *(e.g., \`Disease vs Control\` or \`Treated vs Vehicle\`)*`;
      chips = ["\u{1F3AF} Confirm Contrast & Proceed", "Disease vs Control", "Treatment vs Control"];
    } else {
      const firstLine = errorText.split("\n")[0] || "Phase paused.";
      questionPrompt = `\u26A0\uFE0F **Pipeline Paused in ${phase.title || phase.fileName}**

${firstLine}

How would you like to resolve this? Tell me what changes to make in \`docs/experiment.md\` or ask for advice.`;
      chips = ["What caused this?", "Check docs/experiment.md \u2197"];
    }
    this.messages.push({
      id: haltKey,
      role: "assistant",
      content: questionPrompt,
      timestamp: (/* @__PURE__ */ new Date()).toLocaleTimeString(),
      quickChips: chips
    });
    this.notifyUpdated();
  }
  /**
   * Assembles the live context snapshot from the workspace to empower the agent.
   */
  async buildSystemPrompt() {
    const experiment = await this.readFileSafe(path9.join("docs", "experiment.md"));
    const notes = await this.readFileSafe(path9.join("docs", "notes.md"));
    const llm = await this.readFileSafe(path9.join("docs", "llm.md"));
    let pipelineStatusText = "No pipeline state available.";
    if (this.getPipelineState) {
      try {
        const state = await this.getPipelineState();
        if (state && Array.isArray(state.phases) && state.phases.length > 0) {
          pipelineStatusText = state.phases.map((p, idx) => {
            const statusStr = (p.status || "pending").toUpperCase();
            let info = `${idx + 1}. [${statusStr}] ${p.title || p.fileName}`;
            if (p.durationSeconds)
              info += ` (${p.durationSeconds}s)`;
            if (p.error)
              info += `
   Error/Warning: ${p.error.slice(0, 300)}`;
            return info;
          }).join("\n");
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
${notes ? notes.slice(-3e3) : "No runtime notes found."}
\`\`\`

#### Active Model Info (docs/llm.md):
\`\`\`markdown
${llm || "Not specified."}
\`\`\`

#### TidyProteomics Execution Engine:
- **Engine**: Persistent in-memory tidyproteomics R session via Model Context Protocol (MCP).
- **Live In-Memory Workflow**: Automated ingestion (\`tpa_load\`), QC inspection (\`tpa_inspect\`, \`tpa_summary\`), normalization benchmarking (\`tpa_normalize\`), quantitative imputation (\`tpa_impute\`), differential expression (\`tpa_expression\`), pathway enrichment (\`tpa_enrichment\`), and state export (\`tpa_export_state\`).

### AGENT RESPONSIBILITIES & FREE-FORM NATURAL PROMPT RESOLUTION:
1. **Natural Conversational Setup**: The researcher can describe their experiment freely in plain English (e.g. data file location, search platform, analyte, treatment vs control conditions, and biological hypothesis). You MUST parse all stated parameters and immediately invoke the corresponding tools:
   - Call \`update_experiment_parameters({ pathToDataFile, platform, analyte })\` for any dataset path, platform, or analyte mentioned.
   - Call \`update_target_contrasts({ contrasts: [...] })\` for any treatment/control comparisons mentioned (e.g. \`["KO vs WT"]\`).
   - Call \`update_experiment_description({ description })\` for the biological hypothesis, model system, or study goals.
   - If the researcher says to run/start the pipeline, call \`start_or_resume_pipeline\`.
2. **Concise, Professional Paraphrases**: In your conversational response, do NOT ask robotic multi-part questionnaires. Paraphrase what you configured in 1\u20132 friendly sentences, mention what (if anything) remains to configure, and ask if they are ready to proceed.
3. **Interactive Error & Checkpoint Resolution**:
   - If user provides sample group mappings, call \`update_sample_renaming\`.
   - If user confirms contrast or confounding, call \`update_target_contrasts\` and \`authorize_batch_confounding(authorized = true)\` and resume.
`.trim();
  }
  /**
   * Sends a user query to the agent and streams/returns the response.
   */
  async sendMessage(userText, onToken) {
    if (this.isBusy) {
      throw new Error("Agent is already generating a response.");
    }
    this.isBusy = true;
    this.abortRequested = false;
    const userMsgId = "msg_" + Date.now() + "_u";
    const userTimestamp = (/* @__PURE__ */ new Date()).toLocaleTimeString();
    this.messages.push({
      id: userMsgId,
      role: "user",
      content: userText,
      timestamp: userTimestamp
    });
    this.notifyUpdated();
    console.log("[AgentService] Received user query:", userText);
    try {
      const trimmed = userText.trim();
      const lower = trimmed.toLowerCase();
      const isStopIntent = /^(?:stop|pause|abort|halt|cancel)(?:\s+(?:the\s+)?pipeline)?$/i.test(trimmed) || /^(?:please\s+)?(?:stop|pause|abort|halt)\b/i.test(trimmed);
      if (isStopIntent) {
        await this.triggerStop();
        const reply = "\u23F9 **Pipeline Paused**: Execution paused by user.";
        if (onToken)
          onToken(reply);
        const agentMsg2 = {
          id: "msg_" + Date.now() + "_a",
          role: "assistant",
          content: reply,
          timestamp: (/* @__PURE__ */ new Date()).toLocaleTimeString(),
          quickChips: ["\u25B6 Resume Pipeline", "\u{1F4CA} Pipeline Status"]
        };
        this.messages.push(agentMsg2);
        await this.logAgentTurn(userText, reply);
        this.notifyUpdated();
        return { reply, usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 } };
      }
      const isRestartIntent = /^(?:restart|start over|re-run all|run from (?:the )?beginning|run from scratch|restart pipeline)$/i.test(trimmed) || /\b(?:restart|re-run all)\s+(?:the\s+)?pipeline\b/i.test(trimmed);
      if (isRestartIntent) {
        const reply = "\u{1F504} **Restarting Pipeline**: Re-executing all phases from Phase 0...";
        if (onToken)
          onToken(reply);
        const agentMsg2 = {
          id: "msg_" + Date.now() + "_a",
          role: "assistant",
          content: reply,
          timestamp: (/* @__PURE__ */ new Date()).toLocaleTimeString()
        };
        this.messages.push(agentMsg2);
        await this.triggerRestart();
        await this.logAgentTurn(userText, reply);
        this.notifyUpdated();
        return { reply, usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 } };
      }
      const isStatusIntent = /^(?:status|pipeline status|how are we doing\??|what phase are we on\??|current status\??)$/i.test(trimmed);
      if (isStatusIntent && this.getPipelineState) {
        const state = await this.getPipelineState();
        let statusReply = "\u{1F4CA} **Autonomous Pipeline Status**:\n\n";
        if (state && Array.isArray(state.phases) && state.phases.length > 0) {
          const phasesList = state.phases.map((p, idx) => {
            const icon = p.status === "completed" ? "\u2713" : p.status === "failed" ? "\u274C" : p.status === "running" ? "\u25B6" : "\u23F3";
            let s = `${icon} **Phase ${p.id}**: ${p.title || p.fileName} (${p.status.toUpperCase()})`;
            if (p.durationSeconds)
              s += ` - ${p.durationSeconds}s`;
            if (p.error)
              s += `
   \u21B3 *Checkpoint/Error*: ${p.error.split("\n")[0]}`;
            return s;
          }).join("\n");
          statusReply += phasesList;
          const totalToks = state.totalTokens?.totalTokens || 0;
          statusReply += `

**Total Tokens**: ${totalToks.toLocaleString()}`;
        } else {
          statusReply += "No active pipeline phases found.";
        }
        if (onToken)
          onToken(statusReply);
        const agentMsg2 = {
          id: "msg_" + Date.now() + "_a",
          role: "assistant",
          content: statusReply,
          timestamp: (/* @__PURE__ */ new Date()).toLocaleTimeString(),
          quickChips: ["\u25B6 Resume Pipeline", "Review docs/experiment.md \u2197"]
        };
        this.messages.push(agentMsg2);
        await this.logAgentTurn(userText, statusReply);
        this.notifyUpdated();
        return { reply: statusReply, usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 } };
      }
      const isAuthorizeAffirmative = /^(authorize|authorize and resume|authorize confounding|yes,? authorize|yes,? proceed|⚡ authorize confounding & resume)$/i.test(lower);
      const isConfirmContrastAffirmative = /^(🎯\s*)?confirm contrast(?:\s*(&|and)\s*proceed)?$/i.test(trimmed) || /\bconfirm contrast\b/i.test(lower) && /\bproceed\b/i.test(lower) || /\bconfirm.*contrast.*proceed\b/i.test(lower);
      const isConfirmImputationAffirmative = /^(🎯\s*)?confirm imputation(?:\s*(&|and)\s*proceed)?$/i.test(trimmed) || /^use random forest/i.test(trimmed) || /^use column min/i.test(trimmed) || /\bconfirm imputation\b/i.test(lower);
      const preSpec = await this.experimentManager.readSpec();
      const isSimpleChipAnswer = trimmed.length < 50 && !trimmed.includes("\n") && !trimmed.includes(" ") && (/^(ProteomeDiscoverer|MaxQuant|DIA-NN|Spectronaut|FragPipe|tidyproteomics)$/i.test(trimmed) || /^(proteins|peptides)$/i.test(trimmed) || /^(?:data\/[a-zA-Z0-9_\-./]+\.(?:rds|xlsx|txt|tsv|csv)|[a-zA-Z0-9_\-./]+\.(?:rds|xlsx|txt|tsv|csv))$/i.test(trimmed));
      if (isSimpleChipAnswer && preSpec.missingInitialFields.length > 0) {
        if (/^(ProteomeDiscoverer|MaxQuant|DIA-NN|Spectronaut|FragPipe|tidyproteomics)$/i.test(trimmed)) {
          await this.experimentManager.setParameter("PLATFORM", trimmed);
        } else if (/^(proteins|peptides)$/i.test(trimmed)) {
          await this.experimentManager.setParameter("ANALYTE", trimmed.toLowerCase());
        } else if (/\.(rds|xlsx|txt|tsv|csv)$/i.test(trimmed)) {
          await this.experimentManager.setParameter("PATH_TO_DATA_FILE", trimmed);
        }
      }
      if (isConfirmImputationAffirmative) {
        const chosenMethod = /^use column min/i.test(trimmed) ? "min_column" : /^use random forest/i.test(trimmed) ? "randomforest_grouped" : void 0;
        const finalMethod = await this.experimentManager.setImputationStrategy(chosenMethod, true);
        const reply = `\u2705 **Confirmed Imputation Strategy**: Set \`Imputation Method: ${finalMethod}\` and \`Confirm Imputation Strategy: TRUE\` in Section 3.E of \`docs/experiment.md\`.

Resuming missing value imputation (Phase 03)...`;
        if (onToken)
          onToken(reply);
        const agentMsg2 = {
          id: "msg_" + Date.now() + "_a",
          role: "assistant",
          content: reply,
          timestamp: (/* @__PURE__ */ new Date()).toLocaleTimeString()
        };
        this.messages.push(agentMsg2);
        const resumeId = this.lastHaltedPhaseId || "03";
        this.lastHaltedPhaseId = void 0;
        await this.triggerResume(resumeId);
        await this.logAgentTurn(userText, reply);
        this.notifyUpdated();
        return { reply, usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 } };
      }
      if (isConfirmContrastAffirmative || this.lastHaltedPhaseId && isAuthorizeAffirmative) {
        const confirmed = await this.experimentManager.confirmContrastAndAuthorizeConfounding();
        const contrastLabel = confirmed.length > 0 ? ` (\`${confirmed.join(", ")}\`)` : "";
        const reply = `\u2705 **Confirmed Target Contrast & Authorized Confounding**: Set target contrast${contrastLabel} as confirmed in Section 3.C and set \`Proceed With Potential Batch Confounding: TRUE\` in Section 3.D of \`docs/experiment.md\`.

Resuming differential expression analysis (Phase 04)...`;
        if (onToken)
          onToken(reply);
        const agentMsg2 = {
          id: "msg_" + Date.now() + "_a",
          role: "assistant",
          content: reply,
          timestamp: (/* @__PURE__ */ new Date()).toLocaleTimeString()
        };
        this.messages.push(agentMsg2);
        const resumeId = this.lastHaltedPhaseId || "04";
        this.lastHaltedPhaseId = void 0;
        this.lastSuggestedContrast = void 0;
        await this.triggerResume(resumeId);
        await this.logAgentTurn(userText, reply);
        this.notifyUpdated();
        return { reply, usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 } };
      }
      if (this.lastHaltedPhaseId) {
        const contrastMatch = trimmed.match(/^([a-zA-Z0-9_-]+)\s*(?:\/|vs\.?|versus)\s*([a-zA-Z0-9_-]+)$/i);
        const isContrastPhase = this.lastHaltedPhaseId.includes("04_expression") || !!this.lastSuggestedContrast;
        if (contrastMatch && isContrastPhase) {
          const contrast = `${contrastMatch[1]} vs ${contrastMatch[2]}`;
          await this.experimentManager.setTargetContrasts([contrast]);
          const reply = `\u2705 **Configured Target Contrast**: Saved \`- Contrast: ${contrast}\` in \`docs/experiment.md\`.

Resuming differential expression analysis now...`;
          if (onToken)
            onToken(reply);
          const agentMsg2 = {
            id: "msg_" + Date.now() + "_a",
            role: "assistant",
            content: reply,
            timestamp: (/* @__PURE__ */ new Date()).toLocaleTimeString()
          };
          this.messages.push(agentMsg2);
          const resumeId = this.lastHaltedPhaseId;
          this.lastHaltedPhaseId = void 0;
          this.lastSuggestedContrast = void 0;
          await this.triggerResume(resumeId);
          await this.logAgentTurn(userText, reply);
          this.notifyUpdated();
          return { reply, usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 } };
        }
      }
      const isQuestion = /\?|whats the issue|why did|why is|how do/i.test(lower);
      const isResumeKeyword = /^(yes|start|run|proceed|ready|continue|resume|go|go ahead|let'?s go|start pipeline|run pipeline|resume pipeline|yes,? start pipeline|⚡ yes, start pipeline)$/i.test(lower) || /\b(?:please\s+)?(?:proceed|continue)\b/i.test(lower) || /\b(?:start|run|resume)\s+(?:the\s+)?pipeline\b/i.test(lower);
      const isStartAffirmative = !isQuestion && isResumeKeyword;
      if (isStartAffirmative) {
        let state;
        if (this.getPipelineState) {
          try {
            state = await this.getPipelineState();
          } catch {
          }
        }
        if (state && Array.isArray(state.phases) && state.phases.length > 0) {
          const activePhases = state.phases.filter((p) => p.enabled !== false);
          const allCompleted = activePhases.length > 0 && activePhases.every((p) => p.status === "completed");
          if (allCompleted) {
            this.lastHaltedPhaseId = void 0;
            const reply = "\u{1F389} All pipeline phases are already completed! To re-run the entire pipeline from scratch, click 'Restart Pipeline' or type 'restart'.";
            if (onToken)
              onToken(reply);
            const agentMsg2 = {
              id: "msg_" + Date.now() + "_a",
              role: "assistant",
              content: reply,
              timestamp: (/* @__PURE__ */ new Date()).toLocaleTimeString(),
              quickChips: ["\u{1F504} Restart Pipeline", "Review docs/manuscript.md \u2197"]
            };
            this.messages.push(agentMsg2);
            await this.logAgentTurn(userText, reply);
            this.notifyUpdated();
            return { reply, usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 } };
          }
          if (this.lastHaltedPhaseId) {
            const haltedPhase = state.phases.find((p) => p.id === this.lastHaltedPhaseId);
            if (haltedPhase && haltedPhase.status === "completed") {
              this.lastHaltedPhaseId = void 0;
            }
          }
        }
        const spec = await this.experimentManager.readSpec();
        if (spec.missingInitialFields.length === 0) {
          const cfg2 = this.client.getConfig();
          if (cfg2.provider !== "ollama" && !cfg2.apiKey) {
            const reply2 = "\u26A0\uFE0F **API Key Required**: Please configure an API Key in the **Provider** tab before launching the autonomous pipeline.";
            if (onToken)
              onToken(reply2);
            const agentMsg3 = {
              id: "msg_" + Date.now() + "_a",
              role: "assistant",
              content: reply2,
              timestamp: (/* @__PURE__ */ new Date()).toLocaleTimeString(),
              quickChips: ["Switch to Provider Tab \u2197"]
            };
            this.messages.push(agentMsg3);
            this.notifyUpdated();
            return { reply: reply2, usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 } };
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
                this.lastHaltedPhaseId = void 0;
                const reply2 = "\u{1F389} All pipeline phases are already completed! To re-run the entire pipeline from scratch, click 'Restart Pipeline' or type 'restart'.";
                if (onToken)
                  onToken(reply2);
                const agentMsg3 = {
                  id: "msg_" + Date.now() + "_a",
                  role: "assistant",
                  content: reply2,
                  timestamp: (/* @__PURE__ */ new Date()).toLocaleTimeString(),
                  quickChips: ["\u{1F504} Restart Pipeline", "Review docs/manuscript.md \u2197"]
                };
                this.messages.push(agentMsg3);
                await this.logAgentTurn(userText, reply2);
                this.notifyUpdated();
                return { reply: reply2, usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 } };
              }
            } else {
              const found = state.phases.find((p) => p.id === resumeId);
              if (found)
                resumeTitle = found.title;
            }
          }
          const targetDisplay = resumeId ? `Phase ${resumeId}${resumeTitle ? ` (${resumeTitle})` : ""}` : "the autonomous pipeline";
          const reply = `\u{1F680} **Resuming Pipeline Execution**: Verification passed. Continuing ${targetDisplay}...`;
          if (onToken)
            onToken(reply);
          const agentMsg2 = {
            id: "msg_" + Date.now() + "_a",
            role: "assistant",
            content: reply,
            timestamp: (/* @__PURE__ */ new Date()).toLocaleTimeString()
          };
          this.messages.push(agentMsg2);
          this.lastHaltedPhaseId = void 0;
          this.lastSuggestedContrast = void 0;
          await this.triggerResume(resumeId);
          await this.logAgentTurn(userText, reply);
          this.notifyUpdated();
          return { reply, usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 } };
        }
      }
      const cfg = this.client.getConfig();
      if (cfg.provider !== "ollama" && !cfg.apiKey) {
        const reply = "\u26A0\uFE0F **API Key Required**: To chat with the Live Agent on open-ended scientific topics, please configure an API Key in the **Provider** tab.";
        if (onToken)
          onToken(reply);
        const agentMsg2 = {
          id: "msg_" + Date.now() + "_a",
          role: "assistant",
          content: reply,
          timestamp: (/* @__PURE__ */ new Date()).toLocaleTimeString(),
          quickChips: ["Switch to Provider Tab \u2197"]
        };
        this.messages.push(agentMsg2);
        await this.logAgentTurn(userText, reply);
        this.notifyUpdated();
        return { reply, usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 } };
      }
      const systemPrompt = await this.buildSystemPrompt();
      const recentMessages = this.messages.slice(-16);
      const chatMessages = recentMessages.map((m) => ({
        role: m.role,
        content: m.content
      }));
      let accumulatedContent = "";
      const tools = this.getAgentTools();
      console.log(`[AgentService] Sending query to ${cfg.provider} (${cfg.model})...`);
      const response = await this.client.chat({
        system: systemPrompt,
        messages: chatMessages,
        tools,
        onToken: (chunk) => {
          if (this.abortRequested)
            return;
          accumulatedContent += chunk;
          if (onToken)
            onToken(chunk);
        }
      });
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
                  executedActionSummary += `
\u2022 Updated \`PATH_TO_DATA_FILE\` to \`${tc.args.pathToDataFile}\``;
                }
                if (tc.args?.platform) {
                  await this.experimentManager.setParameter("PLATFORM", tc.args.platform);
                  executedActionSummary += `
\u2022 Updated \`PLATFORM\` to \`${tc.args.platform}\``;
                }
                if (tc.args?.analyte) {
                  await this.experimentManager.setParameter("ANALYTE", tc.args.analyte);
                  executedActionSummary += `
\u2022 Updated \`ANALYTE\` to \`${tc.args.analyte}\``;
                }
                break;
              }
              case "update_experiment_description": {
                if (tc.args?.description) {
                  await this.experimentManager.setDescription(tc.args.description);
                  executedActionSummary += "\n\u2022 Updated Section 2 Experimental Hypothesis & Study Design";
                }
                break;
              }
              case "update_sample_renaming": {
                if (tc.args?.sampleMapping) {
                  await this.experimentManager.setSampleRenamingMap(tc.args.sampleMapping);
                  executedActionSummary += "\n\u2022 Configured Sample Group Renaming & Pooling Map in Section 3B";
                  pipelineTriggered = true;
                }
                break;
              }
              case "update_target_contrasts": {
                if (Array.isArray(tc.args?.contrasts) && tc.args.contrasts.length > 0) {
                  await this.experimentManager.setTargetContrasts(tc.args.contrasts);
                  executedActionSummary += `
\u2022 Configured Target Contrasts: ${tc.args.contrasts.join(", ")}`;
                  pipelineTriggered = true;
                }
                break;
              }
              case "authorize_batch_confounding": {
                await this.experimentManager.setBatchConfounding(tc.args?.authorized !== false);
                executedActionSummary += `
\u2022 Set Proceed With Potential Batch Confounding to \`${tc.args?.authorized !== false ? "TRUE" : "FALSE"}\``;
                pipelineTriggered = true;
                break;
              }
              case "set_imputation_strategy": {
                const finalMethod = await this.experimentManager.setImputationStrategy(tc.args?.method, tc.args?.confirmed !== false);
                executedActionSummary += `
\u2022 Configured Imputation Strategy to \`${finalMethod}\` (Confirmed: \`${tc.args?.confirmed !== false ? "TRUE" : "FALSE"}\`) in Section 3E`;
                pipelineTriggered = true;
                break;
              }
              case "start_or_resume_pipeline":
              case "resume_pipeline": {
                pipelineTriggered = true;
                const chosen = tc.args?.fromPhase || tc.args?.phaseId;
                if (chosen)
                  resumePhaseId = chosen;
                executedActionSummary += `
\u2022 Resuming autonomous pipeline (${tc.args?.reason || "User requested"})`;
                break;
              }
              case "restart_pipeline": {
                await this.triggerRestart();
                executedActionSummary += `
\u2022 Restarted autonomous pipeline from scratch (${tc.args?.reason || "User requested"})`;
                break;
              }
              case "stop_pipeline": {
                await this.triggerStop();
                executedActionSummary += `
\u2022 Paused autonomous pipeline (${tc.args?.reason || "User requested"})`;
                break;
              }
              case "get_pipeline_status": {
                executedActionSummary += `
\u2022 Queried pipeline execution status`;
                break;
              }
            }
          } catch (toolErr) {
            console.error(`[AgentService] Error executing tool ${tc.name}:`, toolErr);
          }
        }
      }
      const postSpec = await this.experimentManager.readSpec();
      let followUpQuestion = "";
      let followUpChips = [];
      if (postSpec.missingInitialFields.length > 0) {
        const nextMissing = postSpec.missingInitialFields[0];
        if (nextMissing === "PLATFORM") {
          followUpQuestion = "\n\nCould you also specify which mass spectrometry search platform generated this data?";
          followUpChips = ["ProteomeDiscoverer", "MaxQuant", "DIA-NN", "Spectronaut", "FragPipe", "tidyproteomics"];
        } else if (nextMissing === "ANALYTE") {
          followUpQuestion = "\n\nIs this dataset measuring `proteins` or `peptides`?";
          followUpChips = ["proteins", "peptides"];
        } else if (nextMissing === "DESCRIPTION") {
          followUpQuestion = "\n\nCould you briefly share your biological hypothesis or comparison model? *(e.g. treatment vs vehicle, knockout vs control)*";
        }
      } else if (executedActionSummary && !pipelineTriggered) {
        followUpQuestion = "\n\n\u{1F389} **All dataset parameters and study description are set up in `docs/experiment.md`!**\n\nReady to start the autonomous analysis pipeline?";
        followUpChips = ["\u26A1 Yes, Start Pipeline", "Review docs/experiment.md \u2197"];
      }
      let finalReply = accumulatedContent;
      if (!finalReply && response.content) {
        finalReply = response.content;
      }
      if (executedActionSummary && !finalReply.includes("docs/experiment.md")) {
        finalReply = (finalReply ? finalReply + "\n\n" : "") + `\u{1F4BE} **Updated \`docs/experiment.md\`:**${executedActionSummary}`;
      }
      if (followUpQuestion && !finalReply.toLowerCase().includes("pipeline?") && !finalReply.toLowerCase().includes("platform")) {
        finalReply += followUpQuestion;
      }
      if (this.abortRequested) {
        finalReply += "\n\n*(Agent response cancelled by user)*";
      }
      const agentMsgId = "msg_" + Date.now() + "_a";
      const agentTimestamp = (/* @__PURE__ */ new Date()).toLocaleTimeString();
      const agentMsg = {
        id: agentMsgId,
        role: "assistant",
        content: finalReply,
        timestamp: agentTimestamp,
        quickChips: followUpChips.length > 0 ? followUpChips : void 0
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
                  resumePhaseId = incomplete ? incomplete.id : void 0;
                }
              }
            }
          } catch {
          }
        }
        this.lastHaltedPhaseId = void 0;
        this.lastSuggestedContrast = void 0;
        this.triggerResume(resumePhaseId).catch((err) => {
          console.error("[AgentService] Error running pipeline after agent resolution:", err);
        });
      }
      this.notifyUpdated();
      return {
        reply: finalReply,
        usage: response.usage
      };
    } finally {
      this.isBusy = false;
      this.abortRequested = false;
    }
  }
  async logAgentTurn(userText, agentReply, usage) {
    if (!this.workspaceRoot)
      return;
    try {
      const legacyLogDir = path9.join(this.workspaceRoot, "logs", "advisor");
      const logDir = path9.join(this.workspaceRoot, "logs", "agent");
      if (fsSync3.existsSync(legacyLogDir) && !fsSync3.existsSync(logDir)) {
        await fs9.rename(legacyLogDir, logDir).catch(() => {
        });
      }
      if (!fsSync3.existsSync(logDir)) {
        await fs9.mkdir(logDir, { recursive: true });
      }
      const logFile = path9.join(logDir, "chat.md");
      const d = (/* @__PURE__ */ new Date()).toISOString();
      const tokensInfo = usage ? ` *(Tokens: ${usage.totalTokens || 0})*` : "";
      const entry = `

### [${d}] User:
${userText}

### [${d}] Agent${tokensInfo}:
${agentReply}

---
`;
      if (!fsSync3.existsSync(logFile)) {
        const header = `# TidyProteomics Agent Chat Trace

This log records consultative dialogues between the user and the TidyProteomics Agent.

---
`;
        await fs9.writeFile(logFile, header + entry, "utf-8");
      } else {
        await fs9.appendFile(logFile, entry, "utf-8");
      }
    } catch (err) {
      console.error("[AgentService] Error logging agent turn:", err);
    }
  }
  logAdvisorTurn = (userText, reply, usage) => this.logAgentTurn(userText, reply, usage);
  getAdvisorTools = () => this.getAgentTools();
};

// src/agent/providers/ExecutionManager.ts
var vscode3 = __toESM(require("vscode"));

// src/agent/providers/McpExecutionProvider.ts
var path10 = __toESM(require("path"));
var fs10 = __toESM(require("fs"));
var readline2 = __toESM(require("readline"));
var import_child_process4 = require("child_process");
var vscode2 = __toESM(require("vscode"));
var McpExecutionProvider = class {
  mode = "mcp";
  proc = null;
  rl = null;
  workspaceRoot = "";
  msgId = 0;
  pendingRequests = /* @__PURE__ */ new Map();
  tools = [];
  isReady() {
    return this.proc !== null && this.tools.length > 0;
  }
  async initialize(workspaceRoot) {
    this.workspaceRoot = workspaceRoot;
    const config = vscode2.workspace.getConfiguration("tidyproteomicsagent");
    const mcpMode = config.get("mcpMode") || "local";
    let targetWorkspace = workspaceRoot;
    if (mcpMode === "docker") {
      const dockerImage = config.get("dockerImage") || "tidyproteomics-mcp:latest";
      targetWorkspace = "/workspace";
      this.proc = (0, import_child_process4.spawn)(
        "docker",
        [
          "run",
          "-i",
          "--rm",
          "-v",
          `${workspaceRoot}:/workspace`,
          "-e",
          "WORKSPACE=/workspace",
          dockerImage
        ],
        {
          cwd: workspaceRoot,
          stdio: ["pipe", "pipe", "pipe"]
        }
      );
    } else {
      let serverRelPath = config.get("mcpServerPath") || path10.resolve(workspaceRoot, "../tidyproteomics/mcp/server.py");
      const candidatePaths = [
        path10.isAbsolute(serverRelPath) ? serverRelPath : path10.resolve(workspaceRoot, serverRelPath),
        path10.resolve(workspaceRoot, "../tidyproteomics/mcp/server.py"),
        path10.resolve(workspaceRoot, "mcp/server.py"),
        path10.resolve(process.env.HOME || "", "Local/github/tidyproteomics/mcp/server.py")
      ];
      let serverPath = "";
      for (const p of candidatePaths) {
        if (fs10.existsSync(p)) {
          serverPath = p;
          break;
        }
      }
      if (!serverPath) {
        throw new Error(
          `tidyproteomics MCP server script not found. Checked:
${candidatePaths.join("\n")}

Tip: You can set tidyproteomicsagent.mcpMode to "docker" in VSCode Settings to run containerized without local Python/R dependencies.`
        );
      }
      const pythonBin = config.get("pythonPath") || (fs10.existsSync("/opt/homebrew/bin/python3") ? "/opt/homebrew/bin/python3" : process.env.PYTHON || "python3");
      this.proc = (0, import_child_process4.spawn)(pythonBin, [serverPath], {
        cwd: workspaceRoot,
        stdio: ["pipe", "pipe", "pipe"]
      });
    }
    if (!this.proc.stdout || !this.proc.stdin) {
      throw new Error("Failed to initialize MCP stdio channels.");
    }
    this.proc.on("error", (err) => {
      console.error("[McpExecutionProvider] Process error:", err);
      for (const { reject } of this.pendingRequests.values()) {
        reject(new Error(`MCP server failed to spawn: ${err.message}`));
      }
      this.pendingRequests.clear();
    });
    this.rl = readline2.createInterface({
      input: this.proc.stdout,
      terminal: false
    });
    this.rl.on("line", (line) => {
      const trimmed = line.trim();
      if (!trimmed)
        return;
      try {
        const msg = JSON.parse(trimmed);
        const id = msg.id;
        if (id !== void 0 && this.pendingRequests.has(id)) {
          const { resolve: resolve3, reject } = this.pendingRequests.get(id);
          this.pendingRequests.delete(id);
          if (msg.error) {
            reject(new Error(msg.error.message || JSON.stringify(msg.error)));
          } else {
            resolve3(msg.result);
          }
        }
      } catch (err) {
        console.error("[McpExecutionProvider] Failed to parse message line:", line, err);
      }
    });
    this.proc.on("exit", (code, signal) => {
      console.warn(`[McpExecutionProvider] Process exited with code ${code}, signal ${signal}`);
      for (const { reject } of this.pendingRequests.values()) {
        reject(new Error(`MCP server exited prematurely (code: ${code})`));
      }
      this.pendingRequests.clear();
    });
    await this.sendRequest("initialize", {
      protocolVersion: "2024-11-05",
      clientInfo: { name: "TidyProteomicsAgent", version: "1.0.0" },
      workspaceRoot: targetWorkspace,
      rootPath: targetWorkspace
    });
    this.sendNotification("notifications/initialized");
    const toolsResp = await this.sendRequest("tools/list", {});
    this.tools = toolsResp.tools || [];
    try {
      await this.callTool("tpa_set_workspace", { workspace: targetWorkspace, reset: false });
    } catch (err) {
      console.warn("[McpExecutionProvider] Notice: tpa_set_workspace error:", err);
    }
  }
  sendRequest(method, params = {}) {
    return new Promise((resolve3, reject) => {
      if (!this.proc || !this.proc.stdin) {
        return reject(new Error("MCP process is not running."));
      }
      const id = ++this.msgId;
      this.pendingRequests.set(id, { resolve: resolve3, reject });
      const payload = JSON.stringify({ jsonrpc: "2.0", id, method, params }) + "\n";
      this.proc.stdin.write(payload);
    });
  }
  sendNotification(method, params = {}) {
    if (!this.proc || !this.proc.stdin)
      return;
    const payload = JSON.stringify({ jsonrpc: "2.0", method, params }) + "\n";
    this.proc.stdin.write(payload);
  }
  async dispose() {
    if (this.rl) {
      this.rl.close();
      this.rl = null;
    }
    if (this.proc) {
      try {
        this.proc.kill("SIGTERM");
      } catch (_) {
      }
      this.proc = null;
    }
    this.pendingRequests.clear();
  }
  activePhase = "";
  setActivePhase(phaseName) {
    if (!phaseName)
      return;
    this.activePhase = path10.basename(phaseName).replace(/\.md$/i, "").toLowerCase();
  }
  getRegisteredTools() {
    return this.tools;
  }
  async executeTool(name, args) {
    const res = await this.callTool(name, args);
    try {
      this.mirrorOutputToLogs(name, args, res.content);
    } catch (_) {
    }
    return res.content;
  }
  mirrorOutputToLogs(toolName, args, output) {
    if (!this.workspaceRoot)
      return;
    const logsDir = path10.join(this.workspaceRoot, "logs");
    let targetPhase = this.activePhase;
    if (!targetPhase) {
      try {
        if (fs10.existsSync(logsDir)) {
          const entries = fs10.readdirSync(logsDir, { withFileTypes: true });
          const subdirs = entries.filter((e) => e.isDirectory() && !e.name.startsWith(".")).map((e) => path10.join(logsDir, e.name)).sort((a, b) => {
            try {
              return fs10.statSync(b).mtimeMs - fs10.statSync(a).mtimeMs;
            } catch {
              return 0;
            }
          });
          if (subdirs.length > 0) {
            targetPhase = path10.basename(subdirs[0]);
          }
        }
      } catch (_) {
      }
    }
    if (!targetPhase)
      return;
    try {
      const targetDir = path10.join(logsDir, targetPhase);
      if (!fs10.existsSync(targetDir)) {
        fs10.mkdirSync(targetDir, { recursive: true });
      }
      const targetLogFile = path10.join(targetDir, "console.log");
      const timestamp = (/* @__PURE__ */ new Date()).toISOString();
      const entry = `
[${timestamp}] [MCP Tool] ${toolName}(${JSON.stringify(args)})
${output}
`;
      fs10.appendFileSync(targetLogFile, entry, "utf-8");
    } catch (_) {
    }
  }
  async callTool(name, args = {}) {
    const res = await this.sendRequest("tools/call", { name, arguments: args });
    const content = (res.content || []).filter((c) => c.type === "text").map((c) => c.text).join("\n");
    return {
      success: !res.isError,
      content,
      isError: !!res.isError
    };
  }
};

// src/agent/providers/ExecutionManager.ts
var ExecutionManager = class {
  constructor(workspaceRoot, toolRegistry) {
    this.workspaceRoot = workspaceRoot;
    this.toolRegistry = toolRegistry;
    this.currentProvider = new McpExecutionProvider();
    this.statusBarItem = vscode3.window.createStatusBarItem(
      vscode3.StatusBarAlignment.Right,
      100
    );
    this.statusBarItem.command = "tidyproteomicsagent.toggleEngine";
    this.updateStatusBar();
    this.statusBarItem.show();
  }
  currentProvider;
  statusBarItem;
  setWorkspaceRoot(newRoot) {
    this.workspaceRoot = newRoot || "";
  }
  async initialize() {
    try {
      await this.currentProvider.initialize(this.workspaceRoot);
      this.syncToolRegistry();
      this.updateStatusBar();
    } catch (err) {
      console.warn(`[ExecutionManager] Failed to initialize MCP provider:`, err);
      vscode3.window.showErrorMessage(
        `Failed to connect to TidyProteomics MCP Server: ${err.message || String(err)}`
      );
      this.updateStatusBar(false);
    }
  }
  get provider() {
    return this.currentProvider;
  }
  get mode() {
    return "mcp";
  }
  async setMode(_newMode) {
    await this.initialize();
  }
  async toggleEngine() {
    const ready = this.currentProvider.isReady();
    if (ready) {
      const toolsCount = this.currentProvider.getRegisteredTools().length;
      vscode3.window.showInformationMessage(
        `TidyProteomics MCP Engine active (${toolsCount} tools registered in memory).`
      );
    } else {
      vscode3.window.showInformationMessage(
        "TidyProteomics MCP Engine is initializing or reconnecting..."
      );
      await this.initialize();
    }
  }
  syncToolRegistry() {
    if (!this.toolRegistry)
      return;
    const mcpTools = this.currentProvider.getRegisteredTools();
    const toolDefs = mcpTools.map((t) => ({
      name: t.name,
      description: t.description,
      parameters: {
        type: "object",
        properties: t.inputSchema?.properties || {},
        required: t.inputSchema?.required || []
      }
    }));
    this.toolRegistry.registerMcpTools(toolDefs, (name, args) => {
      return this.currentProvider.executeTool(name, args);
    });
    this.toolRegistry.setMcpPhaseListener((phase) => {
      this.setActivePhase(phase);
    });
  }
  setActivePhase(phaseName) {
    if (this.currentProvider.setActivePhase) {
      this.currentProvider.setActivePhase(phaseName);
    }
  }
  updateStatusBar(connected) {
    const isConn = connected !== void 0 ? connected : this.currentProvider.isReady();
    this.statusBarItem.text = isConn ? "$(server) TidyProteomics: MCP" : "$(alert) TidyProteomics: Disconnected";
    this.statusBarItem.tooltip = isConn ? "TidyProteomics MCP Server connected (In-Memory S3 Session). Click for status." : "TidyProteomics MCP Server not connected. Click to retry connection.";
  }
  async dispose() {
    this.statusBarItem.dispose();
    await this.currentProvider.dispose();
  }
};

// src/ui/SidebarViewProvider.ts
var SidebarViewProvider = class {
  constructor(_extensionUri, context) {
    this._extensionUri = _extensionUri;
    this.context = context;
    this.workspaceRoot = this.getActiveWorkspaceRoot();
    this.literatureService = new LiteratureService(
      this.workspaceRoot,
      this._extensionUri.fsPath,
      () => vscode4.workspace.getConfiguration("tidyproteomicsagent").get("rscriptPath")
    );
    this.corpusService = this.literatureService;
    const wsConfig = vscode4.workspace.getConfiguration("tidyproteomicsagent");
    const savedBaseUrl = wsConfig.get("baseUrl") || context.globalState.get("tidyproteomicsagent.baseUrl") || "";
    const savedProvider = wsConfig.get("provider") || context.globalState.get("tidyproteomicsagent.provider") || "anthropic";
    const savedModel = wsConfig.get("model") || context.globalState.get("tidyproteomicsagent.model") || "claude-3-7-sonnet-20250219";
    const savedMaxTokens = wsConfig.get("maxTokens") || context.globalState.get("tidyproteomicsagent.maxTokens") || 32768;
    const savedTimeoutSeconds = wsConfig.get("timeoutSeconds") || context.globalState.get("tidyproteomicsagent.timeoutSeconds") || 600;
    const fallbackApiKey = wsConfig.get("apiKey") || context.globalState.get("tidyproteomicsagent.apiKey") || "";
    const config = {
      provider: savedProvider,
      model: savedModel,
      apiKey: fallbackApiKey,
      baseUrl: savedBaseUrl,
      maxTokens: savedMaxTokens,
      timeoutSeconds: savedTimeoutSeconds
    };
    this.client = new ProviderClient(config);
    context.secrets.get("tidyproteomicsagent.apiKey").then(
      (secretKey) => {
        if (secretKey) {
          this.client.updateConfig({ apiKey: secretKey });
          this.syncActiveModelSummary().catch(() => {
          });
          this.refreshState().catch(() => {
          });
        }
      },
      (err) => {
        console.warn("[SidebarViewProvider] Could not load API key from secrets:", err);
      }
    );
    this.tools = new ToolRegistry(this.workspaceRoot);
    this.executionManager = new ExecutionManager(this.workspaceRoot, this.tools);
    this.executionManager.initialize().catch((err) => {
      console.warn("[SidebarViewProvider] Could not initialize ExecutionManager:", err);
    });
    this.orchestrator = new PipelineOrchestrator(
      this.workspaceRoot,
      this.client,
      this.tools,
      (state) => this.sendStateUpdate(state),
      (log, updateLast) => this.sendLog(log, updateLast),
      this.getExtensionVersion(),
      (phase, text) => this.agentService?.handleStageActivity(phase, text),
      (phase, text, meta) => this.agentService?.handleStageObservation(phase, text, meta)
    );
    this.ingestionRunner = new IngestionRunner(
      this.literatureService,
      this.client,
      this._extensionUri.fsPath,
      (ev) => {
        this.sendLiteratureProgress(ev);
        this.sendLiteratureState();
      },
      (log, updateLast) => this.sendLog(log, updateLast)
    );
    this.agentService = new AgentService(
      this.workspaceRoot,
      this.client,
      async () => this.orchestrator?.getState(),
      async (phaseId) => {
        if (!this.workspaceRoot) {
          vscode4.window.showErrorMessage("TidyProteomicsAgent: Please open a workspace folder first.");
          return;
        }
        const cfg = this.client.getConfig();
        if (cfg.provider !== "ollama" && !cfg.apiKey) {
          vscode4.window.showErrorMessage("TidyProteomicsAgent: Please enter an API key in the Provider tab first.");
          return;
        }
        await this.syncActiveModelSummary();
        if (phaseId) {
          vscode4.window.showInformationMessage(`TidyProteomicsAgent: Resuming pipeline from phase ${phaseId}...`);
          this.orchestrator?.resumePipeline(phaseId).catch((err) => {
            vscode4.window.showErrorMessage(`TidyProteomicsAgent: Phase execution error - ${err.message}`);
          });
        } else {
          vscode4.window.showInformationMessage("TidyProteomicsAgent: Starting/resuming pipeline execution...");
          this.orchestrator?.resumePipeline().catch((err) => {
            vscode4.window.showErrorMessage(`TidyProteomicsAgent: Pipeline error - ${err.message}`);
          });
        }
      },
      () => {
        if (this._view && this._view.webview) {
          this._view.webview.postMessage({
            type: "agentState",
            isGenerating: this.agentService.isRunning(),
            messages: this.agentService.getMessages()
          });
        }
      },
      this._extensionUri.fsPath,
      async (fromPhaseId) => {
        await this.syncActiveModelSummary();
        vscode4.window.showInformationMessage(`TidyProteomicsAgent: Resuming pipeline from ${fromPhaseId || "next checkpoint"}...`);
        await this.orchestrator?.resumePipeline(fromPhaseId);
      },
      () => {
        vscode4.window.showInformationMessage("TidyProteomicsAgent: Pausing pipeline...");
        this.orchestrator?.stop();
      },
      async () => {
        await this.syncActiveModelSummary();
        vscode4.window.showInformationMessage("TidyProteomicsAgent: Restarting pipeline from beginning...");
        await this.orchestrator?.restartPipeline();
      }
    );
    this.syncActiveModelSummary().catch(() => {
    });
    context.subscriptions.push(
      vscode4.workspace.onDidChangeConfiguration(async (e) => {
        if (e.affectsConfiguration("tidyproteomicsagent")) {
          const cfg = vscode4.workspace.getConfiguration("tidyproteomicsagent");
          const updatedProv = cfg.get("provider");
          this.client.updateConfig({
            ...updatedProv ? { provider: updatedProv } : {},
            model: cfg.get("model"),
            baseUrl: cfg.get("baseUrl"),
            maxTokens: cfg.get("maxTokens"),
            timeoutSeconds: cfg.get("timeoutSeconds")
          });
          if (e.affectsConfiguration("tidyproteomicsagent.engine")) {
            const newEngine = cfg.get("engine");
            if (newEngine === "mcp" || newEngine === "markdown_skill") {
              this.executionManager.setMode(newEngine).catch((err) => {
                console.warn("[SidebarViewProvider] Error setting engine mode:", err);
              });
            }
          }
          await this.syncActiveModelSummary();
          this.refreshState().catch(() => {
          });
        }
      })
    );
  }
  static viewType = "tidyproteomicsagent.sidebarView";
  _view;
  orchestrator;
  client;
  tools;
  executionManager;
  literatureService;
  corpusService;
  ingestionRunner;
  agentService;
  get advisorService() {
    return this.agentService;
  }
  previousPhaseStatuses = /* @__PURE__ */ new Map();
  workspaceRoot;
  customWorkspaceRoot;
  onFolderChangedCallback;
  getExecutionManager() {
    return this.executionManager;
  }
  async toggleEngine() {
    await this.executionManager.toggleEngine();
    await this.syncActiveModelSummary();
    const state = await this.orchestrator?.getState();
    if (state)
      this.sendStateUpdate(state);
    if (this._view && this._view.webview) {
      this._view.webview.postMessage({
        type: "engineUpdate",
        engine: this.executionManager.mode
      });
    }
  }
  async dispose() {
    await this.executionManager.dispose();
  }
  getExtensionVersion() {
    try {
      if (this.context.extension?.packageJSON?.version) {
        return this.context.extension.packageJSON.version;
      }
      const pkgPath = path11.join(this._extensionUri.fsPath, "package.json");
      if (fs11.existsSync(pkgPath)) {
        const pkg = JSON.parse(fs11.readFileSync(pkgPath, "utf-8"));
        if (pkg.version)
          return pkg.version;
      }
    } catch (_) {
    }
    return "0.1.0";
  }
  async syncActiveModelSummary() {
    if (!this.workspaceRoot)
      return;
    try {
      const version = this.getExtensionVersion();
      if (this.orchestrator) {
        this.orchestrator.setExtensionVersion(version);
      }
      await writeActiveModelSummaryFile(this.workspaceRoot, this.client.getConfig(), version, this.executionManager ? this.executionManager.mode : "mcp");
    } catch (err) {
      console.error("[SidebarViewProvider] Error syncing active model summary:", err);
    }
  }
  setCustomWorkspaceRoot(folderPath) {
    this.customWorkspaceRoot = folderPath;
    this.workspaceRoot = folderPath;
    this.literatureService.setWorkspaceRoot(folderPath);
    this.agentService.setWorkspaceRoot(folderPath);
  }
  getActiveWorkspaceRoot() {
    if (this.customWorkspaceRoot && fs11.existsSync(this.customWorkspaceRoot)) {
      return this.customWorkspaceRoot;
    }
    const folders = vscode4.workspace.workspaceFolders;
    if (folders && folders.length > 0) {
      const activeDoc2 = vscode4.window.activeTextEditor?.document;
      if (activeDoc2 && activeDoc2.uri.scheme === "file") {
        const matchingFolder = vscode4.workspace.getWorkspaceFolder(activeDoc2.uri);
        if (matchingFolder) {
          const fsPath2 = matchingFolder.uri.fsPath;
          if (fsPath2.endsWith("/extension") || fsPath2.endsWith("\\extension")) {
            const parent = path11.dirname(fsPath2);
            if (fs11.existsSync(path11.join(parent, "agent")) || fs11.existsSync(path11.join(parent, "prompts")) || fs11.existsSync(path11.join(parent, "analysis"))) {
              return parent;
            }
          }
          return fsPath2;
        }
      }
      const fsPath = folders[0].uri.fsPath;
      if (fsPath.endsWith("/extension") || fsPath.endsWith("\\extension")) {
        const parent = path11.dirname(fsPath);
        if (fs11.existsSync(path11.join(parent, "agent")) || fs11.existsSync(path11.join(parent, "prompts")) || fs11.existsSync(path11.join(parent, "analysis"))) {
          return parent;
        }
      }
      return fsPath;
    }
    const activeDoc = vscode4.window.activeTextEditor?.document;
    if (activeDoc && activeDoc.uri.scheme === "file") {
      const docDir = path11.dirname(activeDoc.uri.fsPath);
      if (fs11.existsSync(path11.join(docDir, "agent")) || fs11.existsSync(path11.join(docDir, "prompts")) || fs11.existsSync(path11.join(docDir, "analysis"))) {
        return docDir;
      }
      const parentDir = path11.dirname(docDir);
      if (fs11.existsSync(path11.join(parentDir, "agent")) || fs11.existsSync(path11.join(parentDir, "prompts")) || fs11.existsSync(path11.join(parentDir, "analysis"))) {
        return parentDir;
      }
      return docDir;
    }
    return "";
  }
  isScanning = false;
  pendingScan = false;
  async onWorkspaceChanged() {
    try {
      if (this.orchestrator?.getIsRunning()) {
        return;
      }
      this.customWorkspaceRoot = void 0;
      const newRoot = this.getActiveWorkspaceRoot();
      const changed = newRoot !== this.workspaceRoot;
      this.workspaceRoot = newRoot;
      this.tools.setWorkspaceRoot(this.workspaceRoot);
      this.literatureService.setWorkspaceRoot(this.workspaceRoot);
      this.agentService.setWorkspaceRoot(this.workspaceRoot);
      this.executionManager.setWorkspaceRoot(this.workspaceRoot);
      if (changed) {
        this.executionManager.initialize().catch(() => {
        });
      }
      if (this.orchestrator) {
        if (changed) {
          await this.orchestrator.setWorkingDirectory(this.workspaceRoot);
        } else {
          await this.refreshPhases();
        }
      }
      await this.syncActiveModelSummary();
    } catch (err) {
      console.error("[SidebarViewProvider] Error in onWorkspaceChanged:", err);
    }
  }
  async refreshPhases() {
    if (this.isScanning || this.orchestrator?.getIsRunning()) {
      return;
    }
    this.isScanning = true;
    try {
      if (this.orchestrator) {
        await this.orchestrator.rescanPhases();
        const state = await this.orchestrator.getState();
        this.sendStateUpdate(state);
      }
    } catch (err) {
      console.error("[SidebarViewProvider] Error in refreshPhases:", err);
    } finally {
      this.isScanning = false;
      if (this.pendingScan && !this.orchestrator?.getIsRunning()) {
        this.pendingScan = false;
        this.refreshPhases().catch(() => {
        });
      }
    }
  }
  async refreshState() {
    try {
      if (this.orchestrator) {
        const state = await this.orchestrator.getState();
        this.sendStateUpdate(state);
      }
    } catch (err) {
      console.error("[SidebarViewProvider] Error in refreshState:", err);
    }
  }
  async forceReload() {
    if (this.isScanning || this.orchestrator?.getIsRunning()) {
      return;
    }
    try {
      if (this.orchestrator) {
        await this.orchestrator.forceReloadFromDisk();
        const state = await this.orchestrator.getState();
        this.sendStateUpdate(state);
      }
    } catch (err) {
      console.error("[SidebarViewProvider] Error in forceReload:", err);
    }
  }
  async resetAllState() {
    if (this.isScanning || this.orchestrator?.getIsRunning()) {
      return;
    }
    try {
      await this.syncActiveModelSummary();
      if (this.orchestrator) {
        await this.orchestrator.resetAllState();
      }
    } catch (err) {
      console.error("[SidebarViewProvider] Error in resetAllState:", err);
    }
  }
  resolveWebviewView(webviewView, _context, _token) {
    this._view = webviewView;
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri]
    };
    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);
    setTimeout(() => {
      this.syncActiveModelSummary().catch(() => {
      });
      this.refreshPhases().catch(() => {
      });
    }, 150);
    webviewView.onDidChangeVisibility(() => {
      if (webviewView.visible) {
        if (!this.orchestrator?.getIsRunning()) {
          this.refreshPhases().catch(() => {
          });
        } else {
          this.refreshState().catch(() => {
          });
        }
      }
    });
    webviewView.webview.onDidReceiveMessage(async (data) => {
      try {
        switch (data.type) {
          case "saveConfig": {
            const maxTokens = Number(data.maxTokens) || 32768;
            const timeoutSeconds = Number(data.timeoutSeconds) || 600;
            this.client.updateConfig({
              provider: data.provider,
              model: data.model,
              apiKey: data.apiKey,
              baseUrl: data.baseUrl,
              maxTokens,
              timeoutSeconds
            });
            if (data.apiKey) {
              await this.context.secrets.store("tidyproteomicsagent.apiKey", data.apiKey);
            } else if (data.apiKey === "") {
              await this.context.secrets.delete("tidyproteomicsagent.apiKey");
            }
            try {
              const wsConfig = vscode4.workspace.getConfiguration("tidyproteomicsagent");
              await wsConfig.update("provider", data.provider, vscode4.ConfigurationTarget.Global);
              await wsConfig.update("model", data.model, vscode4.ConfigurationTarget.Global);
              await wsConfig.update("baseUrl", data.baseUrl, vscode4.ConfigurationTarget.Global);
              await wsConfig.update("maxTokens", maxTokens, vscode4.ConfigurationTarget.Global);
              await wsConfig.update("timeoutSeconds", timeoutSeconds, vscode4.ConfigurationTarget.Global);
            } catch (_) {
            }
            await this.context.globalState.update("tidyproteomicsagent.provider", data.provider);
            await this.context.globalState.update("tidyproteomicsagent.model", data.model);
            await this.context.globalState.update("tidyproteomicsagent.baseUrl", data.baseUrl);
            await this.context.globalState.update("tidyproteomicsagent.maxTokens", maxTokens);
            await this.context.globalState.update("tidyproteomicsagent.timeoutSeconds", timeoutSeconds);
            await this.syncActiveModelSummary();
            if (!data.silent) {
              vscode4.window.showInformationMessage("TidyProteomicsAgent: Configuration saved!");
            }
            const state = await this.orchestrator?.getState();
            if (state)
              this.sendStateUpdate(state);
            break;
          }
          case "toggleEngine": {
            await this.toggleEngine();
            break;
          }
          case "setEngine": {
            if (data.engine === "mcp" || data.engine === "markdown_skill") {
              await this.executionManager.setMode(data.engine);
              await this.syncActiveModelSummary();
              const state = await this.orchestrator?.getState();
              if (state)
                this.sendStateUpdate(state);
              if (this._view && this._view.webview) {
                this._view.webview.postMessage({
                  type: "engineUpdate",
                  engine: this.executionManager.mode
                });
              }
            }
            break;
          }
          case "startPipeline": {
            if (!this.workspaceRoot) {
              vscode4.window.showErrorMessage("TidyProteomicsAgent: Please open a workspace folder in VS Code first.");
              return;
            }
            if (this.orchestrator?.getIsRunning()) {
              vscode4.window.showInformationMessage("TidyProteomicsAgent: Pipeline is already running.");
              return;
            }
            const cfg = this.client.getConfig();
            if (cfg.provider !== "ollama" && !cfg.apiKey) {
              vscode4.window.showErrorMessage("TidyProteomicsAgent: Please enter an API key first.");
              return;
            }
            await this.syncActiveModelSummary();
            this.orchestrator?.runFullPipeline().catch((err) => {
              vscode4.window.showErrorMessage(`TidyProteomicsAgent: Pipeline error - ${err.message}`);
            });
            break;
          }
          case "runPhase": {
            if (!this.workspaceRoot) {
              vscode4.window.showErrorMessage("TidyProteomicsAgent: Please open a workspace folder in VS Code first.");
              return;
            }
            if (this.orchestrator?.getIsRunning()) {
              vscode4.window.showInformationMessage("TidyProteomicsAgent: Pipeline is already running.");
              return;
            }
            const cfg = this.client.getConfig();
            if (cfg.provider !== "ollama" && !cfg.apiKey) {
              vscode4.window.showErrorMessage("TidyProteomicsAgent: Please enter an API key first.");
              return;
            }
            await this.syncActiveModelSummary();
            this.orchestrator?.runSinglePhase(data.phaseId).catch((err) => {
              vscode4.window.showErrorMessage(`TidyProteomicsAgent: Phase execution error - ${err.message}`);
            });
            break;
          }
          case "togglePhase": {
            this.orchestrator?.togglePhase(data.phaseId, data.enabled);
            break;
          }
          case "stopPipeline": {
            this.orchestrator?.stop();
            break;
          }
          case "forceReload": {
            await this.forceReload();
            break;
          }
          case "resetState": {
            await this.resetAllState();
            break;
          }
          case "openFile": {
            if (!this.workspaceRoot) {
              vscode4.window.showErrorMessage("TidyProteomicsAgent: Please open a workspace folder in VS Code first.");
              return;
            }
            const targetRelPath = data.relPath || "";
            const targetPath = path11.isAbsolute(targetRelPath) ? targetRelPath : path11.join(this.workspaceRoot, targetRelPath);
            try {
              if (!fs11.existsSync(targetPath)) {
                fs11.mkdirSync(path11.dirname(targetPath), { recursive: true });
                fs11.writeFileSync(targetPath, "", "utf-8");
              }
              const doc = await vscode4.workspace.openTextDocument(targetPath);
              let selection;
              if (data.line && data.line > 0) {
                const lineNum = Math.min(data.line - 1, doc.lineCount - 1);
                selection = new vscode4.Range(lineNum, 0, lineNum, 0);
              } else if (data.searchText) {
                const text = doc.getText();
                const idx = text.indexOf(data.searchText);
                if (idx !== -1) {
                  const pos = doc.positionAt(idx);
                  selection = new vscode4.Range(pos, pos);
                }
              }
              const editor = await vscode4.window.showTextDocument(doc, selection ? { selection } : void 0);
              if (selection) {
                editor.revealRange(selection, vscode4.TextEditorRevealType.InCenter);
              }
            } catch (err) {
              vscode4.window.showErrorMessage(`TidyProteomicsAgent: Could not open ${targetRelPath}: ${err.message}`);
            }
            break;
          }
          case "confirmContrastAndProceed":
          case "authorizeConfoundingAndRerun": {
            if (!this.workspaceRoot)
              return;
            const expPath = path11.join(this.workspaceRoot, "docs", "experiment.md");
            try {
              if (this.agentService) {
                const expManager = this.agentService.getExperimentManager();
                await expManager.confirmContrastAndAuthorizeConfounding();
              } else if (fs11.existsSync(expPath)) {
                let content = await fs11.promises.readFile(expPath, "utf-8");
                content = content.replace(
                  /-\s*\*\*Proceed With Potential Batch Confounding\*\*:\s*FALSE/i,
                  "- **Proceed With Potential Batch Confounding**: TRUE"
                );
                content = content.replace(
                  /-\s*\*\*Authorize Unadjusted Exploratory Comparison\*\*:\s*FALSE/i,
                  "- **Authorize Unadjusted Exploratory Comparison**: TRUE"
                );
                content = content.replace(
                  /-\s*\*\*Confirm Imputation Strategy\*\*:\s*FALSE/i,
                  "- **Confirm Imputation Strategy**: TRUE"
                );
                content = content.replace(/👉\s*\[USER ACTION REQUIRED - DEFINE TARGET CONTRASTS\]:?/gi, "");
                content = content.replace(/\(suggested contrast requiring confirmation\)/gi, "");
                if (!content.includes("Status: CONFIRMED")) {
                  content = content.replace(
                    /(###\s*(?:3\.C|C)\.?\s*Target [Cc]ontrasts[\s\S]*?)(?=###\s*(?:3\.D|D)\.|$|##)/i,
                    "$1\nStatus: CONFIRMED\n\n"
                  );
                }
                await fs11.promises.writeFile(expPath, content, "utf-8");
              }
              const phaseId = data.phaseId || "04";
              const msgLabel = phaseId === "03" ? "TidyProteomicsAgent: Imputation strategy confirmed in docs/experiment.md. Resuming Phase 3..." : "TidyProteomicsAgent: Target contrast confirmed & batch confounding authorized in docs/experiment.md. Resuming Phase 4...";
              vscode4.window.showInformationMessage(msgLabel);
              if (phaseId && this.orchestrator) {
                await this.syncActiveModelSummary();
                this.orchestrator.resumePipeline(phaseId).catch((err) => {
                  vscode4.window.showErrorMessage(`TidyProteomicsAgent: Pipeline execution error - ${err.message}`);
                });
              }
            } catch (err) {
              vscode4.window.showErrorMessage(`TidyProteomicsAgent: Could not update docs/experiment.md: ${err.message}`);
            }
            break;
          }
          case "openPhase": {
            if (!this.workspaceRoot) {
              vscode4.window.showErrorMessage("TidyProteomicsAgent: Please open a workspace folder in VS Code first.");
              return;
            }
            const fileName = data.fileName || "";
            const targetPath = fileName.includes("/") || fileName.includes("\\") ? path11.join(this.workspaceRoot, fileName) : path11.join(this.workspaceRoot, "analysis", fileName);
            try {
              const doc = await vscode4.workspace.openTextDocument(targetPath);
              await vscode4.window.showTextDocument(doc);
            } catch (err) {
              vscode4.window.showErrorMessage(`TidyProteomicsAgent: Could not open ${fileName}: ${err.message}`);
            }
            break;
          }
          case "copyPath": {
            if (this.workspaceRoot) {
              await vscode4.env.clipboard.writeText(this.workspaceRoot);
              vscode4.window.showInformationMessage("TidyProteomicsAgent: Workspace path copied to clipboard!");
            }
            break;
          }
          case "revealInOS": {
            if (this.workspaceRoot) {
              await vscode4.commands.executeCommand("revealFileInOS", vscode4.Uri.file(this.workspaceRoot));
            }
            break;
          }
          case "getDesignerState": {
            await this.sendDesignerState();
            break;
          }
          case "applyContrastDesigner": {
            if (!this.workspaceRoot)
              return;
            try {
              const expManager = this.agentService.getExperimentManager();
              const treatment = (data.treatment || "").trim();
              const control = (data.control || "").trim();
              if (treatment && control) {
                await expManager.setTargetContrasts([`\`${treatment}\` / \`${control}\``]);
              } else {
                await expManager.confirmExistingContrasts();
              }
              await expManager.setBatchConfounding(data.allowConfounding === true);
              if (typeof data.reassignPooling === "boolean") {
                const expPath = path11.join(this.workspaceRoot, "docs", "experiment.md");
                if (fs11.existsSync(expPath)) {
                  let c = await fs11.promises.readFile(expPath, "utf-8");
                  c = c.replace(
                    /(-\s*\*\*Reassign Sample Names According to (?:Sample Group Renaming & )?Pooling Map\*\*:\s*)(TRUE|FALSE)/i,
                    `$1${data.reassignPooling ? "TRUE" : "FALSE"}`
                  );
                  await fs11.promises.writeFile(expPath, c, "utf-8");
                }
              }
              vscode4.window.showInformationMessage(
                `TidyProteomicsAgent: Target contrast applied to docs/experiment.md (${treatment || "selected"} vs ${control || "control"}).`
              );
              const phaseId = data.phaseId || "04";
              if (phaseId && this.orchestrator) {
                await this.syncActiveModelSummary();
                this.orchestrator.resumePipeline(phaseId).catch((err) => {
                  vscode4.window.showErrorMessage(`TidyProteomicsAgent: Pipeline execution error - ${err.message}`);
                });
              }
              await this.sendDesignerState();
            } catch (err) {
              vscode4.window.showErrorMessage(`TidyProteomicsAgent: Could not apply contrast: ${err.message}`);
            }
            break;
          }
          case "selectDirectory": {
            const chosen = await vscode4.window.showOpenDialog({
              canSelectFiles: false,
              canSelectFolders: true,
              canSelectMany: false,
              openLabel: "Select Analysis Folder"
            });
            if (chosen && chosen.length > 0) {
              const selectedPath = chosen[0].fsPath;
              this.customWorkspaceRoot = selectedPath;
              this.workspaceRoot = selectedPath;
              this.tools.setWorkspaceRoot(this.workspaceRoot);
              this.literatureService.setWorkspaceRoot(this.workspaceRoot);
              this.agentService.setWorkspaceRoot(this.workspaceRoot);
              this.executionManager.setWorkspaceRoot(this.workspaceRoot);
              this.executionManager.initialize().catch(() => {
              });
              if (this.orchestrator) {
                await this.orchestrator.setWorkingDirectory(this.workspaceRoot);
              }
              await this.refreshPhases();
              await this.syncActiveModelSummary();
              if (this.onFolderChangedCallback) {
                this.onFolderChangedCallback(this.workspaceRoot);
              }
              vscode4.window.showInformationMessage(`TidyProteomicsAgent: Active directory set to ${this.workspaceRoot}`);
            }
            break;
          }
          case "rescanWorkspace": {
            await this.onWorkspaceChanged();
            vscode4.window.showInformationMessage("TidyProteomicsAgent: Rescanned workspace folders and phases.");
            break;
          }
          case "createMissingFolders": {
            if (!this.workspaceRoot) {
              vscode4.window.showErrorMessage("TidyProteomicsAgent: Please open a workspace folder in VS Code first.");
              return;
            }
            const standardDirs = ["analysis", "agent", "code", "data", path11.join("data", "raw"), "docs", "logs", "tools"];
            for (const d of standardDirs) {
              const fullDir = path11.join(this.workspaceRoot, d);
              if (!fs11.existsSync(fullDir)) {
                fs11.mkdirSync(fullDir, { recursive: true });
              }
            }
            await this.refreshPhases();
            vscode4.window.showInformationMessage("TidyProteomicsAgent: Standard project folders initialized!");
            break;
          }
          case "initWorkspace": {
            await this.initWorkspace(data.pipelineId || "differential_expression");
            break;
          }
          case "promptInitWorkspace": {
            await this.promptInitWorkspace();
            break;
          }
          case "requestState": {
            await this.refreshState();
            this.sendCorpusState();
            await this.agentService.checkAndTriggerOnboarding();
            break;
          }
          case "literatureGetState":
          case "corpusGetState": {
            this.sendLiteratureState();
            break;
          }
          case "literatureSelect":
          case "corpusSelect": {
            try {
              this.syncLiteratureWorkspace();
              this.literatureService.setActiveLiterature(data.fileName);
              this.sendLiteratureState();
              await this.refreshState();
            } catch (err) {
              vscode4.window.showErrorMessage(`TidyProteomicsAgent: ${err.message}`);
            }
            break;
          }
          case "literatureCreate":
          case "corpusCreate": {
            try {
              this.syncLiteratureWorkspace();
              const created = await this.literatureService.createDatabase(data.name);
              vscode4.window.showInformationMessage(`TidyProteomicsAgent: Created literature database '${created.fileName}'`);
              this.sendLiteratureState();
              await this.refreshState();
            } catch (err) {
              vscode4.window.showErrorMessage(`TidyProteomicsAgent: ${err.message}`);
            }
            break;
          }
          case "literatureToggleSynthesis":
          case "corpusToggleSynthesis": {
            this.syncLiteratureWorkspace();
            this.literatureService.setUseInSynthesis(!!data.enabled);
            this.sendLiteratureState();
            await this.refreshState();
            break;
          }
          case "literatureStats":
          case "corpusStats": {
            this.syncLiteratureWorkspace();
            const statsRes = await this.literatureService.getStats(data.fileName);
            if (this._view && this._view.webview) {
              const stats = statsRes.stats || statsRes.data?.stats || statsRes.data?.totals;
              this._view.webview.postMessage({ type: "literatureStats", result: statsRes, stats });
              this._view.webview.postMessage({ type: "corpusStats", result: statsRes, stats });
            }
            break;
          }
          case "literatureSearch":
          case "corpusSearch": {
            const searchRes = await this.literatureService.search(data.query, data.limit || 50, data.fileName);
            if (this._view && this._view.webview) {
              const results = searchRes.results || searchRes.data?.results || searchRes.data?.rows || [];
              this._view.webview.postMessage({ type: "literatureSearchResult", result: searchRes, results });
              this._view.webview.postMessage({ type: "corpusSearchResult", result: searchRes, results });
            }
            break;
          }
          case "literaturePickFolder":
          case "corpusPickFolder": {
            const chosen = await vscode4.window.showOpenDialog({
              canSelectFiles: false,
              canSelectFolders: true,
              canSelectMany: false,
              openLabel: "Select Literature Folder"
            });
            if (chosen && chosen.length > 0) {
              const folderPath = chosen[0].fsPath;
              try {
                this.literatureService.scanIngestFolder(folderPath);
                this.sendLiteratureState();
                vscode4.window.showInformationMessage(`TidyProteomicsAgent: Found ${this.literatureService.getViewState().queue.length} document(s) for ingestion queue.`);
              } catch (err) {
                vscode4.window.showErrorMessage(`TidyProteomicsAgent: ${err.message}`);
              }
            }
            break;
          }
          case "literatureClearQueue":
          case "corpusClearQueue": {
            this.literatureService.clearQueue();
            this.sendLiteratureState();
            break;
          }
          case "literatureStartIngest":
          case "corpusStartIngest": {
            const cfg = this.client.getConfig();
            if (cfg.provider !== "ollama" && !cfg.apiKey) {
              vscode4.window.showErrorMessage("TidyProteomicsAgent: Please enter an API key in the Provider tab before running literature extraction.");
              return;
            }
            const activeDb = data.fileName || this.literatureService.getConfig().activeLiterature || this.literatureService.getConfig().activeCorpus;
            if (!activeDb) {
              vscode4.window.showErrorMessage("TidyProteomicsAgent: Please select or create an active literature database first.");
              return;
            }
            this.sendLiteratureState();
            this.ingestionRunner.runIngestion(activeDb).then(async (res) => {
              this.sendLiteratureState();
              const statsRes = await this.literatureService.getStats(activeDb);
              if (this._view && this._view.webview) {
                const stats = statsRes.stats || statsRes.data?.stats || statsRes.data?.totals;
                this._view.webview.postMessage({ type: "literatureStats", result: statsRes, stats });
                this._view.webview.postMessage({ type: "corpusStats", result: statsRes, stats });
              }
              if (res.success) {
                vscode4.window.showInformationMessage(`TidyProteomicsAgent: Indexed ${res.processed} document(s) into ${activeDb}!`);
              } else {
                vscode4.window.showWarningMessage(`TidyProteomicsAgent: Ingestion finished with ${res.errors} error(s). See log for details.`);
              }
            }).catch((err) => {
              vscode4.window.showErrorMessage(`TidyProteomicsAgent: Ingestion error - ${err.message}`);
              this.sendLiteratureState();
            });
            break;
          }
          case "literatureAbortIngest":
          case "corpusAbortIngest": {
            this.ingestionRunner.abort();
            vscode4.window.showInformationMessage("TidyProteomicsAgent: Aborting ingestion...");
            break;
          }
          case "literatureGenerateReport": {
            const activeDb = data.fileName || this.literatureService.getConfig().activeLiterature || this.literatureService.getConfig().activeCorpus;
            if (!activeDb) {
              vscode4.window.showErrorMessage("TidyProteomicsAgent: Please select or create an active literature database first.");
              return;
            }
            try {
              vscode4.window.showInformationMessage(`TidyProteomicsAgent: Generating accounting report for ${activeDb}...`);
              const res = await this.literatureService.generateReport(activeDb);
              if (res.ok) {
                vscode4.window.showInformationMessage("TidyProteomicsAgent: Generated docs/literature_database.md");
                const docPath = path11.join(this.workspaceRoot || "", "docs", "literature_database.md");
                if (fs11.existsSync(docPath)) {
                  const doc = await vscode4.workspace.openTextDocument(docPath);
                  await vscode4.window.showTextDocument(doc, { preview: false });
                }
              } else {
                vscode4.window.showErrorMessage(`TidyProteomicsAgent: Failed to generate report: ${res.error}`);
              }
            } catch (err) {
              vscode4.window.showErrorMessage(`TidyProteomicsAgent: Report generation error - ${err.message}`);
            }
            break;
          }
          case "literatureOpenReport": {
            const docPath = path11.join(this.workspaceRoot || "", "docs", "literature_database.md");
            if (fs11.existsSync(docPath)) {
              const doc = await vscode4.workspace.openTextDocument(docPath);
              await vscode4.window.showTextDocument(doc, { preview: false });
            } else {
              const activeDb = this.literatureService.getConfig().activeLiterature || this.literatureService.getConfig().activeCorpus;
              if (activeDb) {
                const res = await this.literatureService.generateReport(activeDb);
                if (res.ok && fs11.existsSync(docPath)) {
                  const doc = await vscode4.workspace.openTextDocument(docPath);
                  await vscode4.window.showTextDocument(doc, { preview: false });
                  return;
                }
              }
              vscode4.window.showWarningMessage("TidyProteomicsAgent: docs/literature_database.md does not exist yet. Click 'Regenerate' first.");
            }
            break;
          }
          case "agentSendMessage":
          case "advisorSendMessage": {
            const text = String(data.text || "").trim();
            if (!text)
              return;
            console.log("[SidebarViewProvider] agentSendMessage:", text);
            try {
              const result = await this.agentService.sendMessage(text, (chunk) => {
                if (this._view && this._view.webview) {
                  this._view.webview.postMessage({
                    type: "agentChunk",
                    chunk
                  });
                }
              });
              if (this._view && this._view.webview) {
                this._view.webview.postMessage({
                  type: "agentDone",
                  reply: result.reply,
                  usage: result.usage,
                  messages: this.agentService.getMessages()
                });
              }
            } catch (err) {
              vscode4.window.showErrorMessage(`TidyProteomicsAgent Agent: ${err.message}`);
              if (this._view && this._view.webview) {
                this._view.webview.postMessage({
                  type: "agentError",
                  error: err.message || String(err),
                  messages: this.agentService.getMessages()
                });
              }
            }
            break;
          }
          case "agentClear":
          case "advisorClear": {
            await this.agentService.clearMessages();
            if (this._view && this._view.webview) {
              this._view.webview.postMessage({
                type: "agentState",
                isGenerating: false,
                messages: []
              });
            }
            break;
          }
          case "agentStop":
          case "advisorStop": {
            this.agentService.cancel();
            break;
          }
          case "agentGetState":
          case "advisorGetState": {
            await this.agentService.checkAndTriggerOnboarding();
            if (this._view && this._view.webview) {
              this._view.webview.postMessage({
                type: "agentState",
                isGenerating: this.agentService.isRunning(),
                messages: this.agentService.getMessages()
              });
            }
            break;
          }
          case "agentPickDataFile":
          case "advisorPickDataFile": {
            const fileUris = await vscode4.window.showOpenDialog({
              canSelectFiles: true,
              canSelectFolders: false,
              canSelectMany: false,
              openLabel: "Select Dataset File",
              title: "Select Mass Spectrometry Dataset File for TidyProteomics",
              filters: {
                "Proteomics Data": ["xlsx", "csv", "tsv", "txt", "rds", "parquet", "zip"],
                "All Files": ["*"]
              }
            });
            if (fileUris && fileUris.length > 0) {
              const selectedUri = fileUris[0];
              let targetPath = selectedUri.fsPath;
              if (this.workspaceRoot && targetPath.startsWith(this.workspaceRoot)) {
                targetPath = path11.relative(this.workspaceRoot, targetPath);
              }
              try {
                const result = await this.agentService.sendMessage(targetPath, (chunk) => {
                  if (this._view && this._view.webview) {
                    this._view.webview.postMessage({
                      type: "agentChunk",
                      chunk
                    });
                  }
                });
                if (this._view && this._view.webview) {
                  this._view.webview.postMessage({
                    type: "agentDone",
                    reply: result.reply,
                    usage: result.usage,
                    messages: this.agentService.getMessages()
                  });
                }
              } catch (err) {
                vscode4.window.showErrorMessage(`TidyProteomicsAgent Agent: ${err.message}`);
                if (this._view && this._view.webview) {
                  this._view.webview.postMessage({
                    type: "agentError",
                    error: err.message || String(err),
                    messages: this.agentService.getMessages()
                  });
                }
              }
            }
            break;
          }
        }
      } catch (e) {
        vscode4.window.showErrorMessage(`TidyProteomicsAgent Error: ${e.message}`);
      }
    });
  }
  async promptInitWorkspace() {
    if (!this.workspaceRoot) {
      const chosen2 = await vscode4.window.showOpenDialog({
        canSelectFiles: false,
        canSelectFolders: true,
        canSelectMany: false,
        openLabel: "Select Analysis Folder to Initialize"
      });
      if (chosen2 && chosen2.length > 0) {
        this.workspaceRoot = chosen2[0].fsPath;
        this.customWorkspaceRoot = this.workspaceRoot;
        this.tools.setWorkspaceRoot(this.workspaceRoot);
        this.literatureService.setWorkspaceRoot(this.workspaceRoot);
        this.agentService.setWorkspaceRoot(this.workspaceRoot);
        this.executionManager.setWorkspaceRoot(this.workspaceRoot);
        this.executionManager.initialize().catch(() => {
        });
        if (this.orchestrator) {
          await this.orchestrator.setWorkingDirectory(this.workspaceRoot);
        }
        if (this.onFolderChangedCallback) {
          this.onFolderChangedCallback(this.workspaceRoot);
        }
        await this.syncActiveModelSummary();
      } else {
        return;
      }
    }
    const items = [
      {
        label: "$(symbol-structure) Differential Expression Pipeline",
        description: "Full 11-phase workflow (Install, Inspect, Normalize, Impute, Expression, Enrichment, Observations, Knowledge, WebSearch, Literature, Synthesis)",
        id: "differential_expression"
      },
      {
        label: "$(graph) Quality Control & Exploration Pipeline",
        description: "2-phase rapid QC and exploratory data analysis",
        id: "quality_control_only"
      }
    ];
    const chosen = await vscode4.window.showQuickPick(items, {
      placeHolder: "Select a pipeline template to initialize this workspace"
    });
    if (chosen) {
      await this.initWorkspace(chosen.id);
    }
  }
  async initWorkspace(pipelineId = "differential_expression") {
    if (!this.workspaceRoot) {
      const chosen = await vscode4.window.showOpenDialog({
        canSelectFiles: false,
        canSelectFolders: true,
        canSelectMany: false,
        openLabel: "Select Analysis Folder to Initialize"
      });
      if (chosen && chosen.length > 0) {
        this.workspaceRoot = chosen[0].fsPath;
        this.customWorkspaceRoot = this.workspaceRoot;
        this.tools.setWorkspaceRoot(this.workspaceRoot);
        this.literatureService.setWorkspaceRoot(this.workspaceRoot);
        this.agentService.setWorkspaceRoot(this.workspaceRoot);
        this.executionManager.setWorkspaceRoot(this.workspaceRoot);
        this.executionManager.initialize().catch(() => {
        });
        if (this.orchestrator) {
          await this.orchestrator.setWorkingDirectory(this.workspaceRoot);
        }
        if (this.onFolderChangedCallback) {
          this.onFolderChangedCallback(this.workspaceRoot);
        }
        await this.syncActiveModelSummary();
      } else {
        vscode4.window.showErrorMessage("TidyProteomicsAgent: Please open or select a workspace folder first.");
        return false;
      }
    }
    try {
      const candidatePaths = [
        path11.join(this._extensionUri.fsPath, "templates"),
        path11.join(this._extensionUri.fsPath, "extension", "templates"),
        path11.join(this.context.extensionPath, "templates"),
        path11.join(this.context.extensionPath, "extension", "templates"),
        path11.join(__dirname, "..", "templates"),
        path11.join(__dirname, "..", "..", "templates"),
        path11.join(__dirname, "templates"),
        path11.join(this.workspaceRoot, "extension", "templates"),
        path11.join(this.workspaceRoot, "templates")
      ];
      const templateBase = candidatePaths.find((p) => fs11.existsSync(p));
      if (!templateBase) {
        vscode4.window.showErrorMessage(
          "TidyProteomicsAgent: Template directory not found in extension or workspace."
        );
        return false;
      }
      const standardDirs = ["analysis", "agent", "code", "data", path11.join("data", "raw"), "docs", "logs", "tools"];
      for (const d of standardDirs) {
        const fullDir = path11.join(this.workspaceRoot, d);
        if (!fs11.existsSync(fullDir)) {
          fs11.mkdirSync(fullDir, { recursive: true });
        }
      }
      const copyFileSafe = (src, dest, overwrite = false) => {
        if (fs11.existsSync(src)) {
          if (overwrite || !fs11.existsSync(dest)) {
            fs11.mkdirSync(path11.dirname(dest), { recursive: true });
            fs11.copyFileSync(src, dest);
          }
        }
      };
      const sharedDir = path11.join(templateBase, "shared");
      if (fs11.existsSync(sharedDir)) {
        copyFileSafe(path11.join(sharedDir, "tools", "lint_tidyproteomics.R"), path11.join(this.workspaceRoot, "tools", "lint_tidyproteomics.R"), true);
        copyFileSafe(path11.join(sharedDir, "tools", "reactome_pathways.tsv"), path11.join(this.workspaceRoot, "tools", "reactome_pathways.tsv"), true);
        const agentTemplatesDir = path11.join(sharedDir, "agent");
        if (fs11.existsSync(agentTemplatesDir)) {
          const aFiles = fs11.readdirSync(agentTemplatesDir);
          for (const af of aFiles) {
            if (af.endsWith(".md")) {
              copyFileSafe(path11.join(agentTemplatesDir, af), path11.join(this.workspaceRoot, "agent", af), true);
            }
          }
        }
        copyFileSafe(path11.join(sharedDir, "docs", "experiment.md"), path11.join(this.workspaceRoot, "docs", "experiment.md"), false);
        copyFileSafe(path11.join(sharedDir, "docs", "notes.md"), path11.join(this.workspaceRoot, "docs", "notes.md"), false);
        copyFileSafe(path11.join(sharedDir, "docs", "concept.md"), path11.join(this.workspaceRoot, "docs", "concept.md"), false);
        copyFileSafe(path11.join(sharedDir, ".gitignore"), path11.join(this.workspaceRoot, ".gitignore"), false);
        copyFileSafe(path11.join(sharedDir, "logs", ".gitkeep"), path11.join(this.workspaceRoot, "logs", ".gitkeep"), false);
        copyFileSafe(path11.join(sharedDir, "data", "raw", ".gitkeep"), path11.join(this.workspaceRoot, "data", "raw", ".gitkeep"), false);
        const literatureToolsDir = path11.join(sharedDir, "tools", "literature");
        if (fs11.existsSync(literatureToolsDir)) {
          const lFiles = fs11.readdirSync(literatureToolsDir).filter((f) => f.endsWith(".R"));
          for (const lf of lFiles) {
            copyFileSafe(path11.join(literatureToolsDir, lf), path11.join(this.workspaceRoot, "tools", "literature", lf), true);
          }
        }
        const literatureDir = path11.join(this.workspaceRoot, "literature");
        if (!fs11.existsSync(literatureDir)) {
          fs11.mkdirSync(literatureDir, { recursive: true });
        }
      }
      let pipelineDir = path11.join(templateBase, "pipelines", pipelineId);
      if (!fs11.existsSync(pipelineDir)) {
        pipelineDir = path11.join(templateBase, "pipelines", "differential_expression");
      }
      if (fs11.existsSync(pipelineDir)) {
        const pFiles = fs11.readdirSync(pipelineDir).filter((f) => f.endsWith(".md"));
        for (const pf of pFiles) {
          copyFileSafe(path11.join(pipelineDir, pf), path11.join(this.workspaceRoot, "analysis", pf), true);
        }
      } else {
        vscode4.window.showWarningMessage(`TidyProteomicsAgent: Pipeline templates not found in ${templateBase}/pipelines.`);
      }
      await this.syncActiveModelSummary();
      await this.refreshPhases();
      const state = await this.orchestrator?.getState();
      if (state)
        this.sendStateUpdate(state);
      const pipelineDisplayName = pipelineId === "quality_control_only" ? "Quality Control & Exploration" : "Standard Differential Expression";
      vscode4.window.showInformationMessage(`TidyProteomicsAgent: Workspace initialized with ${pipelineDisplayName} pipeline!`);
      const targetFocusFile = path11.join(this.workspaceRoot, "docs", "experiment.md");
      if (fs11.existsSync(targetFocusFile)) {
        try {
          const doc = await vscode4.workspace.openTextDocument(targetFocusFile);
          await vscode4.window.showTextDocument(doc);
        } catch (_) {
        }
      }
      return true;
    } catch (err) {
      vscode4.window.showErrorMessage(`TidyProteomicsAgent: Failed to initialize workspace - ${err.message}`);
      return false;
    }
  }
  startPipeline() {
    if (!this.workspaceRoot) {
      vscode4.window.showErrorMessage("TidyProteomicsAgent: Please open a workspace folder in VS Code first.");
      return;
    }
    if (this.orchestrator && this.orchestrator.getPhases().length === 0) {
      vscode4.window.showInformationMessage("TidyProteomicsAgent: No analysis tasks found to execute. Please initialize an analysis pipeline first.");
      return;
    }
    this.syncActiveModelSummary().catch(() => {
    });
    this.orchestrator?.runFullPipeline().catch((err) => {
      vscode4.window.showErrorMessage(`TidyProteomicsAgent: Pipeline error - ${err.message}`);
    });
  }
  async runSelectedPhase() {
    if (!this.workspaceRoot) {
      vscode4.window.showErrorMessage("TidyProteomicsAgent: Please open a workspace folder in VS Code first.");
      return;
    }
    const cfg = this.client.getConfig();
    if (cfg.provider !== "ollama" && !cfg.apiKey) {
      vscode4.window.showErrorMessage("TidyProteomicsAgent: Please enter an API key first.");
      return;
    }
    await this.syncActiveModelSummary();
    if (!this.orchestrator)
      return;
    const phases = this.orchestrator.getPhases();
    if (phases.length === 0) {
      vscode4.window.showInformationMessage("TidyProteomicsAgent: No phases found to run.");
      return;
    }
    const current = phases.find((p) => p.status === "running") || phases.find((p) => p.status === "pending" && p.enabled !== false) || phases[0];
    const items = phases.map((p) => ({
      label: p.title,
      description: `(${p.fileName}) - ${p.status.toUpperCase()}`,
      phaseId: p.id,
      picked: p.id === current?.id
    }));
    const chosen = await vscode4.window.showQuickPick(items, {
      placeHolder: "Select phase to run in isolation"
    });
    if (chosen) {
      this.orchestrator.runSinglePhase(chosen.phaseId).catch((err) => {
        vscode4.window.showErrorMessage(`TidyProteomicsAgent: Error running phase - ${err.message}`);
      });
    }
  }
  sendStateUpdate(state) {
    if (this._view && this._view.webview) {
      try {
        const p = this._view.webview.postMessage({ type: "stateUpdate", state });
        if (p && typeof p.then === "function") {
          p.then(void 0, (err) => {
            console.warn("[SidebarViewProvider] Failed to post stateUpdate:", err);
          });
        }
      } catch (err) {
        console.warn("[SidebarViewProvider] Exception posting stateUpdate:", err);
      }
    }
    if (state && Array.isArray(state.phases)) {
      let allCompleted = state.phases.length > 0;
      for (const phase of state.phases) {
        if (phase.enabled && phase.status !== "completed") {
          allCompleted = false;
        }
        const prevStatus = this.previousPhaseStatuses.get(phase.id);
        const currentStatus = phase.status;
        if (prevStatus !== "running" && currentStatus === "running") {
          this.agentService.handlePhaseStarted(phase);
        } else if (prevStatus === "running" && currentStatus === "completed") {
          this.agentService.handlePhaseCompleted(phase).catch(() => {
          });
        } else if (currentStatus === "failed") {
          this.agentService.handlePhaseHalted(phase).catch(() => {
          });
        }
        this.previousPhaseStatuses.set(phase.id, currentStatus);
      }
      if (allCompleted && state.isRunning === false) {
        this.agentService.handlePipelineFinished(state);
      }
    }
    this.sendDesignerState().catch(() => {
    });
  }
  async scanArtifacts() {
    return [];
  }
  /**
   * Broadcasts current study design and discovered sample groups to the webview designer.
   */
  async sendDesignerState() {
    if (!this._view || !this._view.webview || !this.workspaceRoot)
      return;
    try {
      const expManager = this.agentService.getExperimentManager();
      const spec = await expManager.readSpec();
      this._view.webview.postMessage({
        type: "designerState",
        spec: {
          discoveredGroups: spec.discoveredGroups || [],
          rawSampleGroups: spec.rawSampleGroups || [],
          targetContrasts: spec.targetContrasts || [],
          contrastConfirmed: spec.contrastConfirmed,
          batchConfoundingAuthorized: spec.batchConfoundingAuthorized
        }
      });
    } catch (_) {
    }
  }
  syncLiteratureWorkspace() {
    const root = this.getActiveWorkspaceRoot();
    if (root && root !== this.workspaceRoot) {
      this.workspaceRoot = root;
      this.tools.setWorkspaceRoot(root);
      this.literatureService.setWorkspaceRoot(root);
      this.agentService.setWorkspaceRoot(root);
    } else if (root) {
      this.literatureService.setWorkspaceRoot(root);
      this.agentService.setWorkspaceRoot(root);
    }
    return this.workspaceRoot;
  }
  sendLiteratureState() {
    if (this._view && this._view.webview) {
      try {
        this.syncLiteratureWorkspace();
        const state = this.literatureService.getViewState(this.ingestionRunner.getIsRunning() ? "ingesting" : void 0);
        const p1 = this._view.webview.postMessage({ type: "literatureState", state });
        if (p1 && typeof p1.then === "function") {
          p1.then(void 0, (err) => {
            console.warn("[SidebarViewProvider] Failed to post literatureState:", err);
          });
        }
        const p2 = this._view.webview.postMessage({ type: "corpusState", state });
        if (p2 && typeof p2.then === "function") {
          p2.then(void 0, (err) => {
            console.warn("[SidebarViewProvider] Failed to post corpusState:", err);
          });
        }
      } catch (err) {
        console.warn("[SidebarViewProvider] Exception posting literatureState:", err);
      }
    }
  }
  sendCorpusState() {
    this.sendLiteratureState();
  }
  sendLiteratureProgress(event) {
    if (this._view && this._view.webview) {
      try {
        this._view.webview.postMessage({ type: "literatureProgress", event });
        this._view.webview.postMessage({ type: "corpusProgress", event });
      } catch (err) {
        console.warn("[SidebarViewProvider] Exception posting literatureProgress:", err);
      }
    }
  }
  sendCorpusProgress(event) {
    this.sendLiteratureProgress(event);
  }
  sendLog(text, updateLast = false) {
    if (this._view && this._view.webview) {
      try {
        const p = this._view.webview.postMessage({ type: "log", text, updateLast });
        if (p && typeof p.then === "function") {
          p.then(void 0, (err) => {
            console.warn("[SidebarViewProvider] Failed to post log:", err);
          });
        }
      } catch (err) {
        console.warn("[SidebarViewProvider] Exception posting log:", err);
      }
    }
  }
  escapeAttr(str) {
    return String(str || "").replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/'/g, "&#39;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
  _cachedIcons;
  _loadIcons() {
    const icons = {};
    const mediaDir = path11.join(this._extensionUri.fsPath, "media");
    try {
      if (fs11.existsSync(mediaDir)) {
        const files = fs11.readdirSync(mediaDir);
        for (const file of files) {
          if (file.endsWith(".svg")) {
            const key = file.replace(".svg", "");
            let content = fs11.readFileSync(path11.join(mediaDir, file), "utf-8");
            content = content.replace(/<\?xml[^>]*\?>/g, "").trim();
            content = content.replace(/\s(width|height)="[^"]*"/g, "");
            if (key === "robot") {
              content = content.replace("<svg ", `<svg class="svg-icon svg-icon-${key}" `);
            } else {
              content = content.replace("<svg ", `<svg class="svg-icon svg-icon-${key}" fill="currentColor" `);
            }
            icons[key] = content;
          }
        }
      }
    } catch (err) {
      console.error("[SidebarViewProvider] Error loading SVG icons:", err);
    }
    return icons;
  }
  _getIcons() {
    if (!this._cachedIcons) {
      this._cachedIcons = this._loadIcons();
    }
    return this._cachedIcons;
  }
  _getHtmlForWebview(_webview) {
    const config = this.client.getConfig();
    const icons = this._getIcons();
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; font-src data:; img-src https: data:;">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>TidyProteomicsAgent</title>
  <style>
    :root {
      --bg: var(--vscode-sideBar-background, #18181b);
      --fg: var(--vscode-sideBar-foreground, #e4e4e7);
      --card-bg: var(--vscode-editor-background, #27272a);
      --border: var(--vscode-widget-border, rgba(127, 127, 127, 0.25));
      --primary: var(--vscode-button-background, #3b82f6);
      --primary-hover: var(--vscode-button-hoverBackground, #2563eb);
      --success: #10b981;
      --warning: #f59e0b;
      --error: var(--vscode-errorForeground, #ef4444);
      --cached: #8b5cf6;
      --muted: var(--vscode-descriptionForeground, #a1a1aa);
      --terminal-bg: var(--vscode-terminal-background, #09090b);
      --terminal-fg: var(--vscode-terminal-foreground, #22c55e);
    }
    *, *::before, *::after {
      box-sizing: border-box;
    }
    html {
      height: 100%;
    }
    body {
      font-family: var(--vscode-font-family, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif);
      font-size: 12px;
      color: var(--fg);
      background-color: var(--bg);
      padding: 10px;
      line-height: 1.4;
      display: flex;
      flex-direction: column;
      height: 100%;
      min-height: 100%;
      overflow-x: hidden;
      overflow-y: auto;
    }
    h2, h3, h4 { font-weight: 600; margin-bottom: 4px; }
    
    /* Top Header Bar */
    .header {
      display: flex;
      flex-direction: column;
      gap: 7px;
      border-bottom: 1px solid var(--border);
      padding-bottom: 9px;
      margin-bottom: 10px;
      flex: 0 0 auto;
    }
    .header-top-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      min-height: 26px;
    }
    .header-left {
      display: flex;
      align-items: center;
      min-width: 0;
      flex: 1 1 auto;
    }
    .header-left h2 {
      margin: 0;
      font-size: 13px;
      font-weight: 700;
      line-height: 26px;
      height: 26px;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .header-actions {
      display: flex;
      align-items: center;
      gap: 6px;
      flex: 0 0 auto;
    }

    /* Header Run/Stop Button */
    .header-run-stop-btn {
      height: 26px;
      box-sizing: border-box;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 5px;
      padding: 0 9px;
      font-size: 11px;
      font-weight: 700;
      border-radius: 4px;
      line-height: 1;
      cursor: pointer;
      border: 1px solid rgba(255, 255, 255, 0.12);
      transition: all 0.15s ease;
      white-space: nowrap;
      user-select: none;
    }
    .header-btn-run {
      background: #059669;
      color: #ffffff;
    }
    .header-btn-run:hover:not(:disabled) {
      background: #10b981;
      box-shadow: 0 2px 6px rgba(16, 185, 129, 0.35);
    }
    .header-btn-stop {
      background: #dc2626;
      color: #ffffff;
    }
    .header-btn-stop:hover:not(:disabled) {
      background: #ef4444;
      box-shadow: 0 2px 6px rgba(239, 68, 68, 0.35);
    }
    .header-run-stop-btn:active:not(:disabled) {
      transform: translateY(1px);
    }
    .header-run-stop-btn:disabled {
      opacity: 0.45;
      cursor: not-allowed;
      box-shadow: none;
      transform: none;
    }
    .header-run-stop-btn .btn-icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }
    .header-run-stop-btn .btn-icon .svg-icon {
      width: 10px;
      height: 10px;
      vertical-align: middle;
      fill: currentColor;
    }

    /* Header Status Badge */
    .header-status-badge {
      height: 26px !important;
      box-sizing: border-box;
      display: inline-flex !important;
      align-items: center;
      justify-content: center;
      padding: 0 8px;
      font-size: 9.5px;
      font-weight: 700;
      letter-spacing: 0.5px;
      border-radius: 4px;
      line-height: 1;
      white-space: nowrap;
      user-select: none;
    }

    /* Flexible Segmented Progress Bar */
    .pipeline-progress-container {
      width: 100%;
      box-sizing: border-box;
    }
    .progress-bar-track {
      width: 100%;
      height: 7px;
      display: flex;
      align-items: stretch;
      gap: 3px;
      background: rgba(255, 255, 255, 0.04);
      padding: 1px;
      border-radius: 4px;
      box-sizing: border-box;
      transition: all 0.2s ease;
    }
    .progress-bar-track:empty {
      display: none;
    }
    .progress-segment {
      flex: 1 1 0;
      min-width: 2px;
      height: 100%;
      border-radius: 2px;
      transition: background-color 0.2s ease, opacity 0.2s ease, transform 0.15s ease;
      cursor: pointer;
      position: relative;
    }
    .progress-segment:hover {
      transform: scaleY(1.4);
      filter: brightness(1.25);
      z-index: 2;
    }

    /* Progress Segment States */
    /* 1. Filled Grey for not yet run */
    .progress-segment.segment-pending,
    .progress-segment.segment-queued {
      background: #52525b;
      opacity: 0.85;
    }
    /* 2. Green for completed */
    .progress-segment.segment-completed {
      background: #10b981;
      box-shadow: 0 0 3px rgba(16, 185, 129, 0.4);
    }
    /* 3. Animated Blue for running */
    .progress-segment.segment-running {
      background: linear-gradient(90deg, #2563eb 0%, #60a5fa 50%, #2563eb 100%);
      background-size: 200% 100%;
      animation: progressShimmer 1.5s linear infinite;
      box-shadow: 0 0 6px rgba(59, 130, 246, 0.7);
    }
    @keyframes progressShimmer {
      0% { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }
    /* 4. Red for error */
    .progress-segment.segment-failed,
    .progress-segment.segment-error {
      background: #ef4444;
      box-shadow: 0 0 4px rgba(239, 68, 68, 0.5);
    }
    /* 5. Orange for warning or needs user attention */
    .progress-segment.segment-warning,
    .progress-segment.segment-attention {
      background: #f59e0b;
      box-shadow: 0 0 4px rgba(245, 158, 11, 0.5);
    }

    /* Badges */
    .badge {
      display: inline-block;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 9px;
      text-transform: uppercase;
      font-weight: 700;
      letter-spacing: 0.5px;
    }
    .badge-pending { background: #52525b; color: #fff; }
    .badge-queued { background: #6366f1; color: #fff; }
    .badge-running { background: var(--primary); color: #fff; animation: pulse 1.5s infinite; }
    .badge-completed { background: var(--success); color: #fff; }
    .badge-failed { background: var(--error); color: #fff; }
    .badge-cached { background: var(--cached); color: #fff; }
    .badge-warning { background: var(--warning, #f59e0b); color: #fff; }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }

    /* Segmented Tab Bar */
    .tab-bar {
      display: grid;
      grid-template-columns: repeat(6, minmax(0, 1fr));
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 6px;
      padding: 3px;
      margin-bottom: 12px;
      gap: 2px;
      flex: 0 0 auto;
    }

    .badge-parsing_pdf { background: #3b82f6; color: #fff; animation: pulse 1.5s infinite; }
    .badge-llm_extraction { background: #8b5cf6; color: #fff; animation: pulse 1.5s infinite; }
    .badge-normalization { background: #f59e0b; color: #fff; animation: pulse 1.5s infinite; }
    .badge-indexed { background: var(--success); color: #fff; }
    .badge-skipped { background: #71717a; color: #fff; }

    /* Corpus Tab Styles */
    .metric-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 6px;
      margin-top: 6px;
      margin-bottom: 8px;
    }
    .metric-card {
      background: var(--bg);
      border: 1px solid var(--border);
      border-radius: 4px;
      padding: 6px 4px;
      text-align: center;
    }
    .metric-num {
      font-size: 15px;
      font-weight: 700;
      color: var(--primary);
      font-variant-numeric: tabular-nums;
    }
    .metric-label {
      font-size: 8.5px;
      text-transform: uppercase;
      letter-spacing: 0.3px;
      color: var(--muted);
      margin-top: 2px;
    }
    .toggle-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      padding: 6px 8px;
      background: var(--bg);
      border: 1px solid var(--border);
      border-radius: 4px;
      margin-top: 6px;
    }
    .toggle-label {
      font-size: 10.5px;
      font-weight: 600;
      color: var(--fg);
    }
    .toggle-desc {
      font-size: 9px;
      color: var(--muted);
    }
    .queue-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 6px;
      padding: 5px 8px;
      background: var(--bg);
      border: 1px solid var(--border);
      border-radius: 4px;
      margin-bottom: 4px;
      font-size: 10.5px;
    }
    .queue-item-left {
      min-width: 0;
      flex: 1 1 auto;
    }
    .queue-item-title {
      font-weight: 600;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      font-family: var(--vscode-editor-font-family, monospace);
    }
    .queue-item-sub {
      font-size: 9px;
      color: var(--muted);
    }
    .search-result-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 10px;
      margin-top: 6px;
    }
    .search-result-table th, .search-result-table td {
      border: 1px solid var(--border);
      padding: 4px 6px;
      text-align: left;
      vertical-align: top;
    }
    .search-result-table th {
      background: rgba(127, 127, 127, 0.08);
      font-size: 9px;
      text-transform: uppercase;
      color: var(--muted);
    }
    .quote-box {
      font-style: italic;
      color: #bfdbfe;
      font-size: 9px;
      margin-top: 2px;
      line-height: 1.3;
    }
    #corpusSynthesisToggle:checked + #corpusSynthesisSlider,
    #literatureSynthesisToggle:checked + #literatureSynthesisSlider {
      background: var(--primary) !important;
    }
    #corpusSynthesisSlider,
    #literatureSynthesisSlider {
      position: absolute;
      cursor: pointer;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: var(--vscode-input-border, #444);
      border-radius: 18px;
      transition: .2s;
    }
    #corpusSynthesisSlider:before,
    #literatureSynthesisSlider:before {
      position: absolute;
      content: "";
      height: 12px;
      width: 12px;
      left: 3px;
      bottom: 3px;
      background-color: white;
      border-radius: 50%;
      transition: .2s;
    }
    #corpusSynthesisToggle:checked + #corpusSynthesisSlider:before,
    #literatureSynthesisToggle:checked + #literatureSynthesisSlider:before {
      transform: translateX(16px);
    }
    .tab-bar button.tab-btn {
      background: transparent !important;
      color: var(--muted) !important;
      border: none !important;
      border-radius: 4px !important;
      padding: 6px 2px !important;
      cursor: pointer;
      display: flex !important;
      flex-direction: column !important;
      align-items: center !important;
      justify-content: center !important;
      gap: 2px !important;
      transition: all 0.15s ease;
      position: relative;
      width: 100% !important;
      box-shadow: none !important;
      font-weight: normal !important;
    }
    .tab-bar button.tab-btn:hover {
      color: var(--fg) !important;
      background: rgba(255, 255, 255, 0.08) !important;
    }
    .tab-bar button.tab-btn.active {
      color: #ffffff !important;
      background: var(--primary) !important;
      font-weight: 600 !important;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3) !important;
    }
    .tab-icon {
      font-size: 13px;
      line-height: 1;
      pointer-events: none;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }
    .tab-label {
      font-size: 9px;
      text-transform: uppercase;
      letter-spacing: 0.3px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      pointer-events: none;
    }
    .tab-indicator {
      position: absolute;
      top: 3px;
      right: 4px;
      width: 6px;
      height: 6px;
      border-radius: 50%;
      display: none;
      pointer-events: none;
    }
    .tab-indicator.running {
      display: block;
      background: var(--success);
      animation: pulse 1.5s infinite;
    }
    .tab-indicator.alert {
      display: block;
      background: var(--warning);
    }

    /* Tab Panes */
    .tab-pane {
      display: none;
      animation: fadeIn 0.15s ease;
    }
    .tab-pane.active {
      display: block !important;
    }
    #pane-pipeline.active,
    #pane-literature.active,
    #pane-chat.active {
      display: flex !important;
      flex-direction: column;
      flex: 1 1 auto;
      min-height: 0;
    }

    .contrast-designer-card {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 6px;
      padding: 10px;
      margin: 6px 0;
    }
    #activePipelineDashboard {
      display: flex;
      flex-direction: column;
      flex: 1 1 auto;
      min-height: 0;
    }
    #activePipelineDashboard[style*="display: block"],
    #activePipelineDashboard[style*="display: flex"] {
      display: flex !important;
      flex-direction: column;
      flex: 1 1 auto;
      min-height: 0;
    }

    /* Modern Agent Chat Styles */
    .agent-container, .advisor-container {
      display: flex;
      flex-direction: column;
      flex: 1 1 auto;
      height: 100%;
      min-height: 0;
      gap: 8px;
    }
    .agent-header, .advisor-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 7px 10px;
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 6px;
      flex-shrink: 0;
    }
    .agent-status-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: var(--success, #10b981);
      display: inline-block;
      transition: all 0.3s ease;
    }
    .agent-status-dot.active {
      background: var(--primary, #3b82f6);
      box-shadow: 0 0 8px rgba(59, 130, 246, 0.7);
      animation: pulseDot 1.4s infinite ease-in-out;
    }
    @keyframes pulseDot {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.45; transform: scale(1.3); }
    }
    .btn-subtle {
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid var(--border);
      color: var(--fg);
      font-size: 10px;
      border-radius: 4px;
      padding: 2px 7px;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .btn-subtle:hover, .btn-subtle.active {
      background: rgba(59, 130, 246, 0.15);
      border-color: var(--primary);
      color: var(--primary);
    }
    .contrast-designer-card.collapsed {
      display: none !important;
    }
    .agent-suggestions, .advisor-suggestions {
      display: flex;
      gap: 5px;
      overflow-x: auto;
      padding: 2px 0;
      flex-shrink: 0;
      scrollbar-width: none;
    }
    .agent-suggestions::-webkit-scrollbar, .advisor-suggestions::-webkit-scrollbar {
      display: none;
    }
    .agent-chip, .advisor-chip {
      background: rgba(59, 130, 246, 0.08);
      color: #93c5fd;
      border: 1px solid rgba(59, 130, 246, 0.25);
      border-radius: 12px;
      padding: 4px 9px;
      font-size: 10px;
      font-weight: 500;
      white-space: nowrap;
      cursor: pointer;
      transition: all 0.15s ease;
      flex-shrink: 0;
    }
    .agent-chip:hover, .advisor-chip:hover {
      background: var(--primary);
      color: #fff;
      border-color: var(--primary);
      transform: translateY(-1px);
    }
    .agent-thread, .advisor-thread {
      flex: 1 1 auto;
      min-height: 140px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 9px;
      padding: 4px 2px;
      margin-bottom: 4px;
    }
    .agent-msg, .advisor-msg {
      display: flex;
      gap: 7px;
      max-width: 100%;
      animation: fadeInMsg 0.2s ease-out;
    }
    @keyframes fadeInMsg {
      from { opacity: 0; transform: translateY(4px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .agent-msg.user, .advisor-msg.user {
      flex-direction: row-reverse;
    }
    .agent-avatar, .advisor-avatar {
      width: 24px;
      height: 24px;
      border-radius: 50%;
      background: rgba(59, 130, 246, 0.2);
      color: #60a5fa;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      flex-shrink: 0;
      margin-top: 2px;
    }
    .agent-avatar .svg-icon, .advisor-avatar .svg-icon {
      width: 14px;
      height: 14px;
    }
    .agent-msg.user .agent-avatar, .advisor-msg.user .advisor-avatar {
      background: rgba(16, 185, 129, 0.2);
      color: #34d399;
    }
    .agent-bubble, .advisor-bubble {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 9px 12px;
      font-size: 11px;
      line-height: 1.5;
      color: var(--fg);
      max-width: 92%;
      word-break: break-word;
      overflow-wrap: break-word;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
    }
    .agent-msg.user .agent-bubble, .advisor-msg.user .advisor-bubble {
      background: rgba(59, 130, 246, 0.18);
      border-color: rgba(59, 130, 246, 0.4);
      color: #e0f2fe;
    }
    /* Dynamic Live Activity Card */
    .agent-msg.activity .agent-bubble {
      background: rgba(59, 130, 246, 0.08);
      border: 1px solid rgba(59, 130, 246, 0.35);
      box-shadow: 0 2px 10px rgba(59, 130, 246, 0.06);
    }
    .activity-spinner {
      width: 12px;
      height: 12px;
      border: 2px solid rgba(59, 130, 246, 0.25);
      border-top-color: var(--primary, #3b82f6);
      border-radius: 50%;
      animation: agentSpin 0.75s linear infinite;
      display: inline-block;
    }
    @keyframes agentSpin {
      to { transform: rotate(360deg); }
    }
    .activity-badge {
      font-size: 8.5px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.4px;
      padding: 1px 5px;
      border-radius: 6px;
      background: rgba(59, 130, 246, 0.2);
      color: #93c5fd;
    }
    /* Scientific Observation Card */
    .agent-msg.observation .agent-bubble {
      background: linear-gradient(145deg, rgba(139, 92, 246, 0.1) 0%, rgba(59, 130, 246, 0.05) 100%);
      border: 1px solid rgba(139, 92, 246, 0.4);
      box-shadow: 0 3px 12px rgba(139, 92, 246, 0.08);
    }
    .agent-msg.observation .agent-avatar {
      background: rgba(139, 92, 246, 0.25);
      color: #c084fc;
    }
    .obs-badge {
      font-size: 8.5px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.4px;
      padding: 1px 6px;
      border-radius: 8px;
      background: rgba(139, 92, 246, 0.25);
      color: #d8b4fe;
    }
    /* Phase Milestone Card */
    .agent-msg.milestone .agent-bubble {
      background: rgba(16, 185, 129, 0.08);
      border: 1px solid rgba(16, 185, 129, 0.35);
    }
    .agent-msg.milestone .agent-avatar {
      background: rgba(16, 185, 129, 0.25);
      color: #34d399;
    }
    .agent-msg-title, .advisor-msg-title {
      font-size: 9.5px;
      font-weight: 700;
      color: var(--primary);
      margin-bottom: 5px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .agent-msg.user .agent-msg-title, .advisor-msg.user .advisor-msg-title {
      color: #60a5fa;
    }
    .agent-msg-body code, .advisor-msg-body code {
      font-family: var(--vscode-editor-font-family, monospace);
      font-size: 10px;
      background: rgba(0, 0, 0, 0.35);
      padding: 1px 4px;
      border-radius: 3px;
      border: 1px solid rgba(255, 255, 255, 0.08);
    }
    .agent-msg-body pre, .advisor-msg-body pre {
      background: rgba(0, 0, 0, 0.45);
      border: 1px solid var(--border);
      border-radius: 4px;
      padding: 6px 8px;
      overflow-x: auto;
      margin: 6px 0;
    }
    .agent-msg-body pre code, .advisor-msg-body pre code {
      background: transparent;
      padding: 0;
      border: none;
      font-size: 10px;
    }
    .agent-msg-body ul, .agent-msg-body ol, .advisor-msg-body ul, .advisor-msg-body ol {
      margin: 4px 0 6px 16px;
      padding: 0;
    }
    .agent-msg-body li, .advisor-msg-body li {
      margin-bottom: 2px;
    }
    .agent-msg-chips, .advisor-msg-chips {
      display: flex;
      flex-wrap: wrap;
      gap: 5px;
      margin-top: 8px;
    }
    .agent-msg-chip, .advisor-msg-chip {
      background: var(--input-bg, #252526);
      color: var(--primary, #3b82f6);
      border: 1px solid rgba(59, 130, 246, 0.4);
      border-radius: 12px;
      padding: 3px 9px;
      font-size: 10px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.15s ease;
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }
    .agent-msg-chip:hover, .advisor-msg-chip:hover {
      background: rgba(59, 130, 246, 0.2);
      border-color: var(--primary, #3b82f6);
      transform: translateY(-1px);
    }
    .agent-input-area, .advisor-input-area {
      flex-shrink: 0;
      display: flex;
      flex-direction: column;
      gap: 3px;
    }
    .agent-input-wrapper, .advisor-input-wrapper {
      background: var(--input-bg);
      border: 1px solid var(--input-border);
      border-radius: 6px;
      padding: 6px 8px;
      display: flex;
      flex-direction: column;
      gap: 6px;
      transition: border-color 0.15s ease;
    }
    .agent-input-wrapper:focus-within, .advisor-input-wrapper:focus-within {
      border-color: var(--input-focus);
    }
    #agentInput, #advisorInput {
      width: 100%;
      background: transparent;
      border: none;
      color: var(--input-fg);
      font-family: var(--vscode-font-family, inherit);
      font-size: 11px;
      line-height: 1.4;
      resize: none;
      min-height: 38px;
      max-height: 120px;
      outline: none;
      box-sizing: border-box;
      padding: 0;
    }
    .agent-input-controls, .advisor-input-controls {
      display: flex;
      justify-content: flex-end;
      align-items: center;
      gap: 6px;
    }
    .agent-input-hint, .advisor-input-hint {
      font-size: 8.5px;
      color: var(--muted);
      text-align: right;
      padding-right: 2px;
    }
    .agent-streaming-cursor, .advisor-streaming-cursor {
      display: inline-block;
      width: 6px;
      height: 11px;
      background: var(--primary);
      margin-left: 2px;
      animation: pulse 1s infinite;
      vertical-align: middle;
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(2px); }
      to { opacity: 1; transform: translateY(0); }
    }

    /* Containers & Cards */
    .section, .card {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 6px;
      padding: 8px 10px;
      margin-bottom: 10px;
      flex: 0 0 auto;
    }
    .terminal-section,
    .queue-section {
      display: flex !important;
      flex-direction: column;
      flex: 1 1 auto;
      min-height: 150px;
      margin-bottom: 0 !important;
    }
    .terminal-section .section-header,
    .queue-section .section-header {
      flex: 0 0 auto;
    }
    .terminal-section .terminal {
      flex: 1 1 0;
      min-height: 110px;
      height: auto;
    }
    .queue-section .queue-list,
    #literatureQueueList {
      flex: 1 1 0;
      min-height: 80px;
      overflow-y: auto;
      margin-bottom: 8px;
    }
    .section-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 6px;
    }
    .section-desc {
      font-size: 10px;
      color: var(--muted);
      margin-bottom: 8px;
    }

    .form-group {
      margin-bottom: 8px;
    }
    label {
      display: block;
      font-size: 10px;
      margin-bottom: 3px;
      color: var(--muted);
      text-transform: uppercase;
      font-weight: 600;
    }
    input, select {
      width: 100%;
      background: var(--bg);
      border: 1px solid var(--border);
      color: var(--fg);
      padding: 6px 8px;
      border-radius: 4px;
      font-size: 11px;
      outline: none;
    }
    input:focus, select:focus {
      border-color: var(--primary);
    }

    /* Buttons */
    button {
      background: var(--primary);
      color: #fff;
      border: none;
      border-radius: 4px;
      padding: 6px 10px;
      font-size: 11px;
      font-weight: 500;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 4px;
      transition: background 0.15s;
    }
    button:hover { background: var(--primary-hover); }
    button.btn-stop { background: var(--error); }
    button.btn-stop:hover { background: #dc2626; }
    button.btn-secondary {
      background: #3f3f46;
      color: #fff;
    }
    button.btn-secondary:hover {
      background: #52525b;
    }
    button.btn-sm {
      padding: 3px 8px;
      font-size: 10px;
      background: #3f3f46;
    }
    button.btn-sm:hover {
      background: #52525b;
    }
    button.btn-icon {
      background: transparent;
      border: 1px solid var(--border);
      color: var(--muted);
      border-radius: 4px;
      padding: 1px 6px;
      font-size: 12px;
      line-height: 14px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s ease;
    }
    button.btn-icon:hover {
      color: var(--fg);
      border-color: var(--primary);
      background: rgba(59, 130, 246, 0.15);
    }

    /* Analysis Task Cards */
    .task-card {
      background: var(--bg);
      border: 1px solid var(--border);
      border-radius: 5px;
      padding: 6px 8px;
      margin-bottom: 5px;
      display: flex;
      flex-direction: column;
      align-items: stretch;
      gap: 5px;
      transition: border-color 0.15s ease, background 0.15s ease;
    }
    .task-card:hover {
      border-color: rgba(59, 130, 246, 0.4);
      background: rgba(255, 255, 255, 0.02);
    }
    .task-card.running {
      border-color: var(--primary);
      background: rgba(59, 130, 246, 0.08);
      box-shadow: 0 0 8px rgba(59, 130, 246, 0.25);
    }
    .task-card.task-card-failed {
      border-color: rgba(239, 68, 68, 0.5);
      background: rgba(239, 68, 68, 0.04);
    }
    .task-main-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 6px;
      width: 100%;
    }
    .task-insight-box {
      background: rgba(239, 68, 68, 0.09);
      border: 1px solid rgba(239, 68, 68, 0.25);
      border-radius: 4px;
      padding: 5px 7px;
      font-size: 10px;
      line-height: 1.35;
    }
    .task-insight-header {
      display: flex;
      align-items: center;
      gap: 4px;
      font-weight: 700;
      color: #f87171;
      font-size: 9.5px;
      text-transform: uppercase;
      letter-spacing: 0.3px;
      margin-bottom: 3px;
    }
    .task-insight-icon {
      font-size: 11px;
    }
    .task-insight-title {
      font-weight: 700;
    }
    .task-insight-body {
      color: #fecaca;
      word-break: break-word;
      font-family: var(--vscode-font-family, sans-serif);
    }
    .task-insight-actions {
      display: flex;
      gap: 6px;
      margin-top: 5px;
      flex-wrap: wrap;
    }
    .btn-insight-link {
      background: rgba(239, 68, 68, 0.2) !important;
      color: #ffffff !important;
      border: 1px solid rgba(239, 68, 68, 0.45) !important;
      border-radius: 3px !important;
      padding: 2px 7px !important;
      font-size: 9.5px !important;
      font-weight: 600 !important;
      cursor: pointer;
      line-height: 1.3 !important;
      transition: all 0.15s ease;
    }
    .btn-insight-link:hover {
      background: rgba(239, 68, 68, 0.35) !important;
      border-color: rgba(239, 68, 68, 0.7) !important;
      color: #ffffff !important;
    }
    .btn-insight-action-primary {
      background: rgba(34, 197, 94, 0.25) !important;
      color: #ffffff !important;
      border: 1px solid rgba(34, 197, 94, 0.55) !important;
      border-radius: 3px !important;
      padding: 2px 7px !important;
      font-size: 9.5px !important;
      font-weight: 600 !important;
      cursor: pointer;
      line-height: 1.3 !important;
      transition: all 0.15s ease;
    }
    .btn-insight-action-primary:hover {
      background: rgba(34, 197, 94, 0.45) !important;
      border-color: rgba(34, 197, 94, 0.85) !important;
      color: #ffffff !important;
    }
    .task-left {
      display: flex;
      align-items: center;
      gap: 8px;
      min-width: 0;
      flex: 1 1 auto;
    }
    .task-left input[type="checkbox"] {
      width: 13px;
      height: 13px;
      cursor: pointer;
      accent-color: var(--primary);
      margin: 0;
      flex-shrink: 0;
    }
    .task-name {
      font-weight: 600;
      font-size: 11px;
      font-family: var(--vscode-editor-font-family, monospace);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      cursor: pointer;
      color: var(--fg);
      letter-spacing: 0.2px;
      min-width: 0;
      flex: 0 1 auto;
    }
    .task-name:hover {
      color: var(--primary);
      text-decoration: underline;
    }
    .task-action-icons {
      display: inline-flex;
      align-items: center;
      gap: 3px;
      flex-shrink: 0;
      margin: 0;
    }
    button.task-action-icon-btn {
      background: transparent;
      border: 1px solid transparent;
      color: var(--muted);
      border-radius: 3px;
      padding: 0;
      width: 18px;
      height: 18px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      transition: all 0.15s ease;
      line-height: 1;
      opacity: 0.65;
      flex-shrink: 0;
      box-sizing: border-box;
    }
    button.task-action-icon-btn.has-run {
      opacity: 0.95;
      color: var(--vscode-foreground, #d4d4d4);
    }
    button.task-action-icon-btn:hover {
      background: rgba(59, 130, 246, 0.15);
      border-color: rgba(59, 130, 246, 0.35);
      color: var(--vscode-foreground, var(--fg));
      opacity: 1;
    }
    button.task-action-icon-btn .svg-icon {
      width: 11px;
      height: 11px;
      vertical-align: middle;
      margin: 0;
      pointer-events: none;
    }
    .task-right {
      display: flex;
      align-items: center;
      gap: 6px;
      flex-shrink: 0;
    }
    .btn-run {
      background: rgba(59, 130, 246, 0.15);
      color: #93c5fd;
      border: 1px solid rgba(59, 130, 246, 0.35);
      border-radius: 3px;
      padding: 2px 7px;
      font-size: 9.5px;
      font-weight: 700;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 2px;
      line-height: 1.2;
      transition: all 0.15s ease;
    }
    .btn-run:hover:not(:disabled) {
      background: var(--primary);
      color: #ffffff;
      border-color: var(--primary);
    }
    .btn-run:disabled {
      opacity: 0.3;
      cursor: not-allowed;
      pointer-events: none;
      background: transparent;
      border-color: rgba(255, 255, 255, 0.1);
      color: var(--muted);
    }
    .task-duration {
      font-size: 9.5px;
      font-family: var(--vscode-editor-font-family, monospace);
      color: var(--muted);
      min-width: 32px;
      text-align: right;
      white-space: pre;
    }

    /* File Cards (Memory & Protocol) */
    .file-card {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 6px 8px;
      background: var(--bg);
      border: 1px solid var(--border);
      border-radius: 4px;
      margin-bottom: 5px;
      font-size: 11px;
      cursor: pointer;
      transition: border-color 0.15s ease, background 0.15s ease;
    }
    .file-card:hover {
      border-color: var(--primary);
      background: rgba(59, 130, 246, 0.08);
    }
    .file-title {
      font-weight: 600;
      font-size: 11px;
    }
    .file-path {
      font-size: 9px;
      color: var(--muted);
      font-family: monospace;
    }

    /* Folder Status Cards (Active Directory) */
    .folder-card {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 6px 8px;
      background: var(--bg);
      border: 1px solid var(--border);
      border-radius: 4px;
      margin-bottom: 5px;
      font-size: 11px;
    }
    .folder-name {
      font-weight: 600;
      font-size: 11px;
      color: #93c5fd;
      font-family: monospace;
    }
    .folder-desc {
      font-size: 9px;
      color: var(--muted);
    }

    /* Info Callout */
    .callout {
      background: rgba(59, 130, 246, 0.08);
      border: 1px solid rgba(59, 130, 246, 0.3);
      border-radius: 5px;
      padding: 8px;
      margin-top: 8px;
      font-size: 10px;
      line-height: 1.4;
      color: #bfdbfe;
    }
    .callout b {
      color: #ffffff;
    }

    /* Tokens Table */
    .tokens-table {
      width: 100%;
      table-layout: fixed;
      border-collapse: separate;
      border-spacing: 0;
      background: var(--bg);
      border: 1px solid var(--border);
      border-radius: 4px;
      overflow: hidden;
      margin-top: 4px;
    }
    .tokens-table th,
    .tokens-table td {
      text-align: center;
      padding: 5px 2px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .tokens-table th {
      font-size: 9px;
      text-transform: uppercase;
      font-weight: 600;
      letter-spacing: 0.4px;
      color: var(--muted);
      background: rgba(127, 127, 127, 0.08);
      border-bottom: 1px solid var(--border);
    }
    .tokens-table td {
      font-size: 13px;
      font-weight: 700;
      color: var(--primary);
      font-variant-numeric: tabular-nums;
      padding: 6px 2px;
    }
    .tokens-table th:not(:last-child),
    .tokens-table td:not(:last-child) {
      border-right: 1px solid var(--border);
    }

    /* Live Feed Terminal */
    .terminal {
      background: var(--terminal-bg);
      border: 1px solid var(--border);
      border-radius: 4px;
      padding: 6px 8px;
      overflow: auto;
      font-family: var(--vscode-editor-font-family, "SF Mono", Monaco, Consolas, monospace);
      font-size: 10.5px;
      line-height: 1.5;
      white-space: pre;
      word-break: normal;
      color: var(--terminal-fg);
      flex: 1 1 0;
      height: auto;
      min-height: 110px;
    }

    /* Status Pill */
    .status-pill {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 10px;
      padding: 2px 6px;
      border-radius: 10px;
      background: var(--bg);
      border: 1px solid var(--border);
    }
    .dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
    }
    .dot-green { background: var(--success); }
    .dot-gray { background: #71717a; }

    /* Theme-Adaptive SVG Icons from extension/media */
    .svg-icon {
      display: inline-block;
      width: 13px;
      height: 13px;
      vertical-align: -2px;
      fill: currentColor;
      flex-shrink: 0;
    }
    .svg-icon-robot {
      fill: none !important;
      stroke: currentColor;
    }
    .tab-icon .svg-icon {
      width: 15px;
      height: 15px;
      vertical-align: middle;
    }
    h2 .svg-icon {
      width: 15px;
      height: 15px;
      vertical-align: -2px;
      margin-right: 4px;
    }
    h3 .svg-icon {
      width: 13px;
      height: 13px;
      vertical-align: -2px;
      margin-right: 4px;
    }
    button .svg-icon {
      width: 12px;
      height: 12px;
      vertical-align: -1px;
    }
    .btn-run .svg-icon {
      width: 9px;
      height: 9px;
      vertical-align: -1px;
      margin-right: 2px;
    }
    .callout b {
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }
    .callout b .svg-icon {
      width: 12px;
      height: 12px;
      vertical-align: -1px;
    }
    .ws-chip .svg-icon {
      width: 11px;
      height: 11px;
      vertical-align: -1px;
    }
    .badge .svg-icon {
      width: 9px;
      height: 9px;
      vertical-align: -1px;
      margin-left: 2px;
    }
    .tokens-table th .svg-icon {
      width: 10px;
      height: 10px;
      vertical-align: -1px;
    }
    .spin {
      display: inline-block;
      animation: spin 1s linear infinite;
    }
    @keyframes spin {
      100% { transform: rotate(360deg); }
    }
  </style>
</head>
<body>
  <!-- Header Bar -->
  <div class="header">
    <div class="header-top-row">
      <div class="header-left">
        <h2>${icons["robot"] || ""} TidyProteomicsAgent</h2>
      </div>
      <div class="header-actions">
        <button type="button" id="headerRunStopBtn" class="header-run-stop-btn header-btn-run" data-running="false" title="Run Pipeline Tasks">
          <span class="btn-icon">${icons["play"] || ""}</span>
          <span class="btn-text">Run</span>
        </button>
        <span class="badge badge-completed header-status-badge" id="pipelineHeaderBadge">IDLE</span>
      </div>
    </div>
    <!-- Flexible Segmented Progress Bar -->
    <div class="pipeline-progress-container" id="pipelineProgressContainer" title="Analysis Phases Progress">
      <div class="progress-bar-track" id="pipelineProgressBarTrack"></div>
    </div>
  </div>

  <!-- Segmented Tab Navigation -->
  <div class="tab-bar">
    <button type="button" class="tab-btn active" data-tab="chat" onclick="window.switchTab && window.switchTab('chat')" title="TidyProteomics Autonomous Agent & Realtime Event Stream">
      <span class="tab-icon">${icons["robot"] || icons["chat"] || ""}</span>
      <span class="tab-label">Agent</span>
      <span class="tab-indicator" id="chatIndicator"></span>
    </button>
    <button type="button" class="tab-btn" data-tab="pipeline" onclick="window.switchTab && window.switchTab('pipeline')" title="Pipeline execution & phases">
      <span class="tab-icon">${icons["rocket-lunch"] || ""}</span>
      <span class="tab-label">Pipeline</span>
      <span class="tab-indicator" id="pipelineIndicator"></span>
    </button>
    <button type="button" class="tab-btn" data-tab="blackboard" onclick="window.switchTab && window.switchTab('blackboard')" title="Memory notes, protocol & chat log">
      <span class="tab-icon">${icons["ftp"] || ""}</span>
      <span class="tab-label">Memory</span>
    </button>
    <button type="button" class="tab-btn" data-tab="literature" onclick="window.switchTab && window.switchTab('literature')" title="Literature Database & Ingestion">
      <span class="tab-icon">${icons["database"] || ""}</span>
      <span class="tab-label">Literature</span>
      <span class="tab-indicator" id="literatureIndicator"></span>
    </button>
    <button type="button" class="tab-btn" data-tab="provider" onclick="window.switchTab && window.switchTab('provider')" title="LLM Provider, model & API key">
      <span class="tab-icon">${icons["cube"] || ""}</span>
      <span class="tab-label">Provider</span>
      <span class="tab-indicator" id="providerIndicator"></span>
    </button>
    <button type="button" class="tab-btn" data-tab="directory" onclick="window.switchTab && window.switchTab('directory')" title="Active directory & workspace folder status">
      <span class="tab-icon">${icons["folder-open"] || ""}</span>
      <span class="tab-label">Directory</span>
      <span class="tab-indicator" id="dirIndicator"></span>
    </button>
  </div>

  <!-- TAB 1: PIPELINE -->
  <div class="tab-pane" id="pane-pipeline" style="display:none;">
    <!-- Loading Container (shown briefly while initializing) -->
    <div id="loadingPipelineContainer" style="text-align:center; padding:15px; color:var(--muted); font-size:11px;">
      Scanning analysis pipeline...
    </div>

    <!-- State A: No Workspace Folder Open -->
    <div id="noFolderContainer" style="display:none; text-align:center; padding:15px; color:var(--muted);">
      No folder opened in VS Code.<br><br>Use <b>File &gt; Open Folder...</b> or the <b>Directory</b> tab to choose a folder.
    </div>

    <!-- State B: Initialize Analysis Pipeline (shown ONLY when analysis/ is missing or empty) -->
    <div id="initPipelineSection" style="display:none;">
      <div style="background:var(--vscode-sideBar-background); border:1px solid var(--vscode-widget-border, #333); border-radius:6px; padding:12px; margin:4px 0;">
        <div style="display:flex; align-items:center; gap:6px; margin-bottom:6px;">
          <span style="font-size:15px; display:inline-flex; align-items:center;">${icons["rocket-lunch"] || ""}</span>
          <div style="font-weight:600; font-size:12px; color:var(--vscode-foreground);">Initialize Analysis Pipeline</div>
        </div>
        <div style="font-size:11px; color:var(--muted); line-height:1.4; margin-bottom:10px;">
          No analysis tasks found in this directory. Choose a pipeline to initialize your workspace with subdirectories, R setup scripts, and templates:
        </div>
        <div style="margin-bottom:8px;">
          <label style="font-size:10px; font-weight:600; text-transform:uppercase; letter-spacing:0.5px; color:var(--muted); display:block; margin-bottom:4px;">Pipeline Template</label>
          <select id="pipelineTemplateSelect" style="width:100%; box-sizing:border-box; padding:5px 8px; font-size:11px; background:var(--vscode-input-background, #252526); color:var(--vscode-input-foreground, #cccccc); border:1px solid var(--vscode-input-border, #3c3c3c); border-radius:4px; outline:none;">
            <option value="differential_expression">Differential Expression (12-Phase Pipeline)</option>
            <option value="quality_control_only">Quality Control &amp; Exploration (2-Phase QC)</option>
          </select>
        </div>
        <div id="pipelineDescription" style="font-size:10px; color:var(--muted); margin-bottom:12px; background:rgba(255,255,255,0.03); padding:6px 8px; border-radius:4px; border-left:3px solid var(--primary, #007acc); line-height:1.4;">
          <b>Phases:</b> 00_INSTALL \u2794 01_INSPECT \u2794 02_NORMALIZE \u2794 03_IMPUTE \u2794 04_EXPRESSION \u2794 05_ENRICHMENT \u2794 06_OBSERVATIONS \u2794 07_KNOWLEDGE \u2794 08_WEBSEARCH \u2794 09_LITERATURE \u2794 10_FIGURES \u2794 11_SYNTHESIS.<br>
          <i>Includes environment readiness, QC inspection, normalization benchmarking, imputation, differential expression, pathway enrichment, primary observations, internal knowledge, web search, literature database interrogation, discussion figure rendering &amp; statistical digest, and final manuscript synthesis report.</i>
        </div>
        <button type="button" id="initWorkspaceBtn" data-action="initWorkspace" class="btn-primary" style="width:100%; padding:7px 10px; font-size:11px; font-weight:600; display:flex; align-items:center; justify-content:center; gap:6px; cursor:pointer;">
          <span>${icons["sparkles"] || ""}</span> Initialize Working Directory
        </button>
      </div>
    </div>

    <!-- State C: Active Pipeline Dashboard (shown when analysis/ exists and has tasks) -->
    <div id="activePipelineDashboard" style="display:none;">
      <!-- Pipeline Execution Controls -->
      <div class="section">
        <div style="display:flex; gap:4px; margin-bottom:8px;">
          <button id="stopBtn" class="btn-stop" style="display:none; width:100%;">${icons["stop"] || ""} Stop Pipeline</button>
        </div>

        <div class="section-header">
          <div style="display:flex; align-items:center; gap:6px;">
            <h3>${icons["rocket-lunch"] || ""} Analysis Tasks</h3>
            <button type="button" id="refreshTasksBtn" class="btn-icon" title="Reload tasks and sync progress from disk">${icons["refresh"] || "\u21BB"}</button>
          </div>
          <span style="font-size:9px; color:var(--muted);" id="phaseCountLabel">0 Tasks</span>
        </div>
        <div class="section-desc">Select tasks to execute. Click task name to edit in VS Code.</div>

        <!-- Dynamic Phase Checklist -->
        <div id="phaseContainer">
          <div style="text-align:center; padding:10px; color:var(--muted);">Loading phases...</div>
        </div>
      </div>
    </div>
  </div>

  <!-- TAB: AGENT CONTROL PLANE -->
  <div class="tab-pane active" id="pane-chat" style="display:flex;">
    <div class="agent-container advisor-container">
      <div class="agent-header advisor-header">
        <div style="display:flex; align-items:center; gap:8px;">
          <span class="agent-status-dot" id="agentStatusDot"></span>
          <span style="font-size:13px; color:var(--primary); display:inline-flex; align-items:center;">${icons["robot"] || icons["chat"] || ""}</span>
          <h3 style="margin:0; font-size:12px; font-weight:600;">Autonomous Agent</h3>
          <span class="badge" id="agentStatusBadge" style="font-size:8.5px; padding:1px 6px; border-radius:10px; background:rgba(59,130,246,0.15); color:var(--primary);">READY</span>
        </div>
        <div style="display:flex; align-items:center; gap:6px;">
          <button type="button" class="btn-subtle" id="toggleDesignerBtn" title="Toggle Visual Contrast & Study Designer" onclick="window.toggleContrastDesigner && window.toggleContrastDesigner()">\u{1F3AF} Designer</button>
          <button type="button" class="btn-subtle" id="agentClearBtn" title="Clear conversation history">Clear</button>
        </div>
      </div>

      <!-- Visual Contrast & Batch Designer Widget (Collapsible - default hidden to prioritize natural stream) -->
      <div class="contrast-designer-card collapsed" id="contrastDesignerCard" style="display:none;">
        <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:6px;">
          <div style="font-weight:600; font-size:11px; display:flex; align-items:center; gap:6px;">
            <span>\u{1F3AF}</span> Visual Contrast & Study Designer
          </div>
          <span class="badge" id="designerStatusBadge" style="font-size:9px; background:var(--primary); color:#fff; padding:2px 6px; border-radius:4px;">INTERACTIVE</span>
        </div>
        <div style="font-size:10px; color:var(--muted); margin-bottom:8px;">
          Assign perturbation vs. reference groups and configure batch handling in <code>docs/experiment.md</code>:
        </div>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:6px; margin-bottom:8px;">
          <div>
            <label style="font-size:10px; font-weight:600; color:var(--muted); display:block; margin-bottom:2px;">Target (Treatment)</label>
            <input type="text" id="designerTreatmentInput" list="designerGroupList" placeholder="e.g. knockdown" style="width:100%; box-sizing:border-box; font-size:11px; padding:4px 6px; background:var(--vscode-input-background, #1e1e1e); color:var(--fg); border:1px solid var(--border); border-radius:4px; outline:none;">
          </div>
          <div>
            <label style="font-size:10px; font-weight:600; color:var(--muted); display:block; margin-bottom:2px;">Reference (Control)</label>
            <input type="text" id="designerControlInput" list="designerGroupList" placeholder="e.g. control" style="width:100%; box-sizing:border-box; font-size:11px; padding:4px 6px; background:var(--vscode-input-background, #1e1e1e); color:var(--fg); border:1px solid var(--border); border-radius:4px; outline:none;">
          </div>
          <datalist id="designerGroupList"></datalist>
        </div>
        <div style="display:flex; flex-direction:column; gap:4px; margin-bottom:8px; font-size:11px;">
          <label style="display:flex; align-items:center; gap:6px; cursor:pointer;">
            <input type="checkbox" id="designerConfoundingCheck">
            <span>Proceed With Potential Batch Confounding</span>
          </label>
          <label style="display:flex; align-items:center; gap:6px; cursor:pointer;">
            <input type="checkbox" id="designerPoolingCheck" checked>
            <span>Reassign Sample Names According to Pooling Map</span>
          </label>
        </div>
        <div style="display:flex; gap:6px;">
          <button type="button" class="btn-primary btn-sm" id="designerApplyBtn" onclick="window.applyContrastFromDesigner && window.applyContrastFromDesigner()" style="flex:1;">
            Apply Contrast & Resume
          </button>
          <button type="button" class="btn-sm" onclick="window.fetchDesignerState && window.fetchDesignerState()" title="Refresh Discovered Groups" style="padding:2px 8px;">
            \u21BB
          </button>
        </div>
      </div>

      <!-- Quick Action Suggestion Chips -->
      <div class="agent-suggestions advisor-suggestions">
        <button type="button" class="agent-chip advisor-chip" data-prompt="What is the current status of the analysis pipeline? Any issues or recommended next steps?">\u{1F4CA} Pipeline Status</button>
        <button type="button" class="agent-chip advisor-chip" data-prompt="Review docs/experiment.md and verify if my experimental factors, sample groupings, and contrasts are properly set up.">\u{1F9EA} Check Design</button>
        <button type="button" class="agent-chip advisor-chip" data-prompt="Explain any batch confounding warnings or risks detected in the dataset, and what actions I should take.">\u26A0\uFE0F Batch Effects</button>
        <button type="button" class="agent-chip advisor-chip" data-prompt="Summarize the key biological findings and observations recorded in docs/notes.md.">\u{1F9EC} Summary</button>
      </div>

      <!-- Messages Thread -->
      <div class="agent-thread advisor-thread" id="agentThread">
        <div class="agent-msg advisor-msg assistant">
          <div class="agent-avatar advisor-avatar">${icons["robot"] || "\u{1F916}"}</div>
          <div class="agent-bubble advisor-bubble">
            <div class="agent-msg-title advisor-msg-title">TidyProteomics Live Agent</div>
            <div class="agent-msg-body advisor-msg-body">
              Hello! I am your live proteomics agent. I monitor your experimental design in <code>docs/experiment.md</code>, pipeline execution status, and findings in <code>docs/notes.md</code>.
              <br><br>
              Feel free to ask questions about:
              <ul>
                <li>Experimental design, sample grouping, & contrasts</li>
                <li>Batch effect detection & confounding evaluation</li>
                <li>Choosing normalization & imputation methods in tidyproteomics</li>
                <li>Interpreting volcano plots, PCA, & differential expression</li>
                <li>Enrichment analysis & pathway biology</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <!-- Input Bar -->
      <div class="agent-input-area advisor-input-area">
        <div class="agent-input-wrapper advisor-input-wrapper">
          <textarea id="agentInput" rows="1" placeholder="Ask the agent about your analysis, design, or results..."></textarea>
          <div class="agent-input-controls advisor-input-controls">
            <button type="button" id="agentStopBtn" class="btn-stop btn-sm" style="display:none;" title="Stop generation">
              ${icons["stop"] || ""} Stop
            </button>
            <button type="button" id="agentSendBtn" class="btn-primary btn-sm" title="Send message to Agent">
              ${icons["play"] || ""} Send
            </button>
          </div>
        </div>
        <div class="agent-input-hint advisor-input-hint">Enter to send \u2022 Shift+Enter for new line</div>
      </div>
    </div>
  </div>

  <!-- TAB 2: MEMORY & PROTOCOL -->
  <div class="tab-pane" id="pane-blackboard">
    <!-- Persistent Global Context -->
    <div class="section">
      <div class="section-header">
        <h3>${icons["globe"] || ""} Global Context</h3>
        <span class="badge badge-cached">Cached Prefix</span>
      </div>
      <div class="section-desc">System instructions read at the start of every phase and cached in LLM memory.</div>
      <div id="globalFrameContainer">
        <div style="text-align:center; padding:6px; color:var(--muted); font-size:10px;">Loading global files...</div>
      </div>
    </div>

    <!-- Shared Memory -->
    <div class="section">
      <div class="section-header">
        <h3>${icons["ftp"] || ""} Shared Memory</h3>
        <span class="badge badge-completed">Disk State</span>
      </div>
      <div class="section-desc">Cross-phase state on disk. Sub-loops update this scratchpad after each run.</div>
      <div id="blackboardContainer">
        <div style="text-align:center; padding:6px; color:var(--muted); font-size:10px;">Loading memory files...</div>
      </div>
    </div>

    <!-- Logs -->
    <div class="section">
      <div class="section-header">
        <h3>${icons["list-check"] || ""} Logs</h3>
      </div>
      <div class="section-desc">Lean audit trail capturing assistant thoughts, tool executions, and tokens.</div>
      <div id="logsContainer">
        <div style="text-align:center; padding:6px; color:var(--muted); font-size:10px;">Loading logs...</div>
      </div>
    </div>

    <!-- Architecture Callout -->
    <div class="callout">
      <b>${icons["info"] || ""} TidyProteomicsAgent Architecture:</b><br>
      \u2022 <b>Global Context</b> (<code>agent/</code>) is cached across phases to slash token costs.<br>
      \u2022 <b>Ephemeral Sub-Loops</b> run in isolation for each phase, preventing context bloat.<br>
      \u2022 <b>Shared Memory</b> (<code>docs/notes.md</code>) passes findings between phases.
    </div>
  </div>

  <!-- TAB 3: LLM PROVIDER -->
  <div class="tab-pane" id="pane-provider">
    <div class="section">
      <div class="section-header">
        <h3>${icons["cube"] || ""} Provider Configuration</h3>
        <button class="btn-sm" id="saveConfigBtn">Save Settings</button>
      </div>

      <div class="form-group">
        <label>Provider</label>
        <select id="providerSelect">
          <option value="anthropic" ${config.provider === "anthropic" ? "selected" : ""}>Anthropic (Prompt Caching)</option>
          <option value="openrouter" ${config.provider === "openrouter" ? "selected" : ""}>OpenRouter (Unified Gateway)</option>
          <option value="ollama" ${config.provider === "ollama" ? "selected" : ""}>Remote Hosted Ollama</option>
          <option value="gemini" ${config.provider === "gemini" ? "selected" : ""}>Google Gemini</option>
          <option value="openai" ${config.provider === "openai" ? "selected" : ""}>OpenAI</option>
        </select>
      </div>

      <div class="form-group" id="baseUrlGroup">
        <label id="baseUrlLabel">Base URL / Endpoint</label>
        <input type="text" id="baseUrlInput" value="${this.escapeAttr(config.baseUrl || "")}" placeholder="http://remote-host:11434/v1" />
        <span id="baseUrlHint" style="font-size:9px; color:var(--muted); display:block; margin-top:2px;"></span>
      </div>

      <div class="form-group">
        <label id="modelLabel">Model ID</label>
        <input type="text" id="modelInput" value="${this.escapeAttr(config.model || "")}" placeholder="claude-3-7-sonnet-20250219" />
      </div>

      <div class="form-group">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <label id="apiKeyLabel">API Key</label>
          <span id="toggleKeyVisibility" style="font-size:9px; color:var(--primary); cursor:pointer;">Show</span>
        </div>
        <input type="password" id="apiKeyInput" value="${this.escapeAttr(config.apiKey || "")}" placeholder="sk-..." />
      </div>

      <div class="form-group">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <label id="maxTokensLabel">Max Output Tokens</label>
          <span style="font-size:9px; color:var(--muted);">Default: 32,768</span>
        </div>
        <select id="maxTokensSelect">
          <option value="4096" ${config.maxTokens === 4096 ? "selected" : ""}>4,096 (Standard / Minimal)</option>
          <option value="8192" ${config.maxTokens === 8192 ? "selected" : ""}>8,192</option>
          <option value="16384" ${config.maxTokens === 16384 ? "selected" : ""}>16,384 (Recommended for Reports)</option>
          <option value="32768" ${config.maxTokens === 32768 || !config.maxTokens ? "selected" : ""}>32,768 (Full Manuscripts / Long Synthesis)</option>
          <option value="65536" ${config.maxTokens === 65536 ? "selected" : ""}>65,536</option>
          <option value="128000" ${config.maxTokens === 128e3 ? "selected" : ""}>128,000 (OpenRouter Frontier / Luna Max)</option>
        </select>
        <span style="font-size:9px; color:var(--muted); display:block; margin-top:2px;">Prevents tool call JSON truncation during long file generation (e.g. docs/manuscript.md).</span>
      </div>

      <div class="form-group">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <label id="timeoutSecondsLabel">Request Timeout</label>
          <span style="font-size:9px; color:var(--muted);">Default: 600s (10m)</span>
        </div>
        <select id="timeoutSecondsSelect">
          <option value="180" ${config.timeoutSeconds === 180 ? "selected" : ""}>180s (3m - Fast Cloud Models)</option>
          <option value="300" ${config.timeoutSeconds === 300 ? "selected" : ""}>300s (5m - Standard)</option>
          <option value="600" ${config.timeoutSeconds === 600 || !config.timeoutSeconds ? "selected" : ""}>600s (10m - Recommended for Large / Local Models)</option>
          <option value="900" ${config.timeoutSeconds === 900 ? "selected" : ""}>900s (15m - Extended Reasoning / Heavy Synthesis)</option>
          <option value="1200" ${config.timeoutSeconds === 1200 ? "selected" : ""}>1,200s (20m - Ultra Long / Slow Local Inference)</option>
        </select>
        <span style="font-size:9px; color:var(--muted); display:block; margin-top:2px;">Prevents timeout abortions during complex phases or slow local inference (e.g. 70B models).</span>
      </div>

      <div class="form-group">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <label id="engineSelectLabel">Execution Engine</label>
          <span style="font-size:9px; color:var(--muted);">Default: MCP (Live)</span>
        </div>
        <select id="engineSelect" disabled style="opacity:0.85;">
          <option value="mcp" selected>Live MCP Server (In-Memory Session)</option>
        </select>
        <span style="font-size:9px; color:var(--muted); display:block; margin-top:2px;">Autonomous execution via persistent in-memory TidyProteomics MCP Server.</span>
      </div>

      <div style="margin-top:10px; display:flex; justify-content:space-between; align-items:center;">
        <span id="saveStatus" style="font-size:10px; color:var(--success); display:none;">\u2713 Settings saved!</span>
      </div>
    </div>

    <!-- Active Provider Summary Card -->
    <div class="section">
      <div class="section-header">
        <h3>${icons["stats"] || ""} Active Model Summary</h3>
        <button class="icon-btn" data-action="openFile" data-path="docs/llm.md" title="Open docs/llm.md" style="font-size:10px; padding:2px 6px;">docs/llm.md \u2197</button>
      </div>
      <div style="display:flex; flex-direction:column; gap:4px; font-size:11px;">
        <div style="display:flex; justify-content:space-between;">
          <span style="color:var(--muted);">Provider:</span>
          <b id="summaryProvider">${(config.provider || "anthropic").toUpperCase()}</b>
        </div>
        <div style="display:flex; justify-content:space-between;">
          <span style="color:var(--muted);">Model:</span>
          <b id="summaryModel" style="font-family:monospace;">${config.model}</b>
        </div>
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <span style="color:var(--muted);">Execution Engine:</span>
          <div style="display:flex; align-items:center; gap:6px;">
            <b id="summaryEngine" style="font-family:monospace;">MCP (LIVE)</b>
            <button type="button" id="toggleEngineBtn" data-action="toggleEngine" class="btn-secondary btn-sm" style="padding:1px 6px; font-size:9.5px; height:auto; cursor:pointer;" title="Check TidyProteomics MCP Server connection status">Status</button>
          </div>
        </div>
        <div style="display:flex; justify-content:space-between;">
          <span style="color:var(--muted);">Prompt Caching:</span>
          <span id="summaryCaching" class="badge badge-cached">Active ${icons["sparkles"] || ""}</span>
        </div>
        <div style="display:flex; justify-content:space-between;">
          <span style="color:var(--muted);">Max Output Tokens:</span>
          <b id="summaryMaxTokens" style="font-family:monospace;">${(config.maxTokens || 32768).toLocaleString()}</b>
        </div>
        <div style="display:flex; justify-content:space-between;">
          <span style="color:var(--muted);">Request Timeout:</span>
          <b id="summaryTimeout" style="font-family:monospace;">${config.timeoutSeconds || 600}s</b>
        </div>
        <div style="display:flex; justify-content:space-between;">
          <span style="color:var(--muted);">Key Status:</span>
          <span id="summaryKeyStatus" class="badge ${config.apiKey ? "badge-completed" : "badge-failed"}">${config.apiKey ? "Configured" : "Missing"}</span>
        </div>
      </div>
    </div>

    <!-- Tokens -->
    <div class="section">
      <div class="section-header">
        <h3>${icons["coins"] || ""} Tokens</h3>
      </div>
      <table class="tokens-table">
        <thead>
          <tr>
            <th>Prompt</th>
            <th>Cached ${icons["sparkles"] || ""}</th>
            <th>Response</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td id="promptTokens">0</td>
            <td id="cachedTokens" style="color:var(--success);">0</td>
            <td id="responseTokens">0</td>
            <td id="totalTokens">0</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>

  <!-- TAB 4: ACTIVE DIRECTORY -->
  <div class="tab-pane" id="pane-directory">
    <!-- Active Workspace Card -->
    <div class="section">
      <div class="section-header">
        <h3>${icons["folder-open"] || ""} Active VS Code Workspace</h3>
      </div>
      <div class="section-desc">TidyProteomicsAgent automatically operates within the folder currently opened in VS Code.</div>

      <div style="background:var(--bg); border:1px solid var(--border); border-radius:4px; padding:8px; margin-bottom:8px;">
        <div id="dirWsName" style="font-weight:600; font-size:12px; color:#93c5fd; margin-bottom:2px;">Checking workspace...</div>
        <div id="dirWsPath" style="font-size:9px; color:var(--muted); font-family:monospace; word-break:break-all;"></div>
      </div>

      <div style="display:flex; gap:6px;">
        <button type="button" class="btn-secondary btn-sm" id="copyPathBtn" style="flex:1;">${icons["list"] || ""} Copy Path</button>
        <button type="button" class="btn-secondary btn-sm" id="revealOSBtn" style="flex:1;">${icons["folder-open"] || ""} Reveal in OS</button>
        <button type="button" class="btn-secondary btn-sm" id="chooseDirBtn" style="flex:1;">${icons["folder-open"] || ""} Choose Folder...</button>
      </div>
    </div>

    <!-- Project Structure Health Check -->
    <div class="section">
      <div class="section-header">
        <h3>${icons["database"] || ""} Project Structure Health</h3>
      </div>
      <div class="section-desc">Standard directories required for autonomous pipelines:</div>

      <div id="foldersListContainer">
        <div style="text-align:center; padding:6px; color:var(--muted); font-size:10px;">Scanning folders...</div>
      </div>

      <div style="display:flex; gap:6px; margin-top:8px;">
        <button type="button" class="btn-secondary btn-sm" id="rescanDirBtn" style="flex:1;">${icons["refresh"] || ""} Rescan</button>
        <button type="button" class="btn-sm" id="createFoldersBtn" style="flex:1;">${icons["folder-open"] || ""} Create Folders</button>
      </div>
      <div style="margin-top:6px;">
        <button type="button" class="btn-primary btn-sm" id="initPipelineQuickBtn" style="width:100%; padding:6px; font-weight:600;">${icons["sparkles"] || ""} Initialize Pipeline Scaffolding...</button>
      </div>
    </div>

    <!-- Guidance Note on Changing Workspace -->
    <div class="callout" style="line-height:1.5;">
      <b>${icons["info"] || ""} How to Change Analysis Folders:</b><br>
      \u2022 <b>Option 1 (Recommended in-window):</b> Click <b>${icons["folder-open"] || ""} Choose Folder...</b> above. This switches the active project instantly without restarting the window.<br>
      \u2022 <b>Option 2:</b> In VS Code, use <b>File &gt; Add Folder to Workspace...</b> to mount your dataset folder into the Explorer.<br>
      <div style="margin-top:6px; padding:6px; background:rgba(239, 68, 68, 0.1); border-left:3px solid var(--error); border-radius:3px; font-size:10px; color:#fca5a5;">
        <b>${icons["alert"] || ""} Debug Window Note:</b> When debugging this extension (F5), do <b>not</b> use <i>File &gt; Open Folder...</i> because VS Code restarts the window and terminates the debug session. Use <b>Choose Folder...</b> or <b>Add Folder to Workspace...</b> instead.
      </div>
    </div>
  </div>

  <!-- TAB 5: LITERATURE -->
  <div class="tab-pane" id="pane-literature" style="display:none;">
    <!-- Literature Selector & Creator Section -->
    <div class="section">
      <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:6px;">
        <h3 style="margin:0; font-size:11px; font-weight:600; display:flex; align-items:center; gap:5px;">
          ${icons["database"] || ""} Literature Knowledge Database
        </h3>
        <span class="badge badge-idle" id="literatureActiveBadge">NO DATABASE</span>
      </div>

      <div style="margin-bottom:8px;">
        <label style="font-size:10px; font-weight:600; text-transform:uppercase; letter-spacing:0.5px; color:var(--muted); display:block; margin-bottom:4px;">Active Literature Database</label>
        <select id="literatureSelect" style="width:100%; box-sizing:border-box; padding:5px 8px; font-size:11px; background:var(--vscode-input-background, #252526); color:var(--vscode-input-foreground, #cccccc); border:1px solid var(--vscode-input-border, #3c3c3c); border-radius:4px; outline:none;">
          <option value="">(No database selected)</option>
        </select>
      </div>

      <!-- New Literature Input -->
      <div style="display:flex; gap:6px; margin-bottom:8px;">
        <input type="text" id="newLiteratureInput" placeholder="New database name (e.g. p97_vcp)..." style="flex:1; padding:4px 8px; font-size:11px; background:var(--vscode-input-background, #252526); color:var(--vscode-input-foreground, #cccccc); border:1px solid var(--vscode-input-border, #3c3c3c); border-radius:4px; outline:none;" />
        <button type="button" class="btn-sm" id="createLiteratureBtn" style="white-space:nowrap;">${icons["sparkles"] || ""} Create</button>
      </div>

      <!-- Toggle: Use in Synthesis Pipeline -->
      <div class="toggle-row" id="literatureSynthesisToggleRow" style="cursor:pointer;">
        <div style="flex:1;">
          <label for="literatureSynthesisToggle" class="toggle-label" style="cursor:pointer;">Use Active Database in Synthesis</label>
          <div class="toggle-desc">Orchestrates two-way R interrogation in Phase 09</div>
        </div>
        <label for="literatureSynthesisToggle" style="position:relative; display:inline-block; width:34px; height:18px; margin:0; flex-shrink:0; cursor:pointer;">
          <input type="checkbox" id="literatureSynthesisToggle" style="position:absolute; opacity:0; width:100%; height:100%; top:0; left:0; z-index:2; cursor:pointer; margin:0;" />
          <span id="literatureSynthesisSlider"></span>
        </label>
      </div>
    </div>

    <!-- Live Inspector Metrics Section -->
    <div class="section">
      <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:4px;">
        <h3 style="margin:0; font-size:11px; font-weight:600; display:flex; align-items:center; gap:5px;">
          ${icons["stats"] || ""} Literature Metrics
        </h3>
        <button type="button" id="refreshLiteratureStatsBtn" class="btn-icon" title="Refresh metrics from DuckDB" style="padding:2px 4px; font-size:10px;">
          ${icons["refresh"] || "\u21BB"}
        </button>
      </div>

      <div class="metric-grid">
        <div class="metric-card">
          <div class="metric-num" id="metricStudies">0</div>
          <div class="metric-label">Studies</div>
        </div>
        <div class="metric-card">
          <div class="metric-num" id="metricContexts">0</div>
          <div class="metric-label">Contexts</div>
        </div>
        <div class="metric-card">
          <div class="metric-num" id="metricAssertions">0</div>
          <div class="metric-label">Assertions</div>
        </div>
        <div class="metric-card">
          <div class="metric-num" id="metricSymbols">0</div>
          <div class="metric-label">Symbols</div>
        </div>
        <div class="metric-card">
          <div class="metric-num" id="metricOrganisms">0</div>
          <div class="metric-label">Organisms</div>
        </div>
        <div class="metric-card">
          <div class="metric-num" id="metricPerturbations">0</div>
          <div class="metric-label">Perturbations</div>
        </div>
      </div>

      <div style="display:flex; gap:6px; margin-top:8px;">
        <button type="button" class="btn-sm btn-secondary" id="openLiteratureReportBtn" style="flex:1; display:flex; align-items:center; justify-content:center; gap:5px;" title="Open docs/literature_database.md in VS Code">
          ${icons["summary"] || ""} Open Report
        </button>
        <button type="button" class="btn-sm btn-secondary" id="regenerateLiteratureReportBtn" style="flex:1; display:flex; align-items:center; justify-content:center; gap:5px;" title="Regenerate docs/literature_database.md from active DuckDB">
          ${icons["refresh"] || "\u21BB"} Regenerate
        </button>
      </div>
    </div>

    <!-- Preview Search Section -->
    <div class="section">
      <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:6px;">
        <h3 style="margin:0; font-size:11px; font-weight:600; display:flex; align-items:center; gap:5px;">
          ${icons["summary"] || ""} Assertion Search
        </h3>
      </div>
      <div style="display:flex; gap:6px; margin-bottom:6px;">
        <input type="text" id="literatureSearchInput" placeholder="Search gene, alias, or module (e.g. VCP, ERAD)..." style="flex:1; padding:4px 8px; font-size:11px; background:var(--vscode-input-background, #252526); color:var(--vscode-input-foreground, #cccccc); border:1px solid var(--vscode-input-border, #3c3c3c); border-radius:4px; outline:none;" />
        <button type="button" class="btn-sm btn-secondary" id="literatureSearchBtn">Search</button>
      </div>
      <div id="literatureSearchResults" style="max-height:180px; overflow-y:auto; font-size:10.5px; border:1px solid var(--border); border-radius:4px; padding:4px; background:var(--bg);">
        <div style="color:var(--muted); font-size:10px; text-align:center; padding:10px;">Enter a query above to search assertions in the active literature database.</div>
      </div>
    </div>

    <!-- PDF & Supplementary Table Ingestion Queue Section -->
    <div class="section queue-section">
      <div class="section-header">
        <h3 style="margin:0; font-size:11px; font-weight:600; display:flex; align-items:center; gap:5px;">
          ${icons["layers"] || ""} Ingestion Queue
        </h3>
        <span class="badge badge-idle" id="ingestQueueBadge">0 FILES</span>
      </div>

      <div style="display:flex; gap:6px; margin-bottom:8px; flex:0 0 auto;">
        <button type="button" class="btn-secondary btn-sm" id="pickFolderBtn" style="flex:1;">
          ${icons["folder-open"] || ""} Select Literature Folder...
        </button>
        <button type="button" class="btn-secondary btn-sm" id="clearQueueBtn" title="Clear pending queue">
          Clear
        </button>
      </div>

      <div id="literatureQueueList" class="queue-list">
        <div style="color:var(--muted); font-size:10px; text-align:center; padding:12px;">
          No documents in queue.<br>Select a folder containing PDFs or supplementary tables (.xlsx/.csv).
        </div>
      </div>

      <div style="display:flex; gap:6px; flex:0 0 auto;">
        <button type="button" class="btn-primary btn-sm" id="startIngestBtn" style="flex:1; padding:6px; font-weight:600;">
          ${icons["play"] || ""} Run Ingestion Pipeline
        </button>
        <button type="button" class="btn-stop btn-sm" id="abortIngestBtn" style="display:none; padding:6px; font-weight:600;">
          ${icons["stop"] || ""} Abort
        </button>
      </div>
    </div>
  </div>

  <script>
    // Global Error Logger for diagnostics
    window.addEventListener("error", function (e) {
      console.error("[TidyProteomicsAgent Webview Error]", e.error || e.message);
      try {
        if (window.vscode) window.vscode.postMessage({ type: "log", text: "[Webview Error] " + (e.error?.message || e.message) });
      } catch (_) {}
    });

    const vscode = acquireVsCodeApi();
    window.vscode = vscode;
    const ICONS = ${JSON.stringify(icons)};

    // Tab Switching Logic (Defined first so it is available globally immediately)
    function switchTab(tabId) {
      if (!tabId) return;
      try {
        const tabs = document.querySelectorAll(".tab-btn");
        const panes = document.querySelectorAll(".tab-pane");

        tabs.forEach(function (t) {
          if (t.getAttribute("data-tab") === tabId) {
            t.classList.add("active");
          } else {
            t.classList.remove("active");
          }
        });

        panes.forEach(function (p) {
          if (p.id === "pane-" + tabId) {
            p.classList.add("active");
            p.style.display = (tabId === "pipeline" || tabId === "literature" || tabId === "corpus" || tabId === "chat") ? "flex" : "block";
          } else {
            p.classList.remove("active");
            p.style.display = "none";
          }
        });

        if (tabId === "literature" || tabId === "corpus") {
          vscode.postMessage({ type: "literatureGetState" });
        } else if (tabId === "chat") {
          vscode.postMessage({ type: "agentGetState" });
          vscode.postMessage({ type: "getDesignerState" });
          const input = document.getElementById("agentInput") || document.getElementById("advisorInput");
          if (input) setTimeout(function () { input.focus(); }, 50);
        }

        try {
          const current = vscode.getState() || {};
          vscode.setState(Object.assign({}, current, { activeTab: tabId }));
        } catch (_) {}
      } catch (err) {
        console.error("[TidyProteomicsAgent] Error in switchTab:", err);
      }
    }
    window.switchTab = switchTab;

    // Restore saved tab or default to 'pipeline'
    try {
      const savedState = vscode.getState();
      const initialTab = (savedState && savedState.activeTab) ? savedState.activeTab : "chat";
      switchTab(initialTab);
    } catch (_) {
      switchTab("pipeline");
    }

    // Elements
    const pipelineHeaderBadge = document.getElementById("pipelineHeaderBadge");
    const headerRunStopBtn = document.getElementById("headerRunStopBtn");
    const pipelineProgressBarTrack = document.getElementById("pipelineProgressBarTrack");
    const wsChip = document.getElementById("wsChip");
    const wsChipName = document.getElementById("wsChipName");

    const pipelineIndicator = document.getElementById("pipelineIndicator");
    const providerIndicator = document.getElementById("providerIndicator");
    const dirIndicator = document.getElementById("dirIndicator");
    const loadingPipelineContainer = document.getElementById("loadingPipelineContainer");
    const noFolderContainer = document.getElementById("noFolderContainer");
    const initPipelineSection = document.getElementById("initPipelineSection");
    const activePipelineDashboard = document.getElementById("activePipelineDashboard");
    const startPipelineBtn = document.getElementById("startPipelineBtn");
    const stopBtn = document.getElementById("stopBtn");
    const phaseContainer = document.getElementById("phaseContainer");
    const phaseCountLabel = document.getElementById("phaseCountLabel");
    const refreshTasksBtn = document.getElementById("refreshTasksBtn");

    const promptTokensEl = document.getElementById("promptTokens");
    const cachedTokensEl = document.getElementById("cachedTokens");
    const responseTokensEl = document.getElementById("responseTokens");
    const totalTokensEl = document.getElementById("totalTokens");

    const terminalLog = document.getElementById("terminalLog");
    const clearLogBtn = document.getElementById("clearLogBtn");
    const viewChatLogBtn = document.getElementById("viewChatLogBtn");

    const globalFrameContainer = document.getElementById("globalFrameContainer");
    const blackboardContainer = document.getElementById("blackboardContainer");
    const logsContainer = document.getElementById("logsContainer");

    const providerSelect = document.getElementById("providerSelect");
    const modelInput = document.getElementById("modelInput");
    const apiKeyInput = document.getElementById("apiKeyInput");
    const apiKeyLabel = document.getElementById("apiKeyLabel");
    const toggleKeyVisibility = document.getElementById("toggleKeyVisibility");
    const maxTokensSelect = document.getElementById("maxTokensSelect");
    const timeoutSecondsSelect = document.getElementById("timeoutSecondsSelect");
    const baseUrlGroup = document.getElementById("baseUrlGroup");
    const baseUrlInput = document.getElementById("baseUrlInput");
    const baseUrlLabel = document.getElementById("baseUrlLabel");
    const baseUrlHint = document.getElementById("baseUrlHint");
    const saveConfigBtn = document.getElementById("saveConfigBtn");
    const saveStatus = document.getElementById("saveStatus");

    const summaryProvider = document.getElementById("summaryProvider");
    const summaryModel = document.getElementById("summaryModel");
    const summaryCaching = document.getElementById("summaryCaching");
    const summaryMaxTokens = document.getElementById("summaryMaxTokens");
    const summaryTimeout = document.getElementById("summaryTimeout");
    const summaryKeyStatus = document.getElementById("summaryKeyStatus");

    const dirWsName = document.getElementById("dirWsName");
    const dirWsPath = document.getElementById("dirWsPath");
    const copyPathBtn = document.getElementById("copyPathBtn");
    const revealOSBtn = document.getElementById("revealOSBtn");
    const chooseDirBtn = document.getElementById("chooseDirBtn");
    const foldersListContainer = document.getElementById("foldersListContainer");
    const rescanDirBtn = document.getElementById("rescanDirBtn");
    const createFoldersBtn = document.getElementById("createFoldersBtn");

    // Unified Click Handler via event delegation
    document.addEventListener("click", function (e) {
      if (!e.target) return;

      // Tab Buttons
      const tabBtn = e.target.closest ? e.target.closest(".tab-btn") : null;
      if (tabBtn) {
        const tab = tabBtn.getAttribute("data-tab");
        if (tab) switchTab(tab);
        return;
      }


      // Progress Segment Click (navigate to Pipeline tab)
      const progSeg = e.target.closest ? e.target.closest(".progress-segment") : null;
      if (progSeg) {
        switchTab("pipeline");
        return;
      }

      // Workspace Chip (fallback if present)
      if (e.target.closest && e.target.closest("#wsChip")) {
        switchTab("directory");
        return;
      }

      // Initialize Workspace Button
      const initBtn = e.target.closest ? e.target.closest("#initWorkspaceBtn, [data-action='initWorkspace']") : null;
      if (initBtn) {
        const select = document.getElementById("pipelineTemplateSelect");
        const pipelineId = select ? select.value : "differential_expression";
        initBtn.setAttribute("disabled", "true");
        initBtn.innerHTML = '<span class="spin">' + (ICONS["refresh"] || "") + '</span> Initializing...';
        vscode.postMessage({ type: "initWorkspace", pipelineId: pipelineId });
        return;
      }

      // Toggle Engine Button
      if (e.target.closest && e.target.closest("#toggleEngineBtn, [data-action='toggleEngine']")) {
        vscode.postMessage({ type: "toggleEngine" });
        return;
      }

      // Dynamic data-actions (runPhase, openPhase, openFile, confirmContrastAndProceed)
      const target = e.target.closest ? e.target.closest("[data-action]") : null;
      if (target) {
        const action = target.getAttribute("data-action");
        if (action === "runPhase") {
          const phaseId = target.getAttribute("data-id") || target.getAttribute("data-phase-id");
          if (phaseId) vscode.postMessage({ type: "runPhase", phaseId: phaseId });
        } else if (action === "openProviderTab") {
          switchTab("provider");
        } else if (action === "openPhase") {
          const fileName = target.getAttribute("data-file");
          if (fileName) vscode.postMessage({ type: "openPhase", fileName: fileName });
        } else if (action === "openFile") {
          const relPath = target.getAttribute("data-path");
          const searchText = target.getAttribute("data-search");
          if (relPath) vscode.postMessage({ type: "openFile", relPath: relPath, searchText: searchText || "" });
        } else if (action === "confirmContrastAndProceed" || action === "authorizeConfoundingAndRerun") {
          const phaseId = target.getAttribute("data-phase-id");
          if (phaseId) vscode.postMessage({ type: "confirmContrastAndProceed", phaseId: phaseId });
        } else if (action === "openAdvisorTab" || action === "openAgentTab") {
          switchTab("chat");
        }
        return;
      }
    });

    // Checkbox Toggle for Phases and Pipeline Template Change
    document.addEventListener("change", function (e) {
      if (e.target && e.target.matches && e.target.matches("input[type='checkbox'][data-phase-id]")) {
        const phaseId = e.target.getAttribute("data-phase-id");
        vscode.postMessage({ type: "togglePhase", phaseId: phaseId, enabled: e.target.checked });
      } else if (e.target && e.target.id === "pipelineTemplateSelect") {
        const descEl = document.getElementById("pipelineDescription");
        const selectEl = e.target;
        if (descEl) {
          if (selectEl.value === "quality_control_only") {
            descEl.innerHTML = "<b>Phases:</b> 00_INSTALL \u2794 01_INSPECT.<br><i>Includes: Workspace readiness, data import, replicate CV analysis, quantifiable fraction evaluation, and PCA separation.</i>";
          } else {
            descEl.innerHTML = "<b>Phases:</b> 00_INSTALL \u2794 01_INSPECT \u2794 02_NORMALIZE \u2794 03_IMPUTE \u2794 04_EXPRESSION \u2794 05_ENRICHMENT \u2794 06_OBSERVATIONS \u2794 07_KNOWLEDGE \u2794 08_WEBSEARCH \u2794 09_LITERATURE \u2794 10_FIGURES \u2794 11_SYNTHESIS.<br><i>Includes: Environment readiness, QC inspection, normalization benchmarking, imputation, differential expression, pathway enrichment, primary observations, internal knowledge, web search, literature database interrogation, discussion figure rendering &amp; statistical digest, and final manuscript synthesis report.</i>";
          }
        }
      }
    });

    // Key Visibility Toggle
    if (toggleKeyVisibility && apiKeyInput) {
      toggleKeyVisibility.addEventListener("click", () => {
        if (apiKeyInput.type === "password") {
          apiKeyInput.type = "text";
          toggleKeyVisibility.textContent = "Hide";
        } else {
          apiKeyInput.type = "password";
          toggleKeyVisibility.textContent = "Show";
        }
      });
    }

    // Provider UI updates
    function updateProviderUI(isUserChange) {
      if (!providerSelect) return;
      const prov = providerSelect.value;
      if (baseUrlGroup) {
        if (prov === "ollama") {
          baseUrlGroup.style.display = "block";
          if (baseUrlLabel) baseUrlLabel.textContent = "Remote Ollama Base URL";
          if (baseUrlInput) baseUrlInput.placeholder = "http://192.168.1.100:11434/v1";
          if (baseUrlHint) baseUrlHint.textContent = "Points to remote Ollama host. Suffix /v1 auto-added if omitted.";
          if (apiKeyLabel) apiKeyLabel.textContent = "API Key (Optional / Auth Proxy)";
          if (apiKeyInput) apiKeyInput.placeholder = "Leave blank if unauthenticated";
          if (modelInput) modelInput.placeholder = "llama3.3:70b";
          if (isUserChange && modelInput && (!modelInput.value || modelInput.value.startsWith("claude") || modelInput.value.startsWith("gpt") || modelInput.value.startsWith("gemini"))) {
            modelInput.value = "llama3.3:70b";
          }
        } else if (prov === "openrouter") {
          baseUrlGroup.style.display = "block";
          if (baseUrlLabel) baseUrlLabel.textContent = "OpenRouter Endpoint URL";
          if (baseUrlInput) baseUrlInput.placeholder = "https://openrouter.ai/api/v1 (default)";
          if (baseUrlHint) baseUrlHint.textContent = "Unified frontier gateway with prompt caching support.";
          if (apiKeyLabel) apiKeyLabel.textContent = "OpenRouter API Key";
          if (apiKeyInput) apiKeyInput.placeholder = "sk-or-v1-...";
          if (modelInput) modelInput.placeholder = "anthropic/claude-3.7-sonnet";
          if (isUserChange && modelInput && (!modelInput.value || modelInput.value === "llama3.3:70b" || modelInput.value === "gpt-4o")) {
            modelInput.value = "anthropic/claude-3.7-sonnet";
          }
        } else if (prov === "anthropic") {
          baseUrlGroup.style.display = "none";
          if (apiKeyLabel) apiKeyLabel.textContent = "Anthropic API Key";
          if (apiKeyInput) apiKeyInput.placeholder = "sk-ant-...";
          if (modelInput) modelInput.placeholder = "claude-3-7-sonnet-20250219";
          if (isUserChange && modelInput && (!modelInput.value || modelInput.value.includes("/") || modelInput.value.startsWith("llama"))) {
            modelInput.value = "claude-3-7-sonnet-20250219";
          }
        } else if (prov === "gemini") {
          baseUrlGroup.style.display = "none";
          if (apiKeyLabel) apiKeyLabel.textContent = "Google AI Studio API Key";
          if (apiKeyInput) apiKeyInput.placeholder = "AIzaSy...";
          if (modelInput) modelInput.placeholder = "gemini-2.5-pro";
          if (isUserChange && modelInput && (!modelInput.value || modelInput.value.startsWith("claude") || modelInput.value.startsWith("gpt") || modelInput.value.startsWith("llama"))) {
            modelInput.value = "gemini-2.5-pro";
          }
        } else if (prov === "openai") {
          baseUrlGroup.style.display = "block";
          if (baseUrlLabel) baseUrlLabel.textContent = "OpenAI Base URL (Optional)";
          if (baseUrlInput) baseUrlInput.placeholder = "https://api.openai.com/v1 (default)";
          if (baseUrlHint) baseUrlHint.textContent = "Leave blank for official OpenAI or enter custom proxy.";
          if (apiKeyLabel) apiKeyLabel.textContent = "OpenAI API Key";
          if (apiKeyInput) apiKeyInput.placeholder = "sk-...";
          if (modelInput) modelInput.placeholder = "gpt-4o";
          if (isUserChange && modelInput && (!modelInput.value || modelInput.value.startsWith("claude") || modelInput.value.startsWith("gemini") || modelInput.value.startsWith("llama"))) {
            modelInput.value = "gpt-4o";
          }
        }
      }

      // Update provider summary card
      if (summaryProvider) summaryProvider.textContent = (prov || "ANTHROPIC").toUpperCase();
      if (summaryModel && modelInput) summaryModel.textContent = modelInput.value;
      if (summaryCaching) {
        if (prov === "anthropic" || prov === "openrouter") {
          summaryCaching.innerHTML = "Active " + (ICONS["sparkles"] || "");
          summaryCaching.className = "badge badge-cached";
        } else {
          summaryCaching.textContent = "Standard";
          summaryCaching.className = "badge badge-pending";
        }
      }
    }

    function sendConfigSave(silent) {
      vscode.postMessage({
        type: "saveConfig",
        provider: providerSelect ? providerSelect.value : "anthropic",
        model: modelInput ? modelInput.value.trim() : "",
        apiKey: apiKeyInput ? apiKeyInput.value.trim() : "",
        baseUrl: baseUrlInput ? baseUrlInput.value.trim() : "",
        maxTokens: maxTokensSelect ? parseInt(maxTokensSelect.value, 10) : 32768,
        timeoutSeconds: timeoutSecondsSelect ? parseInt(timeoutSecondsSelect.value, 10) : 600,
        silent: !!silent
      });
      if (!silent && saveStatus) {
        saveStatus.style.display = "inline";
        setTimeout(() => { saveStatus.style.display = "none"; }, 3000);
      }
    }

    if (providerSelect) {
      providerSelect.addEventListener("change", function () {
        updateProviderUI(true);
        sendConfigSave(true);
      });
    }

    if (modelInput) {
      modelInput.addEventListener("input", function () {
        if (summaryModel) summaryModel.textContent = modelInput.value;
      });
      modelInput.addEventListener("change", function () {
        sendConfigSave(true);
      });
      modelInput.addEventListener("blur", function () {
        sendConfigSave(true);
      });
    }

    if (apiKeyInput) {
      apiKeyInput.addEventListener("input", function () {
        const hasKey = !!apiKeyInput.value.trim();
        if (summaryKeyStatus) {
          summaryKeyStatus.textContent = hasKey ? "Configured" : "Missing";
          summaryKeyStatus.className = "badge " + (hasKey ? "badge-completed" : "badge-failed");
        }
        if (providerIndicator && providerSelect) {
          providerIndicator.className = (providerSelect.value !== "ollama" && !hasKey) ? "tab-indicator alert" : "tab-indicator";
        }
      });
      apiKeyInput.addEventListener("change", function () {
        sendConfigSave(true);
      });
      apiKeyInput.addEventListener("blur", function () {
        sendConfigSave(true);
      });
    }

    if (baseUrlInput) {
      baseUrlInput.addEventListener("change", function () {
        sendConfigSave(true);
      });
      baseUrlInput.addEventListener("blur", function () {
        sendConfigSave(true);
      });
    }

    if (maxTokensSelect) {
      maxTokensSelect.addEventListener("change", function () {
        if (summaryMaxTokens) summaryMaxTokens.textContent = Number(maxTokensSelect.value).toLocaleString();
        sendConfigSave(true);
      });
    }

    if (timeoutSecondsSelect) {
      timeoutSecondsSelect.addEventListener("change", function () {
        if (summaryTimeout) summaryTimeout.textContent = timeoutSecondsSelect.value + "s";
        sendConfigSave(true);
      });
    }

    const engineSelect = document.getElementById("engineSelect");
    if (engineSelect) {
      engineSelect.addEventListener("change", function () {
        vscode.postMessage({ type: "setEngine", engine: engineSelect.value });
      });
    }

    // Initial load: do NOT overwrite modelInput.value!
    updateProviderUI(false);

    // Button Actions
    if (saveConfigBtn) {
      saveConfigBtn.addEventListener("click", function () {
        sendConfigSave(false);
      });
    }

    if (headerRunStopBtn) {
      headerRunStopBtn.addEventListener("click", function () {
        const isRunning = headerRunStopBtn.getAttribute("data-running") === "true";
        if (isRunning) {
          vscode.postMessage({ type: "stopPipeline" });
        } else {
          vscode.postMessage({ type: "startPipeline" });
        }
      });
    }

    if (startPipelineBtn) startPipelineBtn.addEventListener("click", () => vscode.postMessage({ type: "startPipeline" }));
    if (stopBtn) stopBtn.addEventListener("click", () => vscode.postMessage({ type: "stopPipeline" }));
    if (refreshTasksBtn) {
      refreshTasksBtn.addEventListener("click", function () {
        refreshTasksBtn.style.transform = "rotate(360deg)";
        refreshTasksBtn.style.transition = "transform 0.4s ease";
        setTimeout(function () {
          refreshTasksBtn.style.transform = "none";
          refreshTasksBtn.style.transition = "none";
        }, 400);
        vscode.postMessage({ type: "forceReload" });
      });
    }
    if (clearLogBtn) clearLogBtn.addEventListener("click", () => { if (terminalLog) terminalLog.textContent = ""; });
    if (viewChatLogBtn) viewChatLogBtn.addEventListener("click", () => vscode.postMessage({ type: "openFile", relPath: "logs/pipeline.md" }));

    if (copyPathBtn) copyPathBtn.addEventListener("click", () => vscode.postMessage({ type: "copyPath" }));
    if (revealOSBtn) revealOSBtn.addEventListener("click", () => vscode.postMessage({ type: "revealInOS" }));
    if (chooseDirBtn) chooseDirBtn.addEventListener("click", () => vscode.postMessage({ type: "selectDirectory" }));
    if (rescanDirBtn) rescanDirBtn.addEventListener("click", () => vscode.postMessage({ type: "rescanWorkspace" }));
    if (createFoldersBtn) createFoldersBtn.addEventListener("click", () => vscode.postMessage({ type: "createMissingFolders" }));
    const initPipelineQuickBtn = document.getElementById("initPipelineQuickBtn");
    if (initPipelineQuickBtn) initPipelineQuickBtn.addEventListener("click", () => vscode.postMessage({ type: "promptInitWorkspace" }));

    function escapeAttr(str) {
      if (!str) return "";
      return String(str)
        .replace(/&/g, "&amp;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;")
        .replace(/</g, "&lt;");
    }

    // Literature Tab Elements
    let currentActiveLiterature = "";
    const literatureSelect = document.getElementById("literatureSelect") || document.getElementById("corpusSelect");
    const newLiteratureInput = document.getElementById("newLiteratureInput") || document.getElementById("newCorpusInput");
    const createLiteratureBtn = document.getElementById("createLiteratureBtn") || document.getElementById("createCorpusBtn");
    const literatureSynthesisToggle = document.getElementById("literatureSynthesisToggle") || document.getElementById("corpusSynthesisToggle");
    const literatureActiveBadge = document.getElementById("literatureActiveBadge") || document.getElementById("corpusActiveBadge");
    const refreshLiteratureStatsBtn = document.getElementById("refreshLiteratureStatsBtn") || document.getElementById("refreshCorpusStatsBtn");
    const metricStudies = document.getElementById("metricStudies");
    const metricContexts = document.getElementById("metricContexts");
    const metricAssertions = document.getElementById("metricAssertions");
    const metricSymbols = document.getElementById("metricSymbols");
    const metricOrganisms = document.getElementById("metricOrganisms");
    const metricPerturbations = document.getElementById("metricPerturbations");
    const literatureSearchInput = document.getElementById("literatureSearchInput") || document.getElementById("corpusSearchInput");
    const literatureSearchBtn = document.getElementById("literatureSearchBtn") || document.getElementById("corpusSearchBtn");
    const literatureSearchResults = document.getElementById("literatureSearchResults") || document.getElementById("corpusSearchResults");
    const ingestQueueBadge = document.getElementById("ingestQueueBadge");
    const pickFolderBtn = document.getElementById("pickFolderBtn");
    const clearQueueBtn = document.getElementById("clearQueueBtn");
    const literatureQueueList = document.getElementById("literatureQueueList") || document.getElementById("corpusQueueList");
    const startIngestBtn = document.getElementById("startIngestBtn");
    const abortIngestBtn = document.getElementById("abortIngestBtn");
    const literatureIndicator = document.getElementById("literatureIndicator") || document.getElementById("corpusIndicator");

    if (literatureSelect) {
      literatureSelect.addEventListener("change", function () {
        const val = literatureSelect.value;
        vscode.postMessage({ type: "literatureSelect", fileName: val });
        if (val) {
          vscode.postMessage({ type: "literatureStats", fileName: val });
        } else {
          renderLiteratureStats({ study_count: 0, context_count: 0, assertion_count: 0, unique_symbols: 0, organism_count: 0, perturbation_count: 0 });
        }
      });
    }

    if (createLiteratureBtn && newLiteratureInput) {
      createLiteratureBtn.addEventListener("click", function () {
        const name = (newLiteratureInput.value || "").trim();
        if (!name) return;
        vscode.postMessage({ type: "literatureCreate", name: name });
        newLiteratureInput.value = "";
      });
      newLiteratureInput.addEventListener("keydown", function (e) {
        if (e.key === "Enter") {
          createLiteratureBtn.click();
        }
      });
    }

    if (literatureSynthesisToggle) {
      literatureSynthesisToggle.addEventListener("change", function () {
        vscode.postMessage({ type: "literatureToggleSynthesis", enabled: !!literatureSynthesisToggle.checked });
      });
    }

    const literatureSynthesisToggleRow = document.getElementById("literatureSynthesisToggleRow");
    if (literatureSynthesisToggleRow && literatureSynthesisToggle) {
      literatureSynthesisToggleRow.addEventListener("click", function (e) {
        if (e.target !== literatureSynthesisToggle && e.target.tagName !== "LABEL") {
          literatureSynthesisToggle.checked = !literatureSynthesisToggle.checked;
          literatureSynthesisToggle.dispatchEvent(new Event("change"));
        }
      });
    }

    if (refreshLiteratureStatsBtn) {
      refreshLiteratureStatsBtn.addEventListener("click", function () {
        refreshLiteratureStatsBtn.style.transform = "rotate(360deg)";
        refreshLiteratureStatsBtn.style.transition = "transform 0.5s ease";
        setTimeout(function () {
          refreshLiteratureStatsBtn.style.transform = "none";
          refreshLiteratureStatsBtn.style.transition = "none";
        }, 500);
        const val = (literatureSelect && literatureSelect.value) || currentActiveLiterature || "";
        if (val) {
          vscode.postMessage({ type: "literatureStats", fileName: val });
        } else {
          renderLiteratureStats({ study_count: 0, context_count: 0, assertion_count: 0, unique_symbols: 0, organism_count: 0, perturbation_count: 0 });
        }
      });
    }

    const openLiteratureReportBtn = document.getElementById("openLiteratureReportBtn");
    const regenerateLiteratureReportBtn = document.getElementById("regenerateLiteratureReportBtn");
    if (openLiteratureReportBtn) {
      openLiteratureReportBtn.addEventListener("click", function () {
        vscode.postMessage({ type: "literatureOpenReport" });
      });
    }
    if (regenerateLiteratureReportBtn) {
      regenerateLiteratureReportBtn.addEventListener("click", function () {
        const val = (literatureSelect && literatureSelect.value) || currentActiveLiterature || "";
        vscode.postMessage({ type: "literatureGenerateReport", fileName: val });
      });
    }

    function doLiteratureSearch() {
      if (!literatureSearchInput) return;
      const q = (literatureSearchInput.value || "").trim();
      if (!q) return;
      const val = literatureSelect ? literatureSelect.value : "";
      vscode.postMessage({ type: "literatureSearch", query: q, limit: 50, fileName: val });
    }

    if (literatureSearchBtn) {
      literatureSearchBtn.addEventListener("click", doLiteratureSearch);
    }
    if (literatureSearchInput) {
      literatureSearchInput.addEventListener("keydown", function (e) {
        if (e.key === "Enter") doLiteratureSearch();
      });
    }

    if (pickFolderBtn) {
      pickFolderBtn.addEventListener("click", function () {
        vscode.postMessage({ type: "literaturePickFolder" });
      });
    }

    if (clearQueueBtn) {
      clearQueueBtn.addEventListener("click", function () {
        vscode.postMessage({ type: "literatureClearQueue" });
      });
    }

    if (startIngestBtn) {
      startIngestBtn.addEventListener("click", function () {
        const val = literatureSelect ? literatureSelect.value : "";
        vscode.postMessage({ type: "literatureStartIngest", fileName: val });
      });
    }

    if (abortIngestBtn) {
      abortIngestBtn.addEventListener("click", function () {
        vscode.postMessage({ type: "literatureAbortIngest" });
      });
    }

    function renderLiteratureState(state) {
      if (!state) return;

      const activeDb = state.activeLiterature || state.activeCorpus || (state.config && (state.config.activeLiterature || state.config.activeCorpus)) || "";
      const useInSynthesis = !!(state.useInSynthesis !== undefined ? state.useInSynthesis : (state.config && state.config.useInSynthesis));
      const isIngesting = !!(state.isIngesting !== undefined ? state.isIngesting : state.busy === "ingesting");

      if (literatureSelect) {
        let optionsHtml = '<option value="">(No database selected)</option>';
        const dbs = state.literature || state.corpora;
        if (Array.isArray(dbs)) {
          for (const c of dbs) {
            const isSel = c.fileName === activeDb ? " selected" : "";
            optionsHtml += '<option value="' + escapeAttr(c.fileName) + '"' + isSel + '>' + escapeHtml(c.fileName) + '</option>';
          }
        }
        literatureSelect.innerHTML = optionsHtml;
        literatureSelect.value = activeDb;
      }

      if (literatureActiveBadge) {
        if (activeDb) {
          literatureActiveBadge.textContent = "ACTIVE";
          literatureActiveBadge.className = "badge badge-completed";
        } else {
          literatureActiveBadge.textContent = "NO DATABASE";
          literatureActiveBadge.className = "badge badge-idle";
        }
      }

      if (literatureSynthesisToggle) {
        literatureSynthesisToggle.checked = useInSynthesis;
      }

      if (literatureIndicator) {
        literatureIndicator.className = (activeDb && useInSynthesis) ? "tab-indicator active" : "tab-indicator";
      }

      if (literatureQueueList) {
        const queue = state.queue || [];
        if (ingestQueueBadge) {
          ingestQueueBadge.textContent = queue.length + " FILE" + (queue.length === 1 ? "" : "S");
        }
        if (queue.length === 0) {
          literatureQueueList.innerHTML = '<div style="color:var(--muted); font-size:10px; text-align:center; padding:12px;">No documents in queue.<br>Select a folder containing PDFs or supplementary tables (.xlsx/.csv).</div>';
        } else {
          let qHtml = "";
          for (const item of queue) {
            let badgeClass = "badge-idle";
            if (item.stage === "indexed") badgeClass = "badge-indexed";
            else if (item.stage === "failed") badgeClass = "badge-error";
            else if (item.stage === "skipped") badgeClass = "badge-skipped";
            else if (item.stage === "parsing_pdf") badgeClass = "badge-parsing_pdf";
            else if (item.stage === "llm_extraction") badgeClass = "badge-llm_extraction";
            else if (item.stage === "normalization") badgeClass = "badge-normalization";

            qHtml += '<div class="queue-item">' +
              '<div class="queue-item-left">' +
                '<div class="queue-item-title" title="' + escapeAttr(item.absPath) + '">' + escapeHtml(item.fileName) + '</div>' +
                '<div style="font-size:9px; color:var(--muted);">' +
                  (item.pageCount ? item.pageCount + ' pages \u2022 ' : '') +
                  (item.message ? escapeHtml(item.message) : '') +
                '</div>' +
              '</div>' +
              '<span class="badge ' + badgeClass + '">' + escapeHtml(item.stage.toUpperCase()) + '</span>' +
            '</div>';
          }
          literatureQueueList.innerHTML = qHtml;
        }
      }

      currentActiveLiterature = activeDb;

      if (isIngesting) {
        if (startIngestBtn) {
          startIngestBtn.disabled = true;
          startIngestBtn.style.opacity = "0.5";
        }
        if (abortIngestBtn) abortIngestBtn.style.display = "inline-flex";
      } else {
        if (startIngestBtn) {
          startIngestBtn.disabled = false;
          startIngestBtn.style.opacity = "1";
        }
        if (abortIngestBtn) abortIngestBtn.style.display = "none";
      }

      const hasStats = state.stats && (state.stats.study_count !== undefined || state.stats.studies !== undefined);
      if (activeDb && !hasStats) {
        vscode.postMessage({ type: "literatureStats", fileName: activeDb });
      } else if (state.stats) {
        renderLiteratureStats(state.stats);
      } else if (!activeDb) {
        renderLiteratureStats({ study_count: 0, context_count: 0, assertion_count: 0, unique_symbols: 0, organism_count: 0, perturbation_count: 0 });
      }
    }
    const renderCorpusState = renderLiteratureState;

    function renderLiteratureStats(stats) {
      if (!stats) return;
      const studies = stats.study_count ?? stats.studies ?? 0;
      const contexts = stats.context_count ?? stats.contexts ?? 0;
      const assertions = stats.assertion_count ?? stats.assertions ?? 0;
      const symbols = stats.unique_symbols ?? stats.symbols ?? 0;
      const organisms = stats.organism_count ?? stats.organisms ?? 0;
      const perturbations = stats.perturbation_count ?? stats.perturbations ?? 0;

      if (metricStudies) metricStudies.textContent = String(studies);
      if (metricContexts) metricContexts.textContent = String(contexts);
      if (metricAssertions) metricAssertions.textContent = String(assertions);
      if (metricSymbols) metricSymbols.textContent = String(symbols);
      if (metricOrganisms) metricOrganisms.textContent = String(organisms);
      if (metricPerturbations) metricPerturbations.textContent = String(perturbations);
    }
    const renderCorpusStats = renderLiteratureStats;

    function renderLiteratureSearchResults(res) {
      if (!literatureSearchResults) return;
      if (!res || !res.ok) {
        literatureSearchResults.innerHTML = '<div style="color:var(--error); padding:6px;">Search failed: ' + escapeHtml(res?.error || "Unknown error") + '</div>';
        return;
      }
      const data = res.data || res;
      const rows = res.results || res.rows || data.results || data.rows || [];
      const query = res.query || data.query || "";
      if (rows.length === 0) {
        literatureSearchResults.innerHTML = '<div style="color:var(--muted); padding:8px; text-align:center;">No matching assertions found for "' + escapeHtml(query) + '"</div>';
        return;
      }

      let html = '<div style="margin-bottom:4px; font-weight:600; color:var(--muted); font-size:9.5px;">Found ' + rows.length + ' assertion(s):</div>';
      for (const r of rows) {
        const symbol = r.canonical_human_symbol || r.raw_entity_name || "Unknown";
        const rel = r.relationship_type || "";
        const mod = r.functional_module ? ' \u2022 ' + escapeHtml(r.functional_module) : "";
        const ctx = (r.model_name ? escapeHtml(r.model_name) : "") + (r.perturbation_target ? ' (' + escapeHtml(r.perturbation_target) + ')' : "");
        const quote = r.evidence_quote ? '<div style="font-style:italic; color:var(--muted); font-size:9.5px; margin-top:2px;">"' + escapeHtml(r.evidence_quote) + '"</div>' : "";
        const study = r.title ? '<div style="color:var(--primary); font-size:9px; margin-top:2px;">Ref: ' + escapeHtml(r.title) + (r.year ? ' (' + r.year + ')' : '') + '</div>' : "";

        html += '<div style="border-bottom:1px solid var(--border); padding:5px 0;">' +
          '<div style="display:flex; justify-content:space-between; align-items:baseline;">' +
            '<span style="font-weight:700; color:var(--fg);">' + escapeHtml(symbol) + '</span>' +
            '<span class="badge badge-idle" style="font-size:8px;">' + escapeHtml(rel) + '</span>' +
          '</div>' +
          '<div style="color:var(--fg); font-size:10px;">' + ctx + mod + '</div>' +
          quote +
          study +
        '</div>';
      }
      literatureSearchResults.innerHTML = html;
    }
    const renderCorpusSearchResults = renderLiteratureSearchResults;

    function escapeHtml(str) {
      if (!str) return "";
      return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
    }

    function padTimer(str) {
      return String(str || "").padStart(7, " ");
    }

    let tickerInterval = null;
    function syncRunTicker(anyRunning) {
      if (anyRunning) {
        if (!tickerInterval) {
          tickerInterval = setInterval(function () {
            const runningCards = document.querySelectorAll(".task-card.running");
            if (!runningCards || runningCards.length === 0) {
              clearInterval(tickerInterval);
              tickerInterval = null;
              return;
            }
            runningCards.forEach(function (card) {
              const startStr = card.getAttribute("data-start-time");
              const durEl = card.querySelector(".task-duration");
              if (durEl && startStr) {
                const startMs = new Date(startStr).getTime();
                if (!isNaN(startMs)) {
                  const sec = Math.max(0, Math.round((Date.now() - startMs) / 1000));
                  durEl.textContent = padTimer(sec + "s");
                }
              }
            });
          }, 1000);
        }
      } else {
        if (tickerInterval) {
          clearInterval(tickerInterval);
          tickerInterval = null;
        }
      }
    }

    // Render Webview State
    function renderState(state) {
      if (!state) return;

      try {
        const wsName = state.workspaceName || "Project";
        const wsPath = state.workingDirectory || "";

        // Update header & directory tab
        if (wsChipName) wsChipName.textContent = wsName;
        if (dirWsName) {
          if (wsPath) {
            dirWsName.innerHTML = (ICONS["folder-open"] || "") + " " + escapeHtml(wsName);
          } else {
            dirWsName.textContent = "No Workspace Open";
          }
        }
        if (dirWsPath) {
          dirWsPath.textContent = wsPath || "Please open a project directory via File > Open Folder... or click 'Choose Folder...' below";
          dirWsPath.title = wsPath;
        }

        if (dirIndicator) {
          dirIndicator.className = wsPath ? "tab-indicator" : "tab-indicator alert";
        }

        const litCfg = state.literature || state.knowledgeCorpus;
        const ind = literatureIndicator || corpusIndicator;
        if (ind && litCfg) {
          const act = litCfg.activeLiterature || litCfg.activeCorpus;
          ind.className = (act && litCfg.useInSynthesis) ? "tab-indicator active" : "tab-indicator";
        }

        // Provider API Key alert
        if (providerIndicator) {
          const prov = state.provider || (providerSelect ? providerSelect.value : "anthropic");
          const hasKey = apiKeyInput ? !!apiKeyInput.value.trim() : false;
          providerIndicator.className = (prov !== "ollama" && !hasKey) ? "tab-indicator alert" : "tab-indicator";
        }

        // Tokens
        if (state.totalTokens) {
          const prompt = state.totalTokens.promptTokens || 0;
          const cached = state.totalTokens.cachedPromptTokens || 0;
          const response = state.totalTokens.completionTokens || 0;
          const total = state.totalTokens.totalTokens || (prompt + response);

          if (promptTokensEl) promptTokensEl.textContent = prompt.toLocaleString();
          if (cachedTokensEl) cachedTokensEl.textContent = cached.toLocaleString();
          if (responseTokensEl) responseTokensEl.textContent = response.toLocaleString();
          if (totalTokensEl) totalTokensEl.textContent = total.toLocaleString();
        }

        // Pipeline Running State & Phase Metrics
        const anyRunning = !!state.isRunning || (state.phases && state.phases.some(function(p) { return p && p.status === "running"; }));
        let runningIndex = (typeof state.currentPhaseIndex === "number" && state.currentPhaseIndex >= 0) ? state.currentPhaseIndex : -1;
        if (runningIndex === -1 && state.phases) {
          for (let i = 0; i < state.phases.length; i++) {
            const p = state.phases[i];
            if (p && p.status === "running") {
              runningIndex = i;
              break;
            }
          }
        }

        const phaseCount = state.phases ? state.phases.length : 0;
        const analysisFolder = state.folders ? state.folders.find(function (f) { return f.name === "analysis"; }) : null;
        const isMissingOrEmpty = state.isAnalysisMissingOrEmpty !== undefined
          ? state.isAnalysisMissingOrEmpty
          : (!wsPath || !analysisFolder || !analysisFolder.exists || !analysisFolder.itemCount || analysisFolder.itemCount === 0 || phaseCount === 0);

        // Analyze pipeline task health: warning/needs attention, error/failed, or completed
        let hasAttention = false;
        let hasFailed = false;
        let allCompleted = (state.phases && state.phases.length > 0);

        if (state.phases && state.phases.length > 0) {
          for (let i = 0; i < state.phases.length; i++) {
            const p = state.phases[i];
            if (!p) continue;
            const rawStatus = (p.status || "pending").toLowerCase();
            const errText = String(p.error || p.summary || "").trim();
            const isContrastNeeded = /Section 3.?C|suggested contrast|unconfirmed.*contrast|target contrast/i.test(errText);
            const isConfounding = /confound|Proceed With Potential Batch Confounding|Authorize Unadjusted Exploratory Comparison/i.test(errText);
            const isAttentionNeeded = isContrastNeeded || isConfounding || /attention|action required|confirm.*proceed/i.test(errText) || rawStatus === "warning" || rawStatus === "needs_attention";

            if (isAttentionNeeded) {
              hasAttention = true;
            } else if (rawStatus === "failed" || rawStatus === "error") {
              hasFailed = true;
            }

            if (p.enabled !== false && rawStatus !== "completed" && rawStatus !== "cached") {
              allCompleted = false;
            }
          }
        } else {
          allCompleted = false;
        }

        // 1. Update Header Status Indicator (right-aligned, matching title height)
        if (pipelineHeaderBadge) {
          if (anyRunning) {
            pipelineHeaderBadge.innerHTML = "RUNNING " + (ICONS["sparkles"] || "");
            pipelineHeaderBadge.className = "badge badge-running header-status-badge";
          } else if (hasAttention) {
            pipelineHeaderBadge.textContent = "ATTENTION";
            pipelineHeaderBadge.className = "badge badge-warning header-status-badge";
          } else if (hasFailed) {
            pipelineHeaderBadge.textContent = "FAILED";
            pipelineHeaderBadge.className = "badge badge-failed header-status-badge";
          } else if (allCompleted) {
            pipelineHeaderBadge.textContent = "COMPLETE";
            pipelineHeaderBadge.className = "badge badge-completed header-status-badge";
          } else {
            pipelineHeaderBadge.textContent = "IDLE";
            pipelineHeaderBadge.className = "badge badge-completed header-status-badge";
          }
        }

        // 2. Update Header Run/Stop Button (left of status indicator, matching height)
        if (headerRunStopBtn) {
          if (anyRunning) {
            headerRunStopBtn.setAttribute("data-running", "true");
            headerRunStopBtn.className = "header-run-stop-btn header-btn-stop";
            headerRunStopBtn.innerHTML = '<span class="btn-icon">' + (ICONS["stop"] || "") + '</span><span class="btn-text">Stop</span>';
            headerRunStopBtn.title = "Stop Pipeline Execution";
            headerRunStopBtn.removeAttribute("disabled");
          } else {
            headerRunStopBtn.setAttribute("data-running", "false");
            headerRunStopBtn.className = "header-run-stop-btn header-btn-run";
            headerRunStopBtn.innerHTML = '<span class="btn-icon">' + (ICONS["play"] || "") + '</span><span class="btn-text">Run</span>';
            headerRunStopBtn.title = "Run Pipeline Tasks";
            if (!wsPath || isMissingOrEmpty) {
              headerRunStopBtn.setAttribute("disabled", "true");
              headerRunStopBtn.title = "Initialize pipeline tasks to run";
            } else {
              headerRunStopBtn.removeAttribute("disabled");
            }
          }
        }

        // 3. Update Flexible Segmented Progress Bar (full width, color-coded per phase)
        if (pipelineProgressBarTrack) {
          let segHtml = "";
          if (state.phases && state.phases.length > 0) {
            for (let i = 0; i < state.phases.length; i++) {
              const p = state.phases[i];
              if (!p) continue;
              const rawStatus = (p.status || "pending").toLowerCase();
              const errText = String(p.error || p.summary || "").trim();
              const isContrastNeeded = /Section 3.?C|suggested contrast|unconfirmed.*contrast|target contrast/i.test(errText);
              const isConfounding = /confound|Proceed With Potential Batch Confounding|Authorize Unadjusted Exploratory Comparison/i.test(errText);
              const isAttentionNeeded = isContrastNeeded || isConfounding || /attention|action required|confirm.*proceed/i.test(errText) || rawStatus === "warning" || rawStatus === "needs_attention";

              let segClass = "segment-pending"; // filled grey for not yet run
              let statusLabel = "NOT RUN";

              if (rawStatus === "running") {
                segClass = "segment-running"; // animated blue for running
                statusLabel = "RUNNING";
              } else if (rawStatus === "completed" || rawStatus === "cached") {
                segClass = "segment-completed"; // green for completed
                statusLabel = "COMPLETED";
              } else if (isAttentionNeeded) {
                segClass = "segment-warning"; // orange for warning or needs user attention
                statusLabel = "NEEDS ATTENTION";
              } else if (rawStatus === "failed" || rawStatus === "error") {
                segClass = "segment-failed"; // red for error
                statusLabel = "ERROR";
              }

              let taskName = p.fileName || ("Task " + (i + 1));
              if (taskName.indexOf("/") !== -1) taskName = taskName.substring(taskName.lastIndexOf("/") + 1);
              if (taskName.indexOf(String.fromCharCode(92)) !== -1) {
                taskName = taskName.substring(taskName.lastIndexOf(String.fromCharCode(92)) + 1);
              }
              if (taskName.toLowerCase().endsWith(".md")) taskName = taskName.slice(0, -3);
              if (p.isMasterSetup && taskName === "INSTRUCT") taskName = "00_INSTALL";

              const durationInfo = (p.durationSeconds && p.durationSeconds > 0) ? (" \u2022 " + p.durationSeconds + "s") : "";
              const tooltip = escapeHtml(taskName + " [" + statusLabel + "]" + durationInfo);
              segHtml += '<div class="progress-segment ' + segClass + '" data-phase-id="' + escapeHtml(p.id) + '" title="' + tooltip + '"></div>';
            }
          }
          pipelineProgressBarTrack.innerHTML = segHtml;
        }

        if (pipelineIndicator) {
          pipelineIndicator.className = anyRunning ? "tab-indicator running" : "tab-indicator";
        }

        if (loadingPipelineContainer) {
          loadingPipelineContainer.style.display = "none";
        }

        if (!wsPath) {
          if (noFolderContainer) noFolderContainer.style.display = "block";
          if (initPipelineSection) initPipelineSection.style.display = "none";
          if (activePipelineDashboard) activePipelineDashboard.style.display = "none";
          syncRunTicker(false);
        } else if (isMissingOrEmpty) {
          if (noFolderContainer) noFolderContainer.style.display = "none";
          if (initPipelineSection) initPipelineSection.style.display = "block";
          if (activePipelineDashboard) activePipelineDashboard.style.display = "none";

          // Ensure init button is reset to default state if returning from an operation
          const initBtn = document.getElementById("initWorkspaceBtn");
          if (initBtn) {
            initBtn.removeAttribute("disabled");
            initBtn.innerHTML = '<span>' + (ICONS["sparkles"] || "") + '</span> Initialize Working Directory';
          }
          syncRunTicker(false);
        } else {
          if (noFolderContainer) noFolderContainer.style.display = "none";
          if (initPipelineSection) initPipelineSection.style.display = "none";
          if (activePipelineDashboard) activePipelineDashboard.style.display = "flex";

          if (startPipelineBtn) startPipelineBtn.style.display = "none";
          if (stopBtn) stopBtn.style.display = anyRunning ? "block" : "none";
          if (phaseCountLabel) phaseCountLabel.textContent = phaseCount + " Task" + (phaseCount === 1 ? "" : "s");

          // Render Dynamic Analysis Tasks (Tab 1)
          if (phaseContainer) {
            let phaseHtml = "";
            for (let i = 0; i < state.phases.length; i++) {
              const p = state.phases[i];
              if (!p) continue;
              const rawStatus = p.status || "pending";
              const checked = p.enabled !== false ? "checked" : "";

              let displayStatus = rawStatus.toUpperCase();
              let badgeClass = "badge badge-" + rawStatus;
              let cardClass = "task-card";
              let durationText = "----";

              if (rawStatus === "running") {
                displayStatus = "RUNNING";
                badgeClass = "badge badge-running";
                cardClass = "task-card running";
                if (p.startTime) {
                  const startMs = new Date(p.startTime).getTime();
                  const elapsedSec = !isNaN(startMs) ? Math.max(0, Math.round((Date.now() - startMs) / 1000)) : 0;
                  durationText = elapsedSec + "s";
                } else {
                  durationText = "0s";
                }
              } else if (rawStatus === "completed") {
                displayStatus = "COMPLETED";
                badgeClass = "badge badge-completed";
                durationText = (p.durationSeconds !== undefined && p.durationSeconds !== null && p.durationSeconds > 0)
                  ? p.durationSeconds + "sec"
                  : "ok";
              } else if (rawStatus === "failed") {
                displayStatus = "FAILED";
                badgeClass = "badge badge-failed";
                durationText = "err";
                cardClass += " task-card-failed";
              } else if (state.isFullPipelineRunning && anyRunning && p.enabled !== false && runningIndex !== -1 && i > runningIndex) {
                displayStatus = "QUEUED";
                badgeClass = "badge badge-queued";
                durationText = "wait";
              } else if (p.durationSeconds !== undefined && p.durationSeconds !== null && p.durationSeconds > 0) {
                durationText = p.durationSeconds + "sec";
              }
              durationText = padTimer(durationText);

              const rawFileName = p.fileName || "";
              let taskName = rawFileName;
              if (taskName.indexOf("/") !== -1) {
                taskName = taskName.substring(taskName.lastIndexOf("/") + 1);
              }
              if (taskName.indexOf(String.fromCharCode(92)) !== -1) {
                taskName = taskName.substring(taskName.lastIndexOf(String.fromCharCode(92)) + 1);
              }
              if (taskName.toLowerCase().endsWith(".md")) {
                taskName = taskName.slice(0, -3);
              }
              if (!taskName) {
                taskName = "TASK " + (i + 1);
              }
              if (p.isMasterSetup && taskName === "INSTRUCT") {
                taskName = "00_INSTALL";
              }

              const safeTaskName = escapeHtml(taskName);
              const safeFileName = escapeHtml(rawFileName);
              const runDisabled = anyRunning ? "disabled" : "";
              const runBtnTitle = anyRunning ? "Pipeline is currently executing" : ("Run " + safeTaskName);
              const startTimeAttr = (rawStatus === "running" && p.startTime) ? (' data-start-time="' + escapeHtml(p.startTime) + '"') : '';

              let failInsightHtml = "";
              if (rawStatus === "failed" && (p.error || p.summary)) {
                const errorText = String(p.error || p.summary || "").trim();
                const lines = errorText.split(String.fromCharCode(10)).map(function(l) { return l.trim(); }).filter(function(l) { return l.length > 0; });
                const firstLine = lines[0] || "Phase failed or halted.";
                const remainingLines = lines.slice(1).join(" ");
                const displayMsg = remainingLines ? (firstLine + " \u2014 " + remainingLines) : firstLine;
                const cleanMsg = displayMsg.replace(/^[\u274C\u26A0\uFE0F*# ]+/, "").trim();
                const shortMsg = cleanMsg.length > 250 ? cleanMsg.slice(0, 247) + "..." : cleanMsg;

                const hasExpDoc = /experiment.md/i.test(errorText);
                const hasNotesDoc = /notes.md/i.test(errorText);
                const isContrastNeeded = /Section 3.?C|suggested contrast|unconfirmed.*contrast|target contrast/i.test(errorText);
                const isConfounding = /confound|Proceed With Potential Batch Confounding|Authorize Unadjusted Exploratory Comparison/i.test(errorText);
                const isImputationNeeded = /imputation|Section 3.?E|Confirm Imputation Strategy|randomforest_grouped|min_column/i.test(errorText);
                const isLlmApiError = /LLM API Error|API error|fetch failed|network connection failed|ConnectTimeoutError|ENOTFOUND|ECONNREFUSED|ECONNRESET|authentication failed|rate limited|timed? ?out/i.test(errorText);

                let linksHtml = "";
                let insightTitle = "Action Required";
                let insightIcon = "\u26A0\uFE0F";

                if (isLlmApiError) {
                  insightTitle = "LLM API / Network Error";
                  insightIcon = "\u{1F310}";
                  linksHtml += '<button type="button" class="btn-insight-action-primary" data-action="runPhase" data-id="' + escapeHtml(p.id) + '" title="Retry running ' + safeTaskName + '">\u{1F504} Retry Phase</button>';
                  linksHtml += '<button type="button" class="btn-insight-link" data-action="openProviderTab" title="Configure LLM Provider, Model, or API Key">\u2699\uFE0F Settings \u2197</button>';
                  if (hasNotesDoc) {
                    linksHtml += '<button type="button" class="btn-insight-link" data-action="openFile" data-path="docs/notes.md">View docs/notes.md \u2197</button>';
                  }
                } else {
                  if (hasExpDoc) {
                    const searchPrompt = isImputationNeeded ? "Confirm Imputation Strategy" : (isContrastNeeded ? "3.C" : (isConfounding ? "Proceed With Potential Batch Confounding" : "REQUIRED"));
                    linksHtml += '<button type="button" class="btn-insight-link" data-action="openFile" data-path="docs/experiment.md" data-search="' + searchPrompt + '" title="Open docs/experiment.md and jump directly to relevant section">Edit docs/experiment.md \u2197</button>';
                  }
                  if (p.id === "03" || isImputationNeeded) {
                    linksHtml += '<button type="button" class="btn-insight-action-primary" data-action="confirmContrastAndProceed" data-phase-id="' + escapeHtml(p.id) + '" title="Confirm imputation strategy in Section 3.E and resume Phase 3">\u{1F3AF} Confirm Imputation &amp; Proceed</button>';
                  } else if (p.id === "04" && (isContrastNeeded || isConfounding)) {
                    linksHtml += '<button type="button" class="btn-insight-action-primary" data-action="confirmContrastAndProceed" data-phase-id="' + escapeHtml(p.id) + '" title="Confirm target contrast in Section 3.C, authorize batch confounding in Section 3.D, and resume Phase 4">\u{1F3AF} Confirm Contrast &amp; Proceed</button>';
                  } else if (isContrastNeeded) {
                    linksHtml += '<button type="button" class="btn-insight-action-primary" data-action="confirmContrastAndProceed" data-phase-id="' + escapeHtml(p.id) + '" title="Confirm target contrast and proceed">\u{1F3AF} Confirm Contrast &amp; Proceed</button>';
                  } else if (isConfounding) {
                    linksHtml += '<button type="button" class="btn-insight-action-primary" data-action="confirmContrastAndProceed" data-phase-id="' + escapeHtml(p.id) + '" title="Authorize batch confounding and proceed">\u{1F3AF} Confirm Contrast &amp; Proceed</button>';
                  }
                  if (hasNotesDoc) {
                    linksHtml += '<button type="button" class="btn-insight-link" data-action="openFile" data-path="docs/notes.md">View docs/notes.md \u2197</button>';
                  }
                  if (!isContrastNeeded && !isConfounding && !isImputationNeeded) {
                    linksHtml += '<button type="button" class="btn-insight-action-primary" data-action="openAgentTab" title="Ask Live Agent to resolve this question">\u{1F4AC} Ask Agent \u2197</button>';
                  }
                }

                failInsightHtml = '<div class="task-insight-box" title="' + escapeHtml(errorText) + '">' +
                  '<div class="task-insight-header">' +
                    '<span class="task-insight-icon">' + insightIcon + '</span>' +
                    '<span class="task-insight-title">' + insightTitle + '</span>' +
                  '</div>' +
                  '<div class="task-insight-body">' + escapeHtml(shortMsg) + '</div>' +
                  (linksHtml ? ('<div class="task-insight-actions">' + linksHtml + '</div>') : '') +
                '</div>';
              }

              const phaseDir = safeTaskName.toLowerCase().replace(/[^a-z0-9_]/g, "_");
              const hasRun = rawStatus === "completed" || rawStatus === "failed" || rawStatus === "running";
              const logBtnClass = hasRun ? "task-action-icon-btn has-run" : "task-action-icon-btn";
              const chatIconHtml = '<button type="button" class="' + logBtnClass + '" data-action="openFile" data-path="logs/' + phaseDir + '/chat.md" title="Open chat trace (logs/' + phaseDir + '/chat.md)">' + (ICONS["chat"] || ICONS["chate"] || "") + '</button>';
              const termIconHtml = '<button type="button" class="' + logBtnClass + '" data-action="openFile" data-path="logs/' + phaseDir + '/console.log" title="Open console output (logs/' + phaseDir + '/console.log)">' + (ICONS["terminal"] || "") + '</button>';
              const iconLinksHtml = '<span class="task-action-icons">' + chatIconHtml + termIconHtml + '</span>';

              phaseHtml += '<div class="' + cardClass + '"' + startTimeAttr + '>' +
                '<div class="task-main-row">' +
                  '<div class="task-left">' +
                    '<input type="checkbox" ' + checked + ' data-phase-id="' + escapeHtml(p.id) + '" title="Include in pipeline" ' + (anyRunning ? "disabled" : "") + ' />' +
                    '<span class="task-name" data-action="openPhase" data-file="' + safeFileName + '" title="Click to edit ' + safeFileName + ' in VS Code">' + safeTaskName + '</span>' +
                  '</div>' +
                  '<div class="task-right">' +
                    '<span class="' + badgeClass + '">' + escapeHtml(displayStatus) + '</span>' +
                    iconLinksHtml +
                    '<span class="task-duration">' + escapeHtml(durationText) + '</span>' +
                  '</div>' +
                '</div>' +
                failInsightHtml +
              '</div>';
            }
            phaseContainer.innerHTML = phaseHtml;
            syncRunTicker(anyRunning);
          }
        }

        // Render Memory & Protocol Files (Tab 2)
        if (state.promptFiles) {
          let globalHtml = "";
          let bbHtml = "";
          let logsHtml = "";

          for (const pf of state.promptFiles) {
            if (!pf) continue;
            const badgeClass = pf.exists ? "badge badge-completed" : "badge badge-pending";
            const badgeText = pf.exists ? "OPEN" : "CREATE";
            const safeName = escapeHtml(pf.name || "");
            const safeRelPath = escapeHtml(pf.relPath || "");

            const card = '<div class="file-card" data-action="openFile" data-path="' + safeRelPath + '" title="Click to open ' + safeRelPath + ' in VS Code">' +
              '<div>' +
                '<div class="file-title">' + safeName + '</div>' +
                '<div class="file-path">' + safeRelPath + '</div>' +
              '</div>' +
              '<span class="' + badgeClass + '">' + badgeText + '</span>' +
            '</div>';

            if (pf.relPath && (pf.relPath.startsWith("agent/") || pf.relPath.startsWith("prompts/"))) {
              globalHtml += card;
            } else if (pf.relPath && pf.relPath.startsWith("docs/")) {
              bbHtml += card;
            } else if (pf.relPath && pf.relPath.startsWith("logs/")) {
              logsHtml += card;
            }
          }

          if (globalFrameContainer) globalFrameContainer.innerHTML = globalHtml || '<div style="color:var(--muted); font-size:10px;">None</div>';
          if (blackboardContainer) blackboardContainer.innerHTML = bbHtml || '<div style="color:var(--muted); font-size:10px;">None</div>';
          if (logsContainer) logsContainer.innerHTML = logsHtml || '<div style="color:var(--muted); font-size:10px;">None</div>';
        }

        // Render Folder Status (Tab 4)
        if (foldersListContainer && state.folders) {
          let fHtml = "";
          for (const f of state.folders) {
            const badgeClass = f.exists ? "badge badge-completed" : "badge badge-pending";
            const badgeText = f.exists ? (f.itemCount !== undefined ? f.itemCount + " FILES" : "FOUND") : "MISSING";
            fHtml += '<div class="folder-card">' +
              '<div>' +
                '<div class="folder-name">' + escapeHtml(f.relPath) + '/</div>' +
                '<div class="folder-desc">' + escapeHtml(f.description) + '</div>' +
              '</div>' +
              '<span class="' + badgeClass + '">' + badgeText + '</span>' +
            '</div>';
          }
          foldersListContainer.innerHTML = fHtml;
        }

      } catch (renderErr) {
        console.error("[TidyProteomicsAgent] Error rendering webview state:", renderErr);
      }
    }

    function appendLog(text, updateLast) {
      if (terminalLog && text) {
        if (updateLast) {
          const lines = terminalLog.textContent.split("\\n");
          let targetIndex = lines.length - 1;
          while (targetIndex > 0 && lines[targetIndex].trim() === "") {
            targetIndex--;
          }
          if (targetIndex >= 0) {
            lines[targetIndex] = String(text);
            terminalLog.textContent = lines.join("\\n");
          } else {
            terminalLog.textContent = String(text);
          }
        } else {
          terminalLog.textContent += "\\n" + String(text);
        }
        terminalLog.scrollTop = terminalLog.scrollHeight;
      }
    }

    // ==========================================
    // Live Agent Chat Client Implementation
    // ==========================================
    const agentThread = document.getElementById("agentThread") || document.getElementById("advisorThread");
    const agentInput = document.getElementById("agentInput") || document.getElementById("advisorInput");
    const agentSendBtn = document.getElementById("agentSendBtn") || document.getElementById("advisorSendBtn");
    const agentStopBtn = document.getElementById("agentStopBtn") || document.getElementById("advisorStopBtn");
    const agentClearBtn = document.getElementById("agentClearBtn") || document.getElementById("advisorClearBtn");
    const chatIndicator = document.getElementById("chatIndicator");

    const advisorThread = agentThread;
    const advisorInput = agentInput;
    const advisorSendBtn = agentSendBtn;
    const advisorStopBtn = agentStopBtn;
    const advisorClearBtn = agentClearBtn;

    let isAgentGenerating = false;
    let currentStreamingMsgElement = null;
    let accumulatedStreamingText = "";

    function formatAgentMarkdown(text) {
      if (!text) return "";
      let escaped = escapeHtml(text);
      const BT = String.fromCharCode(96);
      const BT3 = BT + BT + BT;

      // Code blocks
      escaped = escaped.replace(new RegExp(BT3 + "([a-zA-Z0-9_-]*)\\n([\\s\\S]*?)" + BT3, "g"), function (match, lang, code) {
        return '<pre><code>' + code + '</code></pre>';
      });

      // Inline code
      escaped = escaped.replace(new RegExp(BT + "([^" + BT + "\\n]+)" + BT, "g"), '<code>$1</code>');

      // Bold
      escaped = escaped.replace(/\\*\\*([^*]+)\\*\\*/g, '<strong>$1</strong>');

      // Convert file links or mentions to clickable buttons
      escaped = escaped.replace(/\\b(docs\\/(?:experiment|notes|llm|literature_database|manuscript|scientific_report)\\.md)\\b/g, function (match, p1) {
        const targetPath = p1 === "docs/scientific_report.md" ? "docs/manuscript.md" : p1;
        return '<button type="button" class="btn-insight-link" data-action="openFile" data-path="' + targetPath + '" style="font-size:10px; padding:1px 5px; margin:0 2px;">' + p1 + ' \u2197</button>';
      });

      // Convert newlines (outside of pre)
      const parts = escaped.split(/(<pre>[\\s\\S]*?<\\/pre>)/g);
      for (let i = 0; i < parts.length; i++) {
        if (!parts[i].startsWith('<pre>')) {
          parts[i] = parts[i].split(String.fromCharCode(10)).join('<br>');
        }
      }
      return parts.join('');
    }
    const formatAdvisorMarkdown = formatAgentMarkdown;

    function scrollAgentToBottom() {
      if (agentThread) {
        agentThread.scrollTop = agentThread.scrollHeight;
      }
    }
    const scrollAdvisorToBottom = scrollAgentToBottom;

    function setAgentGenerating(generating) {
      isAgentGenerating = !!generating;
      if (agentSendBtn) agentSendBtn.style.display = isAgentGenerating ? "none" : "inline-flex";
      if (agentStopBtn) agentStopBtn.style.display = isAgentGenerating ? "inline-flex" : "none";
      if (chatIndicator) chatIndicator.className = isAgentGenerating ? "tab-indicator running" : "tab-indicator";
      const dot = document.getElementById("agentStatusDot");
      if (dot) dot.className = isAgentGenerating ? "agent-status-dot active" : "agent-status-dot";
      const badge = document.getElementById("agentStatusBadge");
      if (badge) {
        badge.textContent = isAgentGenerating ? "ANALYZING" : "READY";
        badge.style.background = isAgentGenerating ? "rgba(59,130,246,0.25)" : "rgba(16,185,129,0.15)";
        badge.style.color = isAgentGenerating ? "var(--primary)" : "var(--success)";
      }
    }
    const setAdvisorGenerating = setAgentGenerating;

    function renderAgentState(messages, isGenerating) {
      setAgentGenerating(isGenerating);
      if (!agentThread) return;

      if (!messages || messages.length === 0) {
        agentThread.innerHTML = '<div class="agent-msg advisor-msg assistant">' +
          '<div class="agent-avatar advisor-avatar">' + (ICONS["robot"] || "\u{1F916}") + '</div>' +
          '<div class="agent-bubble advisor-bubble">' +
            '<div class="agent-msg-title advisor-msg-title">TidyProteomics Live Agent</div>' +
            '<div class="agent-msg-body advisor-msg-body">' +
              'Hello! I am your live proteomics agent. I configure your study design in <code>docs/experiment.md</code> and execute the 12-phase pipeline autonomously.<br><br>' +
              'Feel free to describe your dataset in your own words, ask questions about sample grouping, normalizations, differential expression, or review ongoing observations.' +
            '</div>' +
          '</div>' +
        '</div>';
        return;
      }

      let html = "";
      for (let i = 0; i < messages.length; i++) {
        const m = messages[i];
        const isUser = m.role === "user";
        const avatar = isUser ? "\u{1F464}" : (ICONS["robot"] || "\u{1F916}");
        const sender = isUser ? "You" : "TidyProteomics Agent";
        const time = m.timestamp ? ' <span style="font-size:8.5px; opacity:0.6; font-weight:normal;">' + escapeHtml(m.timestamp) + '</span>' : '';
        const body = formatAgentMarkdown(m.content);

        let chipsHtml = "";
        if (m.quickChips && m.quickChips.length > 0) {
          chipsHtml = '<div class="agent-msg-chips advisor-msg-chips">';
          for (let c = 0; c < m.quickChips.length; c++) {
            const chipText = escapeHtml(m.quickChips[c]);
            chipsHtml += '<button type="button" class="agent-msg-chip advisor-msg-chip" data-chip="' + chipText + '">' + chipText + '</button>';
          }
          chipsHtml += '</div>';
        }

        if (m.type === "activity") {
          const phaseLabel = m.phaseTitle ? escapeHtml(m.phaseTitle) : "Pipeline Activity";
          html += '<div class="agent-msg activity-msg activity">' +
            '<div class="agent-avatar activity-avatar"><span class="activity-spinner"></span></div>' +
            '<div class="agent-bubble activity-bubble">' +
              '<div class="agent-msg-title activity-title">' +
                '<span style="color:var(--primary); font-weight:600;">\u25B6 ' + phaseLabel + '</span>' +
                '<span class="activity-badge">' + escapeHtml(m.badge || "Live") + '</span>' +
              '</div>' +
              '<div class="agent-msg-body activity-body">' + body + '</div>' +
            '</div>' +
          '</div>';
        } else if (m.type === "observation") {
          const phaseLabel = m.phaseTitle ? escapeHtml(m.phaseTitle) : "Scientific Observation";
          const badgeLabel = escapeHtml(m.badge || "Observation");
          html += '<div class="agent-msg observation-msg observation">' +
            '<div class="agent-avatar obs-avatar">' + (ICONS["sparkles"] || "\u{1F52C}") + '</div>' +
            '<div class="agent-bubble obs-bubble">' +
              '<div class="agent-msg-title obs-title">' +
                '<span style="color:#c084fc; font-weight:600;">' + phaseLabel + '</span>' +
                '<span class="obs-badge">' + badgeLabel + '</span>' +
              '</div>' +
              '<div class="agent-msg-body obs-body">' + body + '</div>' +
              chipsHtml +
            '</div>' +
          '</div>';
        } else if (m.type === "milestone") {
          html += '<div class="agent-msg milestone-msg milestone">' +
            '<div class="agent-avatar done-avatar" style="color:var(--success);">\u2713</div>' +
            '<div class="agent-bubble done-bubble">' +
              '<div class="agent-msg-title" style="color:var(--success); font-weight:600;">' +
                '<span>' + escapeHtml(m.phaseTitle || "Phase Milestone") + time + '</span>' +
                '<span class="badge" style="background:rgba(16,185,129,0.15); color:var(--success); font-size:8.5px;">DONE</span>' +
              '</div>' +
              '<div class="agent-msg-body">' + body + '</div>' +
              chipsHtml +
            '</div>' +
          '</div>';
        } else {
          html += '<div class="agent-msg advisor-msg ' + (isUser ? 'user' : 'assistant') + '">' +
            '<div class="agent-avatar advisor-avatar">' + avatar + '</div>' +
            '<div class="agent-bubble advisor-bubble">' +
              '<div class="agent-msg-title advisor-msg-title">' + sender + time + '</div>' +
              '<div class="agent-msg-body advisor-msg-body">' + body + '</div>' +
              chipsHtml +
            '</div>' +
          '</div>';
        }
      }
      agentThread.innerHTML = html;
      scrollAgentToBottom();
    }
    const renderAdvisorState = renderAgentState;

    function appendAgentChunk(chunk) {
      if (!agentThread) return;
      accumulatedStreamingText += chunk;

      if (!currentStreamingMsgElement) {
        const msgDiv = document.createElement("div");
        msgDiv.className = "agent-msg advisor-msg assistant";
        msgDiv.innerHTML = '<div class="agent-avatar advisor-avatar">' + (ICONS["robot"] || "\u{1F916}") + '</div>' +
          '<div class="agent-bubble advisor-bubble">' +
            '<div class="agent-msg-title advisor-msg-title">TidyProteomics Agent <span style="font-size:8.5px; opacity:0.6; font-weight:normal;">Thinking...</span></div>' +
            '<div class="agent-msg-body advisor-msg-body"></div>' +
          '</div>';
        agentThread.appendChild(msgDiv);
        currentStreamingMsgElement = msgDiv;
      }

      const bodyEl = currentStreamingMsgElement.querySelector(".agent-msg-body, .advisor-msg-body");
      if (bodyEl) {
        bodyEl.innerHTML = formatAgentMarkdown(accumulatedStreamingText) + '<span class="agent-streaming-cursor advisor-streaming-cursor"></span>';
      }
      scrollAgentToBottom();
    }
    const appendAdvisorChunk = appendAgentChunk;

    function completeAgentResponse(fullText, usage, messages) {
      currentStreamingMsgElement = null;
      accumulatedStreamingText = "";
      setAgentGenerating(false);
      if (messages && messages.length > 0) {
        renderAgentState(messages, false);
      }
    }
    const completeAdvisorResponse = completeAgentResponse;

    function showAgentError(error) {
      currentStreamingMsgElement = null;
      accumulatedStreamingText = "";
      setAgentGenerating(false);
      if (!agentThread) return;
      const errDiv = document.createElement("div");
      errDiv.className = "agent-msg advisor-msg assistant";
      errDiv.innerHTML = '<div class="agent-avatar advisor-avatar">\u26A0\uFE0F</div>' +
        '<div class="agent-bubble advisor-bubble" style="border-color:var(--error); background:rgba(239, 68, 68, 0.1);">' +
          '<div class="agent-msg-title advisor-msg-title" style="color:var(--error);">Agent Error</div>' +
          '<div class="agent-msg-body advisor-msg-body">' + escapeHtml(error) + '</div>' +
        '</div>';
      agentThread.appendChild(errDiv);
      scrollAgentToBottom();
    }
    const showAdvisorError = showAgentError;

    function sendAgentPrompt(text) {
      const prompt = (text || (agentInput ? agentInput.value : "")).trim();
      if (!prompt || isAgentGenerating) return;

      if (agentInput) {
        agentInput.value = "";
        agentInput.style.height = "auto";
      }

      setAgentGenerating(true);
      accumulatedStreamingText = "";
      currentStreamingMsgElement = null;

      // Optimistically append user message
      if (agentThread) {
        const userDiv = document.createElement("div");
        userDiv.className = "agent-msg advisor-msg user";
        userDiv.innerHTML = '<div class="agent-avatar advisor-avatar">\u{1F464}</div>' +
          '<div class="agent-bubble advisor-bubble">' +
            '<div class="agent-msg-title advisor-msg-title">You</div>' +
            '<div class="agent-msg-body advisor-msg-body">' + formatAgentMarkdown(prompt) + '</div>' +
          '</div>';
        agentThread.appendChild(userDiv);
        scrollAgentToBottom();
      }

      vscode.postMessage({ type: "agentSendMessage", text: prompt });
    }
    const sendAdvisorPrompt = sendAgentPrompt;

    if (agentSendBtn) {
      agentSendBtn.addEventListener("click", function () {
        sendAgentPrompt();
      });
    }

    if (agentStopBtn) {
      agentStopBtn.addEventListener("click", function () {
        vscode.postMessage({ type: "agentStop" });
        setAgentGenerating(false);
      });
    }

    if (agentClearBtn) {
      agentClearBtn.addEventListener("click", function () {
        vscode.postMessage({ type: "agentClear" });
      });
    }

    if (agentInput) {
      agentInput.addEventListener("input", function () {
        this.style.height = "auto";
        this.style.height = Math.min(this.scrollHeight, 120) + "px";
      });

      agentInput.addEventListener("keydown", function (e) {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          sendAgentPrompt();
        }
      });
    }

    // Quick suggestion chips and message chips handler
    document.addEventListener("click", function (e) {
      const chip = e.target.closest ? (e.target.closest(".agent-chip") || e.target.closest(".advisor-chip")) : null;
      if (chip) {
        const prompt = chip.getAttribute("data-prompt");
        if (prompt) {
          sendAgentPrompt(prompt);
        }
        return;
      }

      const msgChip = e.target.closest ? (e.target.closest(".agent-msg-chip") || e.target.closest(".advisor-msg-chip")) : null;
      if (msgChip) {
        const chipText = msgChip.getAttribute("data-chip");
        if (chipText === "Select File...") {
          vscode.postMessage({ type: "agentPickDataFile" });
        } else if (chipText === "Review docs/experiment.md \u2197" || chipText === "View docs/experiment.md \u2197") {
          vscode.postMessage({ type: "openFile", relPath: "docs/experiment.md" });
        } else if (
          chipText === "Review docs/manuscript.md \u2197" ||
          chipText === "View docs/manuscript.md \u2197" ||
          chipText === "Review docs/scientific_report.md \u2197" ||
          chipText === "View docs/scientific_report.md \u2197"
        ) {
          vscode.postMessage({ type: "openFile", relPath: "docs/manuscript.md" });
        } else if (chipText === "Switch to Provider Tab \u2197") {
          switchTab("provider");
        } else if (chipText === "[Custom Contrast...]" || chipText === "Custom Contrast...") {
          sendAgentPrompt(chipText);
          if (agentInput) {
            agentInput.focus();
            agentInput.placeholder = "Enter custom ratio (e.g. knockout / control)...";
          }
        } else if (chipText) {
          sendAgentPrompt(chipText);
        }
        return;
      }
    });

    // Visual Contrast & Batch Designer Logic
    function fetchDesignerState() {
      vscode.postMessage({ type: "getDesignerState" });
    }
    window.fetchDesignerState = fetchDesignerState;

    function renderDesignerState(spec) {
      if (!spec) return;
      const dl = document.getElementById("designerGroupList");
      if (dl && Array.isArray(spec.discoveredGroups)) {
        dl.innerHTML = spec.discoveredGroups.map(function (g) {
          return '<option value="' + g + '"></option>';
        }).join("");
      }
      const treatmentIn = document.getElementById("designerTreatmentInput");
      const controlIn = document.getElementById("designerControlInput");
      if (spec.targetContrasts && spec.targetContrasts.length > 0 && treatmentIn && controlIn) {
        var rawContrast = spec.targetContrasts[0].replace(/['"]/g, "").split(String.fromCharCode(96)).join("");
        var sep = rawContrast.indexOf("/") !== -1 ? "/" : (rawContrast.toLowerCase().indexOf(" vs") !== -1 ? (rawContrast.toLowerCase().indexOf(" vs.") !== -1 ? "vs." : "vs") : "/");
        var parts = rawContrast.split(sep).map(function (s) { return s.trim(); });
        if (parts.length >= 2 && !treatmentIn.value && !controlIn.value) {
          treatmentIn.value = parts[0];
          controlIn.value = parts[1];
        }
      }
      const confCheck = document.getElementById("designerConfoundingCheck");
      if (confCheck && typeof spec.batchConfoundingAuthorized === "boolean") {
        confCheck.checked = spec.batchConfoundingAuthorized;
      }
      const badge = document.getElementById("designerStatusBadge");
      if (badge && spec.contrastConfirmed) {
        badge.textContent = "CONFIRMED";
        badge.style.background = "var(--success)";
      }
    }

    function applyContrastFromDesigner() {
      const treatmentIn = document.getElementById("designerTreatmentInput");
      const controlIn = document.getElementById("designerControlInput");
      const confCheck = document.getElementById("designerConfoundingCheck");
      const poolCheck = document.getElementById("designerPoolingCheck");

      const treatment = treatmentIn ? treatmentIn.value.trim() : "";
      const control = controlIn ? controlIn.value.trim() : "";
      const allowConfounding = confCheck ? confCheck.checked : false;
      const reassignPooling = poolCheck ? poolCheck.checked : true;

      if (!treatment || !control) {
        alert("Please specify both a target condition and a reference/control group.");
        return;
      }

      vscode.postMessage({
        type: "applyContrastDesigner",
        treatment: treatment,
        control: control,
        allowConfounding: allowConfounding,
        reassignPooling: reassignPooling,
        phaseId: "04"
      });
    }
    window.applyContrastFromDesigner = applyContrastFromDesigner;

    function toggleContrastDesigner() {
      const card = document.getElementById("contrastDesignerCard");
      const btn = document.getElementById("toggleDesignerBtn");
      if (!card) return;
      const isHidden = card.style.display === "none" || card.classList.contains("collapsed");
      if (isHidden) {
        card.style.display = "block";
        card.classList.remove("collapsed");
        if (btn) btn.classList.add("active");
        fetchDesignerState();
      } else {
        card.style.display = "none";
        card.classList.add("collapsed");
        if (btn) btn.classList.remove("active");
      }
    }
    window.toggleContrastDesigner = toggleContrastDesigner;

    // Message receiver
    window.addEventListener("message", function (event) {
      try {
        const message = event.data;
        if (!message) return;
        if (message.type === "engineUpdate") {
          const eng = message.engine;
          if (eng) {
            const engEl = document.getElementById("summaryEngine");
            if (engEl) engEl.textContent = eng.toUpperCase();
            const engSel = document.getElementById("engineSelect");
            if (engSel) engSel.value = eng;
          }
        } else if (message.type === "stateUpdate") {
          renderState(message.state);
        } else if (message.type === "log") {
          appendLog(message.text, message.updateLast);
        } else if (message.type === "literatureState" || message.type === "corpusState") {
          renderLiteratureState(message.state);
        } else if (message.type === "literatureStats" || message.type === "corpusStats") {
          const stats = message.stats || (message.result && (message.result.stats || (message.result.data && (message.result.data.stats || message.result.data.totals))));
          if (stats) {
            renderLiteratureStats(stats);
          }
        } else if (message.type === "literatureSearchResult" || message.type === "corpusSearchResult") {
          renderLiteratureSearchResults(message.result || message);
        } else if (message.type === "literatureProgress" || message.type === "corpusProgress") {
          vscode.postMessage({ type: "literatureGetState" });
        } else if (message.type === "agentState" || message.type === "advisorState") {
          renderAgentState(message.messages, message.isGenerating);
        } else if (message.type === "agentChunk" || message.type === "advisorChunk") {
          appendAgentChunk(message.chunk);
        } else if (message.type === "agentDone" || message.type === "advisorDone") {
          completeAgentResponse(message.reply, message.usage, message.messages);
        } else if (message.type === "agentError" || message.type === "advisorError") {
          showAgentError(message.error);
        } else if (message.type === "designerState") {
          renderDesignerState(message.spec);
        }
      } catch (err) {
        console.error("[TidyProteomicsAgent] Error in webview message handler:", err);
      }
    });

    // Request initial state proactively
    vscode.postMessage({ type: "requestState" });
    vscode.postMessage({ type: "agentGetState" });
    setTimeout(function () {
      vscode.postMessage({ type: "requestState" });
      vscode.postMessage({ type: "agentGetState" });
    }, 200);
  </script>
</body>
</html>`;
  }
};

// src/extension.ts
function activate(context) {
  console.log("TidyProteomicsAgent extension is now active!");
  const outputChannel = vscode5.window.createOutputChannel("TidyProteomicsAgent");
  context.subscriptions.push(outputChannel);
  const uncaughtHandler = (err) => {
    const msg = err?.stack || String(err);
    if (typeof msg === "string" && (msg.includes("Missing dataLength in event") || msg.includes("strict mode functions"))) {
      return;
    }
    outputChannel.appendLine(`[UNCAUGHT EXCEPTION] ${msg}`);
    console.error("[TidyProteomicsAgent UNCAUGHT EXCEPTION]", err);
  };
  const rejectionHandler = (reason) => {
    const msg = reason?.stack || String(reason);
    if (typeof msg === "string" && (msg.includes("Missing dataLength in event") || msg.includes("strict mode functions"))) {
      return;
    }
    outputChannel.appendLine(`[UNHANDLED REJECTION] ${msg}`);
    console.error("[TidyProteomicsAgent UNHANDLED REJECTION]", reason);
  };
  process.on("uncaughtException", uncaughtHandler);
  process.on("unhandledRejection", rejectionHandler);
  context.subscriptions.push({
    dispose: () => {
      process.removeListener("uncaughtException", uncaughtHandler);
      process.removeListener("unhandledRejection", rejectionHandler);
    }
  });
  const sidebarProvider = new SidebarViewProvider(context.extensionUri, context);
  context.subscriptions.push(
    vscode5.window.registerWebviewViewProvider(
      SidebarViewProvider.viewType,
      sidebarProvider
    )
  );
  let watchers = [];
  const updateWatchers = (customFolder) => {
    for (const w of watchers) {
      try {
        w.dispose();
      } catch (_) {
      }
    }
    watchers = [];
    const targetFolders = [];
    if (customFolder) {
      targetFolders.push(vscode5.Uri.file(customFolder));
    } else {
      const folders = vscode5.workspace.workspaceFolders;
      if (folders && folders.length > 0) {
        targetFolders.push(...folders);
      }
    }
    if (targetFolders.length === 0) {
      return;
    }
    for (const folder of targetFolders) {
      try {
        const folderPath = folder.fsPath || folder.uri?.fsPath || "";
        if (!folderPath || !fs12.existsSync(folderPath)) {
          continue;
        }
        const folderUri = folder.uri || vscode5.Uri.file(folderPath);
        const analysisWatcher = vscode5.workspace.createFileSystemWatcher(
          new vscode5.RelativePattern(folderUri, "analysis/*.md")
        );
        analysisWatcher.onDidCreate(() => sidebarProvider.refreshPhases().catch(() => {
        }));
        analysisWatcher.onDidChange(() => sidebarProvider.refreshPhases().catch(() => {
        }));
        analysisWatcher.onDidDelete(() => {
          sidebarProvider.forceReload().catch(() => {
          });
          sidebarProvider.refreshPhases().catch(() => {
          });
        });
        watchers.push(analysisWatcher);
        const agentWatcher = vscode5.workspace.createFileSystemWatcher(
          new vscode5.RelativePattern(folderUri, "agent/*.md")
        );
        agentWatcher.onDidCreate(() => sidebarProvider.refreshPhases().catch(() => {
        }));
        agentWatcher.onDidChange(() => sidebarProvider.refreshPhases().catch(() => {
        }));
        agentWatcher.onDidDelete(() => sidebarProvider.refreshPhases().catch(() => {
        }));
        watchers.push(agentWatcher);
        const promptsWatcher = vscode5.workspace.createFileSystemWatcher(
          new vscode5.RelativePattern(folderUri, "prompts/*.md")
        );
        promptsWatcher.onDidCreate(() => sidebarProvider.refreshPhases().catch(() => {
        }));
        promptsWatcher.onDidChange(() => sidebarProvider.refreshPhases().catch(() => {
        }));
        promptsWatcher.onDidDelete(() => sidebarProvider.refreshPhases().catch(() => {
        }));
        watchers.push(promptsWatcher);
        const notesWatcher = vscode5.workspace.createFileSystemWatcher(
          new vscode5.RelativePattern(folderUri, "docs/notes.md")
        );
        notesWatcher.onDidCreate(() => sidebarProvider.forceReload().catch(() => {
        }));
        notesWatcher.onDidChange(() => sidebarProvider.forceReload().catch(() => {
        }));
        notesWatcher.onDidDelete(() => sidebarProvider.forceReload().catch(() => {
        }));
        watchers.push(notesWatcher);
      } catch (e) {
        const folderPath = folder.fsPath || folder.uri?.fsPath || "";
        console.error("[TidyProteomicsAgent] Failed to initialize file watchers for folder:", folderPath, e);
      }
    }
  };
  sidebarProvider.onFolderChangedCallback = (folderPath) => {
    updateWatchers(folderPath);
  };
  updateWatchers();
  context.subscriptions.push(
    vscode5.workspace.onDidChangeWorkspaceFolders(() => {
      updateWatchers();
      sidebarProvider.onWorkspaceChanged().catch(() => {
      });
    })
  );
  context.subscriptions.push({
    dispose: () => {
      for (const w of watchers) {
        try {
          w.dispose();
        } catch (_) {
        }
      }
      watchers = [];
    }
  });
  context.subscriptions.push(
    vscode5.commands.registerCommand("tidyproteomicsagent.startPipeline", () => {
      sidebarProvider.startPipeline();
    })
  );
  context.subscriptions.push(
    vscode5.commands.registerCommand("tidyproteomicsagent.runCurrentPhase", () => {
      sidebarProvider.runSelectedPhase().catch((err) => {
        vscode5.window.showErrorMessage(`TidyProteomicsAgent: ${err.message || String(err)}`);
      });
    })
  );
  context.subscriptions.push(
    vscode5.commands.registerCommand("tidyproteomicsagent.refreshTasks", () => {
      sidebarProvider.forceReload();
    })
  );
  context.subscriptions.push(
    vscode5.commands.registerCommand("tidyproteomicsagent.resetState", async () => {
      const confirm = await vscode5.window.showWarningMessage(
        "Are you sure you want to reset the pipeline state in docs/notes.md?",
        { modal: true },
        "Yes",
        "Cancel"
      );
      if (confirm === "Yes") {
        await sidebarProvider.resetAllState();
        vscode5.window.showInformationMessage("TidyProteomicsAgent: Pipeline state reset.");
      }
    })
  );
  context.subscriptions.push(
    vscode5.commands.registerCommand("tidyproteomicsagent.initWorkspace", async () => {
      await sidebarProvider.promptInitWorkspace();
    })
  );
  context.subscriptions.push(
    vscode5.commands.registerCommand("tidyproteomicsagent.toggleEngine", async () => {
      await sidebarProvider.toggleEngine();
    })
  );
  context.subscriptions.push({
    dispose: () => {
      sidebarProvider.dispose().catch(() => {
      });
    }
  });
}
function deactivate() {
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  activate,
  deactivate
});
//# sourceMappingURL=extension.js.map
