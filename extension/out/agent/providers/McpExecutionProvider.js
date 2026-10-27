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
exports.McpExecutionProvider = void 0;
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const readline = __importStar(require("readline"));
const child_process_1 = require("child_process");
const vscode = __importStar(require("vscode"));
/**
 * Generic Model Context Protocol (MCP) Execution Provider.
 * Spawns and interacts with the persistent TidyProteomics MCP server over stdio JSON-RPC.
 * Zero hardcoded domain tools — all tools are dynamically discovered via `tools/list`
 * and passed straight to the LLM agent.
 */
class McpExecutionProvider {
    mode = "mcp";
    proc = null;
    rl = null;
    workspaceRoot = "";
    msgId = 0;
    pendingRequests = new Map();
    tools = [];
    isReady() {
        return this.proc !== null && this.tools.length > 0;
    }
    async initialize(workspaceRoot) {
        this.workspaceRoot = workspaceRoot;
        const config = vscode.workspace.getConfiguration("tidyproteomicsagent");
        const mcpMode = config.get("mcpMode") || "local";
        let targetWorkspace = workspaceRoot;
        if (mcpMode === "docker") {
            const dockerImage = config.get("dockerImage") || "tidyproteomics-mcp:latest";
            targetWorkspace = "/workspace";
            this.proc = (0, child_process_1.spawn)("docker", [
                "run",
                "-i",
                "--rm",
                "-v",
                `${workspaceRoot}:/workspace`,
                "-e",
                "WORKSPACE=/workspace",
                dockerImage,
            ], {
                cwd: workspaceRoot,
                stdio: ["pipe", "pipe", "pipe"],
            });
        }
        else {
            let serverRelPath = config.get("mcpServerPath") ||
                path.resolve(workspaceRoot, "../tidyproteomics/mcp/server.py");
            const candidatePaths = [
                path.isAbsolute(serverRelPath) ? serverRelPath : path.resolve(workspaceRoot, serverRelPath),
                path.resolve(workspaceRoot, "../tidyproteomics/mcp/server.py"),
                path.resolve(workspaceRoot, "mcp/server.py"),
                path.resolve(process.env.HOME || "", "Local/github/tidyproteomics/mcp/server.py"),
            ];
            let serverPath = "";
            for (const p of candidatePaths) {
                if (fs.existsSync(p)) {
                    serverPath = p;
                    break;
                }
            }
            if (!serverPath) {
                throw new Error(`tidyproteomics MCP server script not found. Checked:\n${candidatePaths.join("\n")}\n\nTip: You can set tidyproteomicsagent.mcpMode to "docker" in VSCode Settings to run containerized without local Python/R dependencies.`);
            }
            const pythonBin = config.get("pythonPath") ||
                (fs.existsSync("/opt/homebrew/bin/python3")
                    ? "/opt/homebrew/bin/python3"
                    : (process.env.PYTHON || "python3"));
            // Spawn server.py with stdio pipes
            this.proc = (0, child_process_1.spawn)(pythonBin, [serverPath], {
                cwd: workspaceRoot,
                stdio: ["pipe", "pipe", "pipe"],
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
        this.rl = readline.createInterface({
            input: this.proc.stdout,
            terminal: false,
        });
        this.rl.on("line", (line) => {
            const trimmed = line.trim();
            if (!trimmed)
                return;
            try {
                const msg = JSON.parse(trimmed);
                const id = msg.id;
                if (id !== undefined && this.pendingRequests.has(id)) {
                    const { resolve, reject } = this.pendingRequests.get(id);
                    this.pendingRequests.delete(id);
                    if (msg.error) {
                        reject(new Error(msg.error.message || JSON.stringify(msg.error)));
                    }
                    else {
                        resolve(msg.result);
                    }
                }
            }
            catch (err) {
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
        // 1. Handshake: initialize
        await this.sendRequest("initialize", {
            protocolVersion: "2024-11-05",
            clientInfo: { name: "TidyProteomicsAgent", version: "1.0.0" },
            workspaceRoot: targetWorkspace,
            rootPath: targetWorkspace,
        });
        // 2. Notification: initialized
        this.sendNotification("notifications/initialized");
        // 3. Dynamic tool discovery
        const toolsResp = await this.sendRequest("tools/list", {});
        this.tools = toolsResp.tools || [];
        // 4. Synchronize workspace directory with R daemon
        try {
            await this.callTool("tpa_set_workspace", { workspace: targetWorkspace, reset: false });
        }
        catch (err) {
            console.warn("[McpExecutionProvider] Notice: tpa_set_workspace error:", err);
        }
    }
    sendRequest(method, params = {}) {
        return new Promise((resolve, reject) => {
            if (!this.proc || !this.proc.stdin) {
                return reject(new Error("MCP process is not running."));
            }
            const id = ++this.msgId;
            this.pendingRequests.set(id, { resolve, reject });
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
            }
            catch (_) { }
            this.proc = null;
        }
        this.pendingRequests.clear();
    }
    activePhase = "";
    setActivePhase(phaseName) {
        if (!phaseName)
            return;
        this.activePhase = path.basename(phaseName).replace(/\.md$/i, "").toLowerCase();
    }
    getRegisteredTools() {
        return this.tools;
    }
    async executeTool(name, args) {
        const res = await this.callTool(name, args);
        try {
            this.mirrorOutputToLogs(name, args, res.content);
        }
        catch (_) { }
        return res.content;
    }
    mirrorOutputToLogs(toolName, args, output) {
        if (!this.workspaceRoot)
            return;
        const logsDir = path.join(this.workspaceRoot, "logs");
        let targetPhase = this.activePhase;
        if (!targetPhase) {
            try {
                if (fs.existsSync(logsDir)) {
                    const entries = fs.readdirSync(logsDir, { withFileTypes: true });
                    const subdirs = entries
                        .filter((e) => e.isDirectory() && !e.name.startsWith("."))
                        .map((e) => path.join(logsDir, e.name))
                        .sort((a, b) => {
                        try {
                            return fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs;
                        }
                        catch {
                            return 0;
                        }
                    });
                    if (subdirs.length > 0) {
                        targetPhase = path.basename(subdirs[0]);
                    }
                }
            }
            catch (_) { }
        }
        if (!targetPhase)
            return;
        try {
            const targetDir = path.join(logsDir, targetPhase);
            if (!fs.existsSync(targetDir)) {
                fs.mkdirSync(targetDir, { recursive: true });
            }
            const targetLogFile = path.join(targetDir, "console.log");
            const timestamp = new Date().toISOString();
            const entry = `\n[${timestamp}] [MCP Tool] ${toolName}(${JSON.stringify(args)})\n${output}\n`;
            fs.appendFileSync(targetLogFile, entry, "utf-8");
        }
        catch (_) { }
    }
    async callTool(name, args = {}) {
        const res = await this.sendRequest("tools/call", { name, arguments: args });
        const content = (res.content || [])
            .filter((c) => c.type === "text")
            .map((c) => c.text)
            .join("\n");
        return {
            success: !res.isError,
            content,
            isError: !!res.isError,
        };
    }
}
exports.McpExecutionProvider = McpExecutionProvider;
//# sourceMappingURL=McpExecutionProvider.js.map