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
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const fs = __importStar(require("fs"));
const SidebarViewProvider_1 = require("./ui/SidebarViewProvider");
function activate(context) {
    console.log("TidyProteomicsAgent extension is now active!");
    // Dedicated Output Channel for diagnosis and runtime logging
    const outputChannel = vscode.window.createOutputChannel("TidyProteomicsAgent");
    context.subscriptions.push(outputChannel);
    // Safety handlers to prevent silent Extension Host termination on unhandled rejections
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
        },
    });
    const sidebarProvider = new SidebarViewProvider_1.SidebarViewProvider(context.extensionUri, context);
    // Register Webview View Provider
    context.subscriptions.push(vscode.window.registerWebviewViewProvider(SidebarViewProvider_1.SidebarViewProvider.viewType, sidebarProvider));
    // Dynamic file watchers scoped safely to specific existing subdirectories.
    // On macOS, creating watchers on the entire workspace root causes recursive FSEvents indexing
    // of large folders like node_modules (20,000+ files), causing native crashes (SIGSEGV) ~2-3s after launch.
    let watchers = [];
    const updateWatchers = (customFolder) => {
        for (const w of watchers) {
            try {
                w.dispose();
            }
            catch (_) { }
        }
        watchers = [];
        const targetFolders = [];
        if (customFolder) {
            targetFolders.push(vscode.Uri.file(customFolder));
        }
        else {
            const folders = vscode.workspace.workspaceFolders;
            if (folders && folders.length > 0) {
                targetFolders.push(...folders);
            }
        }
        if (targetFolders.length === 0) {
            return;
        }
        for (const folder of targetFolders) {
            try {
                const folderPath = (folder.fsPath || folder.uri?.fsPath || "");
                if (!folderPath || !fs.existsSync(folderPath)) {
                    continue;
                }
                const folderUri = folder.uri || vscode.Uri.file(folderPath);
                // Scope analysis watcher directly to analysis/*.md (works even if analysis/ folder is created later)
                const analysisWatcher = vscode.workspace.createFileSystemWatcher(new vscode.RelativePattern(folderUri, "analysis/*.md"));
                analysisWatcher.onDidCreate(() => sidebarProvider.refreshPhases().catch(() => { }));
                analysisWatcher.onDidChange(() => sidebarProvider.refreshPhases().catch(() => { }));
                analysisWatcher.onDidDelete(() => {
                    sidebarProvider.forceReload().catch(() => { });
                    sidebarProvider.refreshPhases().catch(() => { });
                });
                watchers.push(analysisWatcher);
                // Scope agent/prompts watchers directly to their folders
                const agentWatcher = vscode.workspace.createFileSystemWatcher(new vscode.RelativePattern(folderUri, "agent/*.md"));
                agentWatcher.onDidCreate(() => sidebarProvider.refreshPhases().catch(() => { }));
                agentWatcher.onDidChange(() => sidebarProvider.refreshPhases().catch(() => { }));
                agentWatcher.onDidDelete(() => sidebarProvider.refreshPhases().catch(() => { }));
                watchers.push(agentWatcher);
                const promptsWatcher = vscode.workspace.createFileSystemWatcher(new vscode.RelativePattern(folderUri, "prompts/*.md"));
                promptsWatcher.onDidCreate(() => sidebarProvider.refreshPhases().catch(() => { }));
                promptsWatcher.onDidChange(() => sidebarProvider.refreshPhases().catch(() => { }));
                promptsWatcher.onDidDelete(() => sidebarProvider.refreshPhases().catch(() => { }));
                watchers.push(promptsWatcher);
                // Scope docs watcher directly to docs/notes.md
                const notesWatcher = vscode.workspace.createFileSystemWatcher(new vscode.RelativePattern(folderUri, "docs/notes.md"));
                notesWatcher.onDidCreate(() => sidebarProvider.forceReload().catch(() => { }));
                notesWatcher.onDidChange(() => sidebarProvider.forceReload().catch(() => { }));
                notesWatcher.onDidDelete(() => sidebarProvider.forceReload().catch(() => { }));
                watchers.push(notesWatcher);
            }
            catch (e) {
                const folderPath = (folder.fsPath || folder.uri?.fsPath || "");
                console.error("[TidyProteomicsAgent] Failed to initialize file watchers for folder:", folderPath, e);
            }
        }
    };
    // Wire folder changed callback so watchers track custom selected folders
    sidebarProvider.onFolderChangedCallback = (folderPath) => {
        updateWatchers(folderPath);
    };
    // Initialize watchers if workspace folders are present
    updateWatchers();
    // Auto-sync watchers and phases whenever workspace folders change
    context.subscriptions.push(vscode.workspace.onDidChangeWorkspaceFolders(() => {
        updateWatchers();
        sidebarProvider.onWorkspaceChanged().catch(() => { });
    }));
    // Register watchers disposal on extension deactivation
    context.subscriptions.push({
        dispose: () => {
            for (const w of watchers) {
                try {
                    w.dispose();
                }
                catch (_) { }
            }
            watchers = [];
        },
    });
    // Command: Start Full Pipeline
    context.subscriptions.push(vscode.commands.registerCommand("tidyproteomicsagent.startPipeline", () => {
        sidebarProvider.startPipeline();
    }));
    // Command: Run Selected Phase
    context.subscriptions.push(vscode.commands.registerCommand("tidyproteomicsagent.runCurrentPhase", () => {
        sidebarProvider.runSelectedPhase().catch((err) => {
            vscode.window.showErrorMessage(`TidyProteomicsAgent: ${err.message || String(err)}`);
        });
    }));
    // Command: Refresh Tasks from Disk
    context.subscriptions.push(vscode.commands.registerCommand("tidyproteomicsagent.refreshTasks", () => {
        sidebarProvider.forceReload();
    }));
    // Command: Reset Pipeline State
    context.subscriptions.push(vscode.commands.registerCommand("tidyproteomicsagent.resetState", async () => {
        const confirm = await vscode.window.showWarningMessage("Are you sure you want to reset the pipeline state in docs/notes.md?", { modal: true }, "Yes", "Cancel");
        if (confirm === "Yes") {
            await sidebarProvider.resetAllState();
            vscode.window.showInformationMessage("TidyProteomicsAgent: Pipeline state reset.");
        }
    }));
    // Command: Initialize Analysis Pipeline
    context.subscriptions.push(vscode.commands.registerCommand("tidyproteomicsagent.initWorkspace", async () => {
        await sidebarProvider.promptInitWorkspace();
    }));
    // Command: Toggle Engine (MCP vs. Markdown Skill)
    context.subscriptions.push(vscode.commands.registerCommand("tidyproteomicsagent.toggleEngine", async () => {
        await sidebarProvider.toggleEngine();
    }));
    context.subscriptions.push({
        dispose: () => {
            sidebarProvider.dispose().catch(() => { });
        },
    });
}
function deactivate() { }
//# sourceMappingURL=extension.js.map