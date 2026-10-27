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
exports.ExecutionManager = void 0;
const vscode = __importStar(require("vscode"));
const McpExecutionProvider_1 = require("./McpExecutionProvider");
/**
 * ExecutionManager
 * Manages the lifecycle of the TidyProteomics MCP Execution Provider.
 * Connects to the persistent R session via MCP stdio, registers discovered tools,
 * and maintains the VSCode status bar display.
 */
class ExecutionManager {
    workspaceRoot;
    toolRegistry;
    currentProvider;
    statusBarItem;
    constructor(workspaceRoot, toolRegistry) {
        this.workspaceRoot = workspaceRoot;
        this.toolRegistry = toolRegistry;
        this.currentProvider = new McpExecutionProvider_1.McpExecutionProvider();
        this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
        this.statusBarItem.command = "tidyproteomicsagent.toggleEngine";
        this.updateStatusBar();
        this.statusBarItem.show();
    }
    setWorkspaceRoot(newRoot) {
        this.workspaceRoot = newRoot || "";
    }
    async initialize() {
        try {
            await this.currentProvider.initialize(this.workspaceRoot);
            this.syncToolRegistry();
            this.updateStatusBar();
        }
        catch (err) {
            console.warn(`[ExecutionManager] Failed to initialize MCP provider:`, err);
            vscode.window.showErrorMessage(`Failed to connect to TidyProteomics MCP Server: ${err.message || String(err)}`);
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
        // Mode is dedicated to MCP
        await this.initialize();
    }
    async toggleEngine() {
        const ready = this.currentProvider.isReady();
        if (ready) {
            const toolsCount = this.currentProvider.getRegisteredTools().length;
            vscode.window.showInformationMessage(`TidyProteomics MCP Engine active (${toolsCount} tools registered in memory).`);
        }
        else {
            vscode.window.showInformationMessage("TidyProteomics MCP Engine is initializing or reconnecting...");
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
                required: t.inputSchema?.required || [],
            },
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
        const isConn = connected !== undefined ? connected : this.currentProvider.isReady();
        this.statusBarItem.text = isConn
            ? "$(server) TidyProteomics: MCP"
            : "$(alert) TidyProteomics: Disconnected";
        this.statusBarItem.tooltip = isConn
            ? "TidyProteomics MCP Server connected (In-Memory S3 Session). Click for status."
            : "TidyProteomics MCP Server not connected. Click to retry connection.";
    }
    async dispose() {
        this.statusBarItem.dispose();
        await this.currentProvider.dispose();
    }
}
exports.ExecutionManager = ExecutionManager;
//# sourceMappingURL=ExecutionManager.js.map