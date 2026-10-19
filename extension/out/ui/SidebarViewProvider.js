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
exports.SidebarViewProvider = void 0;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const PipelineOrchestrator_1 = require("../orchestrator/PipelineOrchestrator");
const ModelSummaryWriter_1 = require("../orchestrator/ModelSummaryWriter");
const ProviderClient_1 = require("../llm/ProviderClient");
const ToolRegistry_1 = require("../tools/ToolRegistry");
class SidebarViewProvider {
    _extensionUri;
    context;
    static viewType = "tidyproteomicsagent.sidebarView";
    _view;
    orchestrator;
    client;
    tools;
    workspaceRoot;
    customWorkspaceRoot;
    onFolderChangedCallback;
    constructor(_extensionUri, context) {
        this._extensionUri = _extensionUri;
        this.context = context;
        this.workspaceRoot = this.getActiveWorkspaceRoot();
        // Read stored config with preference to workspace configuration & SecretStorage
        const wsConfig = vscode.workspace.getConfiguration("tidyproteomicsagent");
        const savedBaseUrl = wsConfig.get("baseUrl") || context.globalState.get("tidyproteomicsagent.baseUrl") || "";
        const savedProvider = (wsConfig.get("provider") || context.globalState.get("tidyproteomicsagent.provider") || "anthropic");
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
            timeoutSeconds: savedTimeoutSeconds,
        };
        this.client = new ProviderClient_1.ProviderClient(config);
        // Asynchronously retrieve secure API key from SecretStorage
        context.secrets.get("tidyproteomicsagent.apiKey").then((secretKey) => {
            if (secretKey) {
                this.client.updateConfig({ apiKey: secretKey });
                this.syncActiveModelSummary().catch(() => { });
                this.refreshState().catch(() => { });
            }
        }, (err) => {
            console.warn("[SidebarViewProvider] Could not load API key from secrets:", err);
        });
        this.tools = new ToolRegistry_1.ToolRegistry(this.workspaceRoot);
        this.orchestrator = new PipelineOrchestrator_1.PipelineOrchestrator(this.workspaceRoot, this.client, this.tools, (state) => this.sendStateUpdate(state), (log) => this.sendLog(log), this.getExtensionVersion());
        this.syncActiveModelSummary().catch(() => { });
        // Watch for VS Code settings changes
        context.subscriptions.push(vscode.workspace.onDidChangeConfiguration(async (e) => {
            if (e.affectsConfiguration("tidyproteomicsagent")) {
                const cfg = vscode.workspace.getConfiguration("tidyproteomicsagent");
                const updatedProv = cfg.get("provider");
                this.client.updateConfig({
                    ...(updatedProv ? { provider: updatedProv } : {}),
                    model: cfg.get("model"),
                    baseUrl: cfg.get("baseUrl"),
                    maxTokens: cfg.get("maxTokens"),
                    timeoutSeconds: cfg.get("timeoutSeconds"),
                });
                await this.syncActiveModelSummary();
                this.refreshState().catch(() => { });
            }
        }));
    }
    getExtensionVersion() {
        try {
            if (this.context.extension?.packageJSON?.version) {
                return this.context.extension.packageJSON.version;
            }
            const pkgPath = path.join(this._extensionUri.fsPath, "package.json");
            if (fs.existsSync(pkgPath)) {
                const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
                if (pkg.version)
                    return pkg.version;
            }
        }
        catch (_) { }
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
            await (0, ModelSummaryWriter_1.writeActiveModelSummaryFile)(this.workspaceRoot, this.client.getConfig(), version);
        }
        catch (err) {
            console.error("[SidebarViewProvider] Error syncing active model summary:", err);
        }
    }
    setCustomWorkspaceRoot(folderPath) {
        this.customWorkspaceRoot = folderPath;
        this.workspaceRoot = folderPath;
    }
    getActiveWorkspaceRoot() {
        if (this.customWorkspaceRoot && fs.existsSync(this.customWorkspaceRoot)) {
            return this.customWorkspaceRoot;
        }
        const folders = vscode.workspace.workspaceFolders;
        if (folders && folders.length > 0) {
            const activeDoc = vscode.window.activeTextEditor?.document;
            if (activeDoc && activeDoc.uri.scheme === "file") {
                const matchingFolder = vscode.workspace.getWorkspaceFolder(activeDoc.uri);
                if (matchingFolder) {
                    const fsPath = matchingFolder.uri.fsPath;
                    if (fsPath.endsWith("/extension") || fsPath.endsWith("\\extension")) {
                        const parent = path.dirname(fsPath);
                        if (fs.existsSync(path.join(parent, "agent")) || fs.existsSync(path.join(parent, "prompts")) || fs.existsSync(path.join(parent, "analysis"))) {
                            return parent;
                        }
                    }
                    return fsPath;
                }
            }
            const fsPath = folders[0].uri.fsPath;
            if (fsPath.endsWith("/extension") || fsPath.endsWith("\\extension")) {
                const parent = path.dirname(fsPath);
                if (fs.existsSync(path.join(parent, "agent")) || fs.existsSync(path.join(parent, "prompts")) || fs.existsSync(path.join(parent, "analysis"))) {
                    return parent;
                }
            }
            return fsPath;
        }
        const activeDoc = vscode.window.activeTextEditor?.document;
        if (activeDoc && activeDoc.uri.scheme === "file") {
            const docDir = path.dirname(activeDoc.uri.fsPath);
            if (fs.existsSync(path.join(docDir, "agent")) || fs.existsSync(path.join(docDir, "prompts")) || fs.existsSync(path.join(docDir, "analysis"))) {
                return docDir;
            }
            const parentDir = path.dirname(docDir);
            if (fs.existsSync(path.join(parentDir, "agent")) || fs.existsSync(path.join(parentDir, "prompts")) || fs.existsSync(path.join(parentDir, "analysis"))) {
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
            // Clear manual custom override so we synchronize with the active workspace folders
            this.customWorkspaceRoot = undefined;
            const newRoot = this.getActiveWorkspaceRoot();
            const changed = newRoot !== this.workspaceRoot;
            this.workspaceRoot = newRoot;
            this.tools.setWorkspaceRoot(this.workspaceRoot);
            if (this.orchestrator) {
                if (changed) {
                    await this.orchestrator.setWorkingDirectory(this.workspaceRoot);
                }
                else {
                    await this.refreshPhases();
                }
            }
            await this.syncActiveModelSummary();
        }
        catch (err) {
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
        }
        catch (err) {
            console.error("[SidebarViewProvider] Error in refreshPhases:", err);
        }
        finally {
            this.isScanning = false;
            if (this.pendingScan && !this.orchestrator?.getIsRunning()) {
                this.pendingScan = false;
                this.refreshPhases().catch(() => { });
            }
        }
    }
    async refreshState() {
        try {
            if (this.orchestrator) {
                const state = await this.orchestrator.getState();
                this.sendStateUpdate(state);
            }
        }
        catch (err) {
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
            }
        }
        catch (err) {
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
        }
        catch (err) {
            console.error("[SidebarViewProvider] Error in resetAllState:", err);
        }
    }
    resolveWebviewView(webviewView, _context, _token) {
        this._view = webviewView;
        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri],
        };
        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);
        // Initial state push once webview is mounted
        setTimeout(() => {
            this.syncActiveModelSummary().catch(() => { });
            this.refreshPhases().catch(() => { });
        }, 150);
        webviewView.onDidChangeVisibility(() => {
            if (webviewView.visible) {
                if (!this.orchestrator?.getIsRunning()) {
                    this.refreshPhases().catch(() => { });
                }
                else {
                    this.refreshState().catch(() => { });
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
                            maxTokens: maxTokens,
                            timeoutSeconds: timeoutSeconds,
                        });
                        // Store API key securely in SecretStorage
                        if (data.apiKey) {
                            await this.context.secrets.store("tidyproteomicsagent.apiKey", data.apiKey);
                        }
                        else if (data.apiKey === "") {
                            await this.context.secrets.delete("tidyproteomicsagent.apiKey");
                        }
                        // Sync with VS Code Settings
                        try {
                            const wsConfig = vscode.workspace.getConfiguration("tidyproteomicsagent");
                            await wsConfig.update("provider", data.provider, vscode.ConfigurationTarget.Global);
                            await wsConfig.update("model", data.model, vscode.ConfigurationTarget.Global);
                            await wsConfig.update("baseUrl", data.baseUrl, vscode.ConfigurationTarget.Global);
                            await wsConfig.update("maxTokens", maxTokens, vscode.ConfigurationTarget.Global);
                            await wsConfig.update("timeoutSeconds", timeoutSeconds, vscode.ConfigurationTarget.Global);
                        }
                        catch (_) { }
                        await this.context.globalState.update("tidyproteomicsagent.provider", data.provider);
                        await this.context.globalState.update("tidyproteomicsagent.model", data.model);
                        await this.context.globalState.update("tidyproteomicsagent.baseUrl", data.baseUrl);
                        await this.context.globalState.update("tidyproteomicsagent.maxTokens", maxTokens);
                        await this.context.globalState.update("tidyproteomicsagent.timeoutSeconds", timeoutSeconds);
                        await this.syncActiveModelSummary();
                        if (!data.silent) {
                            vscode.window.showInformationMessage("TidyProteomicsAgent: Configuration saved!");
                        }
                        const state = await this.orchestrator?.getState();
                        if (state)
                            this.sendStateUpdate(state);
                        break;
                    }
                    case "startPipeline": {
                        if (!this.workspaceRoot) {
                            vscode.window.showErrorMessage("TidyProteomicsAgent: Please open a workspace folder in VS Code first.");
                            return;
                        }
                        const cfg = this.client.getConfig();
                        if (cfg.provider !== "ollama" && !cfg.apiKey) {
                            vscode.window.showErrorMessage("TidyProteomicsAgent: Please enter an API key first.");
                            return;
                        }
                        await this.syncActiveModelSummary();
                        this.orchestrator?.runFullPipeline().catch((err) => {
                            vscode.window.showErrorMessage(`TidyProteomicsAgent: Pipeline error - ${err.message}`);
                        });
                        break;
                    }
                    case "runPhase": {
                        if (!this.workspaceRoot) {
                            vscode.window.showErrorMessage("TidyProteomicsAgent: Please open a workspace folder in VS Code first.");
                            return;
                        }
                        const cfg = this.client.getConfig();
                        if (cfg.provider !== "ollama" && !cfg.apiKey) {
                            vscode.window.showErrorMessage("TidyProteomicsAgent: Please enter an API key first.");
                            return;
                        }
                        await this.syncActiveModelSummary();
                        this.orchestrator?.runSinglePhase(data.phaseId).catch((err) => {
                            vscode.window.showErrorMessage(`TidyProteomicsAgent: Phase execution error - ${err.message}`);
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
                            vscode.window.showErrorMessage("TidyProteomicsAgent: Please open a workspace folder in VS Code first.");
                            return;
                        }
                        const targetRelPath = data.relPath || "";
                        const targetPath = path.isAbsolute(targetRelPath)
                            ? targetRelPath
                            : path.join(this.workspaceRoot, targetRelPath);
                        try {
                            if (!fs.existsSync(targetPath)) {
                                fs.mkdirSync(path.dirname(targetPath), { recursive: true });
                                fs.writeFileSync(targetPath, "", "utf-8");
                            }
                            const doc = await vscode.workspace.openTextDocument(targetPath);
                            await vscode.window.showTextDocument(doc);
                        }
                        catch (err) {
                            vscode.window.showErrorMessage(`TidyProteomicsAgent: Could not open ${targetRelPath}: ${err.message}`);
                        }
                        break;
                    }
                    case "openPhase": {
                        if (!this.workspaceRoot) {
                            vscode.window.showErrorMessage("TidyProteomicsAgent: Please open a workspace folder in VS Code first.");
                            return;
                        }
                        const fileName = data.fileName || "";
                        const targetPath = fileName.includes("/") || fileName.includes("\\")
                            ? path.join(this.workspaceRoot, fileName)
                            : path.join(this.workspaceRoot, "analysis", fileName);
                        try {
                            const doc = await vscode.workspace.openTextDocument(targetPath);
                            await vscode.window.showTextDocument(doc);
                        }
                        catch (err) {
                            vscode.window.showErrorMessage(`TidyProteomicsAgent: Could not open ${fileName}: ${err.message}`);
                        }
                        break;
                    }
                    case "copyPath": {
                        if (this.workspaceRoot) {
                            await vscode.env.clipboard.writeText(this.workspaceRoot);
                            vscode.window.showInformationMessage("TidyProteomicsAgent: Workspace path copied to clipboard!");
                        }
                        break;
                    }
                    case "revealInOS": {
                        if (this.workspaceRoot) {
                            await vscode.commands.executeCommand("revealFileInOS", vscode.Uri.file(this.workspaceRoot));
                        }
                        break;
                    }
                    case "selectDirectory": {
                        const chosen = await vscode.window.showOpenDialog({
                            canSelectFiles: false,
                            canSelectFolders: true,
                            canSelectMany: false,
                            openLabel: "Select Analysis Folder",
                        });
                        if (chosen && chosen.length > 0) {
                            const selectedPath = chosen[0].fsPath;
                            this.customWorkspaceRoot = selectedPath;
                            this.workspaceRoot = selectedPath;
                            this.tools.setWorkspaceRoot(this.workspaceRoot);
                            if (this.orchestrator) {
                                await this.orchestrator.setWorkingDirectory(this.workspaceRoot);
                            }
                            await this.refreshPhases();
                            await this.syncActiveModelSummary();
                            if (this.onFolderChangedCallback) {
                                this.onFolderChangedCallback(this.workspaceRoot);
                            }
                            vscode.window.showInformationMessage(`TidyProteomicsAgent: Active directory set to ${this.workspaceRoot}`);
                        }
                        break;
                    }
                    case "rescanWorkspace": {
                        await this.onWorkspaceChanged();
                        vscode.window.showInformationMessage("TidyProteomicsAgent: Rescanned workspace folders and phases.");
                        break;
                    }
                    case "createMissingFolders": {
                        if (!this.workspaceRoot) {
                            vscode.window.showErrorMessage("TidyProteomicsAgent: Please open a workspace folder in VS Code first.");
                            return;
                        }
                        const standardDirs = ["analysis", "agent", "code", "data", path.join("data", "raw"), "docs", "logs", "tools"];
                        for (const d of standardDirs) {
                            const fullDir = path.join(this.workspaceRoot, d);
                            if (!fs.existsSync(fullDir)) {
                                fs.mkdirSync(fullDir, { recursive: true });
                            }
                        }
                        await this.refreshPhases();
                        vscode.window.showInformationMessage("TidyProteomicsAgent: Standard project folders initialized!");
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
                        break;
                    }
                }
            }
            catch (e) {
                vscode.window.showErrorMessage(`TidyProteomicsAgent Error: ${e.message}`);
            }
        });
    }
    async promptInitWorkspace() {
        if (!this.workspaceRoot) {
            const chosen = await vscode.window.showOpenDialog({
                canSelectFiles: false,
                canSelectFolders: true,
                canSelectMany: false,
                openLabel: "Select Analysis Folder to Initialize",
            });
            if (chosen && chosen.length > 0) {
                this.workspaceRoot = chosen[0].fsPath;
                this.customWorkspaceRoot = this.workspaceRoot;
                this.tools.setWorkspaceRoot(this.workspaceRoot);
                if (this.orchestrator) {
                    await this.orchestrator.setWorkingDirectory(this.workspaceRoot);
                }
                if (this.onFolderChangedCallback) {
                    this.onFolderChangedCallback(this.workspaceRoot);
                }
                await this.syncActiveModelSummary();
            }
            else {
                return;
            }
        }
        const items = [
            {
                label: "$(symbol-structure) Differential Expression Pipeline",
                description: "Full 8-phase workflow (Install, Inspect, Normalize, Impute, Expression, Enrichment, Observations, Report)",
                id: "differential_expression",
            },
            {
                label: "$(graph) Quality Control & Exploration Pipeline",
                description: "2-phase rapid QC and exploratory data analysis",
                id: "quality_control_only",
            },
        ];
        const chosen = await vscode.window.showQuickPick(items, {
            placeHolder: "Select a pipeline template to initialize this workspace",
        });
        if (chosen) {
            await this.initWorkspace(chosen.id);
        }
    }
    async initWorkspace(pipelineId = "differential_expression") {
        if (!this.workspaceRoot) {
            const chosen = await vscode.window.showOpenDialog({
                canSelectFiles: false,
                canSelectFolders: true,
                canSelectMany: false,
                openLabel: "Select Analysis Folder to Initialize",
            });
            if (chosen && chosen.length > 0) {
                this.workspaceRoot = chosen[0].fsPath;
                this.customWorkspaceRoot = this.workspaceRoot;
                this.tools.setWorkspaceRoot(this.workspaceRoot);
                if (this.orchestrator) {
                    await this.orchestrator.setWorkingDirectory(this.workspaceRoot);
                }
                if (this.onFolderChangedCallback) {
                    this.onFolderChangedCallback(this.workspaceRoot);
                }
                await this.syncActiveModelSummary();
            }
            else {
                vscode.window.showErrorMessage("TidyProteomicsAgent: Please open or select a workspace folder first.");
                return false;
            }
        }
        try {
            // 1. Locate template directory across all potential runtime and development locations
            const candidatePaths = [
                path.join(this._extensionUri.fsPath, "templates"),
                path.join(this._extensionUri.fsPath, "extension", "templates"),
                path.join(this.context.extensionPath, "templates"),
                path.join(this.context.extensionPath, "extension", "templates"),
                path.join(__dirname, "..", "templates"),
                path.join(__dirname, "..", "..", "templates"),
                path.join(__dirname, "templates"),
                path.join(this.workspaceRoot, "extension", "templates"),
                path.join(this.workspaceRoot, "templates"),
            ];
            const templateBase = candidatePaths.find((p) => fs.existsSync(p));
            if (!templateBase) {
                vscode.window.showErrorMessage("TidyProteomicsAgent: Template directory not found in extension or workspace.");
                return false;
            }
            // 2. Ensure all standard project directories exist
            const standardDirs = ["analysis", "agent", "code", "data", path.join("data", "raw"), "docs", "logs", "tools"];
            for (const d of standardDirs) {
                const fullDir = path.join(this.workspaceRoot, d);
                if (!fs.existsSync(fullDir)) {
                    fs.mkdirSync(fullDir, { recursive: true });
                }
            }
            const copyFileSafe = (src, dest, overwrite = false) => {
                if (fs.existsSync(src)) {
                    if (overwrite || !fs.existsSync(dest)) {
                        fs.mkdirSync(path.dirname(dest), { recursive: true });
                        fs.copyFileSync(src, dest);
                    }
                }
            };
            // 3. Copy shared templates
            const sharedDir = path.join(templateBase, "shared");
            if (fs.existsSync(sharedDir)) {
                copyFileSafe(path.join(sharedDir, "code", "00_environment.R"), path.join(this.workspaceRoot, "code", "00_environment.R"), true);
                copyFileSafe(path.join(sharedDir, "tools", "lint_tidyproteomics.R"), path.join(this.workspaceRoot, "tools", "lint_tidyproteomics.R"), true);
                copyFileSafe(path.join(sharedDir, "agent", "PROTOCOL.md"), path.join(this.workspaceRoot, "agent", "PROTOCOL.md"), true);
                copyFileSafe(path.join(sharedDir, "agent", "SKILL.md"), path.join(this.workspaceRoot, "agent", "SKILL.md"), true);
                copyFileSafe(path.join(sharedDir, "docs", "experiment.md"), path.join(this.workspaceRoot, "docs", "experiment.md"), false);
                copyFileSafe(path.join(sharedDir, "docs", "notes.md"), path.join(this.workspaceRoot, "docs", "notes.md"), false);
                copyFileSafe(path.join(sharedDir, "docs", "concept.md"), path.join(this.workspaceRoot, "docs", "concept.md"), false);
                copyFileSafe(path.join(sharedDir, ".gitignore"), path.join(this.workspaceRoot, ".gitignore"), false);
                copyFileSafe(path.join(sharedDir, "logs", ".gitkeep"), path.join(this.workspaceRoot, "logs", ".gitkeep"), false);
                copyFileSafe(path.join(sharedDir, "data", "raw", ".gitkeep"), path.join(this.workspaceRoot, "data", "raw", ".gitkeep"), false);
            }
            // 4. Copy selected pipeline markdown files
            let pipelineDir = path.join(templateBase, "pipelines", pipelineId);
            if (!fs.existsSync(pipelineDir)) {
                pipelineDir = path.join(templateBase, "pipelines", "differential_expression");
            }
            if (fs.existsSync(pipelineDir)) {
                const pFiles = fs.readdirSync(pipelineDir).filter((f) => f.endsWith(".md"));
                for (const pf of pFiles) {
                    copyFileSafe(path.join(pipelineDir, pf), path.join(this.workspaceRoot, "analysis", pf), true);
                }
            }
            else {
                vscode.window.showWarningMessage(`TidyProteomicsAgent: Pipeline templates not found in ${templateBase}/pipelines.`);
            }
            // 5. Initialize model summary
            await this.syncActiveModelSummary();
            // 6. Refresh phases in orchestrator
            await this.refreshPhases();
            const state = await this.orchestrator?.getState();
            if (state)
                this.sendStateUpdate(state);
            const pipelineDisplayName = pipelineId === "quality_control_only"
                ? "Quality Control & Exploration"
                : "Standard Differential Expression";
            vscode.window.showInformationMessage(`TidyProteomicsAgent: Workspace initialized with ${pipelineDisplayName} pipeline!`);
            // 7. Focus on docs/experiment.md to guide researcher
            const targetFocusFile = path.join(this.workspaceRoot, "docs", "experiment.md");
            if (fs.existsSync(targetFocusFile)) {
                try {
                    const doc = await vscode.workspace.openTextDocument(targetFocusFile);
                    await vscode.window.showTextDocument(doc);
                }
                catch (_) { }
            }
            return true;
        }
        catch (err) {
            vscode.window.showErrorMessage(`TidyProteomicsAgent: Failed to initialize workspace - ${err.message}`);
            return false;
        }
    }
    startPipeline() {
        this.syncActiveModelSummary().catch(() => { });
        this.orchestrator?.runFullPipeline().catch((err) => {
            vscode.window.showErrorMessage(`TidyProteomicsAgent: Pipeline error - ${err.message}`);
        });
    }
    async runSelectedPhase() {
        if (!this.workspaceRoot) {
            vscode.window.showErrorMessage("TidyProteomicsAgent: Please open a workspace folder in VS Code first.");
            return;
        }
        const cfg = this.client.getConfig();
        if (cfg.provider !== "ollama" && !cfg.apiKey) {
            vscode.window.showErrorMessage("TidyProteomicsAgent: Please enter an API key first.");
            return;
        }
        await this.syncActiveModelSummary();
        if (!this.orchestrator)
            return;
        const phases = this.orchestrator.getPhases();
        if (phases.length === 0) {
            vscode.window.showInformationMessage("TidyProteomicsAgent: No phases found to run.");
            return;
        }
        const current = phases.find((p) => p.status === "running") || phases.find((p) => p.status === "pending" && p.enabled !== false) || phases[0];
        const items = phases.map((p) => ({
            label: p.title,
            description: `(${p.fileName}) - ${p.status.toUpperCase()}`,
            phaseId: p.id,
            picked: p.id === current?.id,
        }));
        const chosen = await vscode.window.showQuickPick(items, {
            placeHolder: "Select phase to run in isolation",
        });
        if (chosen) {
            this.orchestrator.runSinglePhase(chosen.phaseId).catch((err) => {
                vscode.window.showErrorMessage(`TidyProteomicsAgent: Error running phase - ${err.message}`);
            });
        }
    }
    sendStateUpdate(state) {
        if (this._view && this._view.webview) {
            try {
                const p = this._view.webview.postMessage({ type: "stateUpdate", state });
                if (p && typeof p.then === "function") {
                    p.then(undefined, (err) => {
                        console.warn("[SidebarViewProvider] Failed to post stateUpdate:", err);
                    });
                }
            }
            catch (err) {
                console.warn("[SidebarViewProvider] Exception posting stateUpdate:", err);
            }
        }
    }
    sendLog(text) {
        if (this._view && this._view.webview) {
            try {
                const p = this._view.webview.postMessage({ type: "log", text });
                if (p && typeof p.then === "function") {
                    p.then(undefined, (err) => {
                        console.warn("[SidebarViewProvider] Failed to post log:", err);
                    });
                }
            }
            catch (err) {
                console.warn("[SidebarViewProvider] Exception posting log:", err);
            }
        }
    }
    escapeAttr(str) {
        return String(str || "")
            .replace(/&/g, "&amp;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");
    }
    _cachedIcons;
    _loadIcons() {
        const icons = {};
        const mediaDir = path.join(this._extensionUri.fsPath, "media");
        try {
            if (fs.existsSync(mediaDir)) {
                const files = fs.readdirSync(mediaDir);
                for (const file of files) {
                    if (file.endsWith(".svg")) {
                        const key = file.replace(".svg", "");
                        let content = fs.readFileSync(path.join(mediaDir, file), "utf-8");
                        content = content.replace(/<\?xml[^>]*\?>/g, "").trim();
                        content = content.replace(/\s(width|height)="[^"]*"/g, "");
                        if (key === "robot") {
                            content = content.replace("<svg ", `<svg class="svg-icon svg-icon-${key}" `);
                        }
                        else {
                            content = content.replace("<svg ", `<svg class="svg-icon svg-icon-${key}" fill="currentColor" `);
                        }
                        icons[key] = content;
                    }
                }
            }
        }
        catch (err) {
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
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid var(--border);
      padding-bottom: 8px;
      margin-bottom: 10px;
      flex: 0 0 auto;
    }
    .header-left {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .ws-chip {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 2px 8px;
      font-size: 10px;
      color: #93c5fd;
      cursor: pointer;
      max-width: 140px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      transition: border-color 0.15s ease, background 0.15s ease;
    }
    .ws-chip:hover {
      border-color: var(--primary);
      background: rgba(59, 130, 246, 0.15);
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

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }

    /* Segmented Tab Bar */
    .tab-bar {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 6px;
      padding: 3px;
      margin-bottom: 12px;
      gap: 3px;
      flex: 0 0 auto;
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
    #pane-pipeline.active {
      display: flex !important;
      flex-direction: column;
      flex: 1 1 auto;
      min-height: 0;
    }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(2px); }
      to { opacity: 1; transform: translateY(0); }
    }

    /* Containers & Cards */
    .section {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 6px;
      padding: 8px 10px;
      margin-bottom: 10px;
      flex: 0 0 auto;
    }
    .terminal-section {
      display: flex !important;
      flex-direction: column;
      flex: 1 1 auto;
      min-height: 150px;
      margin-bottom: 0 !important;
    }
    .terminal-section .section-header {
      flex: 0 0 auto;
    }
    .terminal-section .terminal {
      flex: 1 1 auto;
      height: 100%;
      min-height: 110px;
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
      align-items: center;
      justify-content: space-between;
      gap: 6px;
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
    }
    .task-name:hover {
      color: var(--primary);
      text-decoration: underline;
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
      flex: 1 1 auto;
      height: 100%;
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
    <div class="header-left">
      <h2>${icons["robot"] || ""} TidyProteomicsAgent</h2>
      <span class="badge badge-completed" id="pipelineHeaderBadge">IDLE</span>
    </div>
    <div class="ws-chip" id="wsChip" title="Click to view Active Directory">
      <span>${icons["folder-open"] || ""}</span>
      <span id="wsChipName">Project</span>
    </div>
  </div>

  <!-- Segmented Tab Navigation -->
  <div class="tab-bar">
    <button type="button" class="tab-btn active" data-tab="pipeline" onclick="window.switchTab && window.switchTab('pipeline')" title="Pipeline execution, phases & live feed">
      <span class="tab-icon">${icons["rocket-lunch"] || ""}</span>
      <span class="tab-label">Pipeline</span>
      <span class="tab-indicator" id="pipelineIndicator"></span>
    </button>
    <button type="button" class="tab-btn" data-tab="blackboard" onclick="window.switchTab && window.switchTab('blackboard')" title="Memory notes, protocol & chat log">
      <span class="tab-icon">${icons["ftp"] || ""}</span>
      <span class="tab-label">Memory</span>
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
  <div class="tab-pane active" id="pane-pipeline">
    <!-- Pipeline Execution Controls -->
    <div class="section">
      <div style="display:flex; gap:4px; margin-bottom:8px;">
        <button id="startPipelineBtn" style="width:100%;">${icons["play"] || ""} Run Active Pipeline</button>
        <button id="stopBtn" class="btn-stop" style="display:none; width:100%;">${icons["stop"] || ""} Stop Pipeline</button>
      </div>

      <div class="section-header">
        <div style="display:flex; align-items:center; gap:6px;">
          <h3>${icons["rocket-lunch"] || ""} Analysis Tasks</h3>
          <button type="button" id="refreshTasksBtn" class="btn-icon" title="Reload tasks and sync progress from disk">${icons["refresh"] || "↻"}</button>
        </div>
        <span style="font-size:9px; color:var(--muted);" id="phaseCountLabel">0 Tasks</span>
      </div>
      <div class="section-desc">Select tasks to execute. Click task name to edit in VS Code.</div>

      <!-- Dynamic Phase Checklist -->
      <div id="phaseContainer">
        <div style="text-align:center; padding:10px; color:var(--muted);">Loading phases...</div>
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

    <!-- Live Sub-Loop Terminal Feed -->
    <div class="section terminal-section">
      <div class="section-header">
        <h3>${icons["terminal"] || ""} Sub-Loop Live Feed</h3>
        <div style="display:flex; gap:4px;">
          <button class="btn-sm" id="viewChatLogBtn" title="Open logs/llm_chat.md in VS Code">${icons["list"] || ""} Chat Log</button>
          <button class="btn-sm" id="clearLogBtn">Clear</button>
        </div>
      </div>
      <div class="terminal" id="terminalLog">TidyProteomicsAgent ready. Phases discovered from analysis/*.md.</div>
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
      • <b>Global Context</b> (<code>agent/</code>) is cached across phases to slash token costs.<br>
      • <b>Ephemeral Sub-Loops</b> run in isolation for each phase, preventing context bloat.<br>
      • <b>Shared Memory</b> (<code>docs/notes.md</code>) passes findings between phases.
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
          <option value="32768" ${(config.maxTokens === 32768 || !config.maxTokens) ? "selected" : ""}>32,768 (Full Manuscripts / Long Synthesis)</option>
          <option value="65536" ${config.maxTokens === 65536 ? "selected" : ""}>65,536</option>
          <option value="128000" ${config.maxTokens === 128000 ? "selected" : ""}>128,000 (OpenRouter Frontier / Luna Max)</option>
        </select>
        <span style="font-size:9px; color:var(--muted); display:block; margin-top:2px;">Prevents tool call JSON truncation during long file generation (e.g. docs/scientific_report.md).</span>
      </div>

      <div class="form-group">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <label id="timeoutSecondsLabel">Request Timeout</label>
          <span style="font-size:9px; color:var(--muted);">Default: 600s (10m)</span>
        </div>
        <select id="timeoutSecondsSelect">
          <option value="180" ${config.timeoutSeconds === 180 ? "selected" : ""}>180s (3m - Fast Cloud Models)</option>
          <option value="300" ${config.timeoutSeconds === 300 ? "selected" : ""}>300s (5m - Standard)</option>
          <option value="600" ${(config.timeoutSeconds === 600 || !config.timeoutSeconds) ? "selected" : ""}>600s (10m - Recommended for Large / Local Models)</option>
          <option value="900" ${config.timeoutSeconds === 900 ? "selected" : ""}>900s (15m - Extended Reasoning / Heavy Synthesis)</option>
          <option value="1200" ${config.timeoutSeconds === 1200 ? "selected" : ""}>1,200s (20m - Ultra Long / Slow Local Inference)</option>
        </select>
        <span style="font-size:9px; color:var(--muted); display:block; margin-top:2px;">Prevents timeout abortions during complex phases or slow local inference (e.g. 70B models).</span>
      </div>

      <div style="margin-top:10px; display:flex; justify-content:space-between; align-items:center;">
        <span id="saveStatus" style="font-size:10px; color:var(--success); display:none;">✓ Settings saved!</span>
      </div>
    </div>

    <!-- Active Provider Summary Card -->
    <div class="section">
      <div class="section-header">
        <h3>${icons["stats"] || ""} Active Model Summary</h3>
        <button class="icon-btn" data-action="openFile" data-path="docs/llm.md" title="Open docs/llm.md" style="font-size:10px; padding:2px 6px;">docs/llm.md ↗</button>
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
          <b id="summaryTimeout" style="font-family:monospace;">${(config.timeoutSeconds || 600)}s</b>
        </div>
        <div style="display:flex; justify-content:space-between;">
          <span style="color:var(--muted);">Key Status:</span>
          <span id="summaryKeyStatus" class="badge ${config.apiKey ? "badge-completed" : "badge-failed"}">${config.apiKey ? "Configured" : "Missing"}</span>
        </div>
      </div>
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
      • <b>Option 1 (Recommended in-window):</b> Click <b>${icons["folder-open"] || ""} Choose Folder...</b> above. This switches the active project instantly without restarting the window.<br>
      • <b>Option 2:</b> In VS Code, use <b>File &gt; Add Folder to Workspace...</b> to mount your dataset folder into the Explorer.<br>
      <div style="margin-top:6px; padding:6px; background:rgba(239, 68, 68, 0.1); border-left:3px solid var(--error); border-radius:3px; font-size:10px; color:#fca5a5;">
        <b>${icons["alert"] || ""} Debug Window Note:</b> When debugging this extension (F5), do <b>not</b> use <i>File &gt; Open Folder...</i> because VS Code restarts the window and terminates the debug session. Use <b>Choose Folder...</b> or <b>Add Folder to Workspace...</b> instead.
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
            p.style.display = "block";
          } else {
            p.classList.remove("active");
            p.style.display = "none";
          }
        });

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
      const initialTab = (savedState && savedState.activeTab) ? savedState.activeTab : "pipeline";
      switchTab(initialTab);
    } catch (_) {
      switchTab("pipeline");
    }

    // Elements
    const pipelineHeaderBadge = document.getElementById("pipelineHeaderBadge");
    const wsChip = document.getElementById("wsChip");
    const wsChipName = document.getElementById("wsChipName");

    const pipelineIndicator = document.getElementById("pipelineIndicator");
    const providerIndicator = document.getElementById("providerIndicator");
    const dirIndicator = document.getElementById("dirIndicator");

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

      // Workspace Chip
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

      // Dynamic data-actions (runPhase, openPhase, openFile)
      const target = e.target.closest ? e.target.closest("[data-action]") : null;
      if (target) {
        const action = target.getAttribute("data-action");
        if (action === "runPhase") {
          const phaseId = target.getAttribute("data-id");
          if (phaseId) vscode.postMessage({ type: "runPhase", phaseId: phaseId });
        } else if (action === "openPhase") {
          const fileName = target.getAttribute("data-file");
          if (fileName) vscode.postMessage({ type: "openPhase", fileName: fileName });
        } else if (action === "openFile") {
          const relPath = target.getAttribute("data-path");
          if (relPath) vscode.postMessage({ type: "openFile", relPath: relPath });
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
            descEl.innerHTML = "<b>Phases:</b> 00_INSTALL ➔ 01_INSPECT.<br><i>Includes: Workspace readiness, data import, replicate CV analysis, quantifiable fraction evaluation, and PCA separation.</i>";
          } else {
            descEl.innerHTML = "<b>Phases:</b> 00_INSTALL ➔ 01_INSPECT ➔ 02_NORMALIZE ➔ 03_IMPUTE ➔ 04_EXPRESSION ➔ 05_ENRICHMENT ➔ 06_OBSERVATIONS ➔ 07_SYNTHESIS.<br><i>Includes: Environment readiness, QC inspection, normalization benchmarking, imputation, differential expression, pathway enrichment, literature observations, and synthesis report.</i>";
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

    // Initial load: do NOT overwrite modelInput.value!
    updateProviderUI(false);

    // Button Actions
    if (saveConfigBtn) {
      saveConfigBtn.addEventListener("click", function () {
        sendConfigSave(false);
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
    if (viewChatLogBtn) viewChatLogBtn.addEventListener("click", () => vscode.postMessage({ type: "openFile", relPath: "logs/llm_chat.md" }));

    if (copyPathBtn) copyPathBtn.addEventListener("click", () => vscode.postMessage({ type: "copyPath" }));
    if (revealOSBtn) revealOSBtn.addEventListener("click", () => vscode.postMessage({ type: "revealInOS" }));
    if (chooseDirBtn) chooseDirBtn.addEventListener("click", () => vscode.postMessage({ type: "selectDirectory" }));
    if (rescanDirBtn) rescanDirBtn.addEventListener("click", () => vscode.postMessage({ type: "rescanWorkspace" }));
    if (createFoldersBtn) createFoldersBtn.addEventListener("click", () => vscode.postMessage({ type: "createMissingFolders" }));
    const initPipelineQuickBtn = document.getElementById("initPipelineQuickBtn");
    if (initPipelineQuickBtn) initPipelineQuickBtn.addEventListener("click", () => vscode.postMessage({ type: "promptInitWorkspace" }));

    function escapeHtml(str) {
      if (!str) return "";
      return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
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
                  durEl.textContent = sec + "s";
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

        // Pipeline Running State
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

        if (pipelineHeaderBadge) {
          if (anyRunning) {
            pipelineHeaderBadge.innerHTML = "RUNNING " + (ICONS["sparkles"] || "");
            pipelineHeaderBadge.className = "badge badge-running";
          } else {
            pipelineHeaderBadge.textContent = "IDLE";
            pipelineHeaderBadge.className = "badge badge-completed";
          }
        }

        if (pipelineIndicator) {
          pipelineIndicator.className = anyRunning ? "tab-indicator running" : "tab-indicator";
        }

        if (startPipelineBtn) startPipelineBtn.style.display = anyRunning ? "none" : "block";
        if (stopBtn) stopBtn.style.display = anyRunning ? "block" : "none";

        // Render Dynamic Analysis Tasks (Tab 1)
        if (phaseContainer) {
          let phaseHtml = "";
          const phaseCount = state.phases ? state.phases.length : 0;
          if (phaseCountLabel) phaseCountLabel.textContent = phaseCount + " Task" + (phaseCount === 1 ? "" : "s");

          if (!wsPath) {
            phaseHtml = '<div style="text-align:center; padding:15px; color:var(--muted);">No folder opened in VS Code.<br><br>Use <b>File &gt; Open Folder...</b> or the <b>Directory</b> tab to choose a folder.</div>';
          } else if (phaseCount === 0) {
            phaseHtml = '<div style="background:var(--vscode-sideBar-background); border:1px solid var(--vscode-widget-border, #333); border-radius:6px; padding:12px; margin:4px 0;">' +
              '<div style="display:flex; align-items:center; gap:6px; margin-bottom:6px;">' +
                '<span style="font-size:15px; display:inline-flex; align-items:center;">' + (ICONS["rocket-lunch"] || "") + '</span>' +
                '<div style="font-weight:600; font-size:12px; color:var(--vscode-foreground);">Initialize Analysis Pipeline</div>' +
              '</div>' +
              '<div style="font-size:11px; color:var(--muted); line-height:1.4; margin-bottom:10px;">' +
                'No analysis tasks found in this directory. Choose a pipeline to initialize your workspace with subdirectories, R setup scripts, and templates:' +
              '</div>' +
              '<div style="margin-bottom:8px;">' +
                '<label style="font-size:10px; font-weight:600; text-transform:uppercase; letter-spacing:0.5px; color:var(--muted); display:block; margin-bottom:4px;">Pipeline Template</label>' +
                '<select id="pipelineTemplateSelect" style="width:100%; box-sizing:border-box; padding:5px 8px; font-size:11px; background:var(--vscode-input-background, #252526); color:var(--vscode-input-foreground, #cccccc); border:1px solid var(--vscode-input-border, #3c3c3c); border-radius:4px; outline:none;">' +
                  '<option value="differential_expression">Differential Expression (8-Phase Pipeline)</option>' +
                  '<option value="quality_control_only">Quality Control &amp; Exploration (2-Phase QC)</option>' +
                '</select>' +
              '</div>' +
              '<div id="pipelineDescription" style="font-size:10px; color:var(--muted); margin-bottom:12px; background:rgba(255,255,255,0.03); padding:6px 8px; border-radius:4px; border-left:3px solid var(--primary, #007acc); line-height:1.4;">' +
                '<b>Phases:</b> 00_INSTALL ➔ 01_INSPECT ➔ 02_NORMALIZE ➔ 03_IMPUTE ➔ 04_EXPRESSION ➔ 05_ENRICHMENT ➔ 06_OBSERVATIONS ➔ 07_SYNTHESIS.<br>' +
                '<i>Includes environment readiness, QC inspection, normalization benchmarking, imputation, differential expression, pathway enrichment, literature observations, and final synthesis report.</i>' +
              '</div>' +
              '<button type="button" id="initWorkspaceBtn" data-action="initWorkspace" class="btn-primary" style="width:100%; padding:7px 10px; font-size:11px; font-weight:600; display:flex; align-items:center; justify-content:center; gap:6px; cursor:pointer;">' +
                '<span>' + (ICONS["sparkles"] || "") + '</span> Initialize Working Directory' +
              '</button>' +
            '</div>';
          } else {
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
              } else if (state.isFullPipelineRunning && anyRunning && p.enabled !== false && runningIndex !== -1 && i > runningIndex) {
                displayStatus = "QUEUED";
                badgeClass = "badge badge-queued";
                durationText = "wait";
              } else if (p.durationSeconds !== undefined && p.durationSeconds !== null && p.durationSeconds > 0) {
                durationText = p.durationSeconds + "sec";
              }

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

              phaseHtml += '<div class="' + cardClass + '"' + startTimeAttr + '>' +
                '<div class="task-left">' +
                  '<input type="checkbox" ' + checked + ' data-phase-id="' + escapeHtml(p.id) + '" title="Include in pipeline" ' + (anyRunning ? "disabled" : "") + ' />' +
                  '<span class="task-name" data-action="openPhase" data-file="' + safeFileName + '" title="Click to edit ' + safeFileName + ' in VS Code">' + safeTaskName + '</span>' +
                '</div>' +
                '<div class="task-right">' +
                  '<button type="button" class="btn-run" data-action="runPhase" data-id="' + escapeHtml(p.id) + '" ' + runDisabled + ' title="' + escapeHtml(runBtnTitle) + '">' + (ICONS["play"] || "") + ' RUN</button>' +
                  '<span class="' + badgeClass + '">' + escapeHtml(displayStatus) + '</span>' +
                  '<span class="task-duration">' + escapeHtml(durationText) + '</span>' +
                '</div>' +
              '</div>';
            }
          }
          phaseContainer.innerHTML = phaseHtml;
          syncRunTicker(anyRunning);
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

    function appendLog(text) {
      if (terminalLog && text) {
        terminalLog.textContent += "\\n" + String(text);
        terminalLog.scrollTop = terminalLog.scrollHeight;
      }
    }

    // Message receiver
    window.addEventListener("message", function (event) {
      try {
        const message = event.data;
        if (!message) return;
        if (message.type === "stateUpdate") {
          renderState(message.state);
        } else if (message.type === "log") {
          appendLog(message.text);
        }
      } catch (err) {
        console.error("[TidyProteomicsAgent] Error in webview message handler:", err);
      }
    });

    // Request initial state proactively
    vscode.postMessage({ type: "requestState" });
    setTimeout(function () {
      vscode.postMessage({ type: "requestState" });
    }, 200);
  </script>
</body>
</html>`;
    }
}
exports.SidebarViewProvider = SidebarViewProvider;
//# sourceMappingURL=SidebarViewProvider.js.map