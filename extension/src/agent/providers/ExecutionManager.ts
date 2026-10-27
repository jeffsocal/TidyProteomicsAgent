import * as vscode from "vscode";
import { ExecutionMode, IProteomicsExecutionProvider } from "../../types/ExecutionProvider";
import { McpExecutionProvider } from "./McpExecutionProvider";
import { ToolRegistry } from "../../tools/ToolRegistry";

/**
 * ExecutionManager
 * Manages the lifecycle of the TidyProteomics MCP Execution Provider.
 * Connects to the persistent R session via MCP stdio, registers discovered tools,
 * and maintains the VSCode status bar display.
 */
export class ExecutionManager {
  private currentProvider: McpExecutionProvider;
  private statusBarItem: vscode.StatusBarItem;

  constructor(
    private workspaceRoot: string,
    private toolRegistry?: ToolRegistry
  ) {
    this.currentProvider = new McpExecutionProvider();

    this.statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
      100
    );
    this.statusBarItem.command = "tidyproteomicsagent.toggleEngine";
    this.updateStatusBar();
    this.statusBarItem.show();
  }

  public setWorkspaceRoot(newRoot: string) {
    this.workspaceRoot = newRoot || "";
  }

  public async initialize(): Promise<void> {
    try {
      await this.currentProvider.initialize(this.workspaceRoot);
      this.syncToolRegistry();
      this.updateStatusBar();
    } catch (err: any) {
      console.warn(`[ExecutionManager] Failed to initialize MCP provider:`, err);
      vscode.window.showErrorMessage(
        `Failed to connect to TidyProteomics MCP Server: ${err.message || String(err)}`
      );
      this.updateStatusBar(false);
    }
  }

  public get provider(): IProteomicsExecutionProvider {
    return this.currentProvider;
  }

  public get mode(): ExecutionMode {
    return "mcp";
  }

  public async setMode(_newMode: string): Promise<void> {
    // Mode is dedicated to MCP
    await this.initialize();
  }

  public async toggleEngine(): Promise<void> {
    const ready = this.currentProvider.isReady();
    if (ready) {
      const toolsCount = this.currentProvider.getRegisteredTools().length;
      vscode.window.showInformationMessage(
        `TidyProteomics MCP Engine active (${toolsCount} tools registered in memory).`
      );
    } else {
      vscode.window.showInformationMessage(
        "TidyProteomics MCP Engine is initializing or reconnecting..."
      );
      await this.initialize();
    }
  }

  private syncToolRegistry() {
    if (!this.toolRegistry) return;

    const mcpTools = this.currentProvider.getRegisteredTools();
    const toolDefs = mcpTools.map((t) => ({
      name: t.name,
      description: t.description,
      parameters: {
        type: "object" as const,
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

  public setActivePhase(phaseName: string): void {
    if (this.currentProvider.setActivePhase) {
      this.currentProvider.setActivePhase(phaseName);
    }
  }

  private updateStatusBar(connected?: boolean): void {
    const isConn = connected !== undefined ? connected : this.currentProvider.isReady();
    this.statusBarItem.text = isConn
      ? "$(server) TidyProteomics: MCP"
      : "$(alert) TidyProteomics: Disconnected";
    this.statusBarItem.tooltip = isConn
      ? "TidyProteomics MCP Server connected (In-Memory S3 Session). Click for status."
      : "TidyProteomics MCP Server not connected. Click to retry connection.";
  }

  public async dispose(): Promise<void> {
    this.statusBarItem.dispose();
    await this.currentProvider.dispose();
  }
}
