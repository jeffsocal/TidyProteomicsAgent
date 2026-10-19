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
exports.ToolRegistry = void 0;
const fs = __importStar(require("fs/promises"));
const fsSync = __importStar(require("fs"));
const readline = __importStar(require("readline"));
const path = __importStar(require("path"));
const child_process_1 = require("child_process");
const util_1 = require("util");
const execAsync = (0, util_1.promisify)(child_process_1.exec);
class ToolRegistry {
    workspaceRoot;
    tools = new Map();
    constructor(workspaceRoot) {
        this.workspaceRoot = workspaceRoot;
        this.workspaceRoot = workspaceRoot || "";
        this.registerDefaultTools();
    }
    setWorkspaceRoot(newRoot) {
        this.workspaceRoot = newRoot || "";
    }
    getDefinitions() {
        return Array.from(this.tools.values()).map((t) => t.definition);
    }
    async execute(name, args) {
        const handler = this.tools.get(name);
        if (!handler) {
            return {
                tool_call_id: "",
                content: `Error: Tool '${name}' not found. Available tools: ${Array.from(this.tools.keys()).join(", ")}`,
                isError: true,
            };
        }
        try {
            const output = await handler.execute(args);
            return {
                tool_call_id: "",
                content: output,
                isError: false,
            };
        }
        catch (err) {
            return {
                tool_call_id: "",
                content: `Error executing tool '${name}': ${err.message || String(err)}`,
                isError: true,
            };
        }
    }
    resolvePath(filePath) {
        const root = this.workspaceRoot || "";
        if (!root) {
            throw new Error("No active workspace directory set.");
        }
        const resolved = path.isAbsolute(filePath) ? path.resolve(filePath) : path.resolve(root, filePath);
        const normalizedRoot = path.resolve(root);
        if (resolved !== normalizedRoot && !resolved.startsWith(normalizedRoot + path.sep)) {
            throw new Error(`Security restriction: access to '${filePath}' outside workspace root is denied.`);
        }
        return resolved;
    }
    assertNotProtected(filePath) {
        const root = this.workspaceRoot || "";
        const resolved = path.isAbsolute(filePath) ? path.resolve(filePath) : path.resolve(root, filePath);
        const normalizedRel = root ? path.relative(path.resolve(root), resolved).replace(/\\/g, "/") : filePath.replace(/\\/g, "/");
        const PROTECTED_FILES = [
            "docs/experiment.md",
            "docs/llm.md",
            "agent/PROTOCOL.md",
            "agent/SKILL.md",
            "agent/VARIABLES.md",
        ];
        if (PROTECTED_FILES.some((p) => normalizedRel === p || normalizedRel.endsWith("/" + p))) {
            throw new Error(`Security Policy Violation: '${filePath}' is a protected user or extension specification file and cannot be modified by the agent. Record runtime logs in 'docs/notes.md' and biological findings in 'docs/observations.md'.`);
        }
    }
    registerDefaultTools() {
        // 1. execute_command
        this.tools.set("execute_command", {
            definition: {
                name: "execute_command",
                description: "Executes a shell command in the workspace directory (e.g. running Rscript code/01_inspect_dataset.R). Captures stdout and stderr.",
                parameters: {
                    type: "object",
                    properties: {
                        command: {
                            type: "string",
                            description: "The shell command line to run",
                        },
                        timeoutMs: {
                            type: "number",
                            description: "Optional execution timeout in milliseconds (default: 600000ms / 10m)",
                        },
                    },
                    required: ["command"],
                },
            },
            execute: async (args) => {
                const timeout = args.timeoutMs || 600000;
                try {
                    const effectiveCwd = this.workspaceRoot;
                    if (!effectiveCwd) {
                        throw new Error("Cannot execute command: No active workspace directory is configured.");
                    }
                    const defaultShell = process.platform === "win32"
                        ? undefined
                        : (process.env.SHELL && fsSync.existsSync(process.env.SHELL)
                            ? process.env.SHELL
                            : (fsSync.existsSync("/bin/bash") ? "/bin/bash" : "/bin/sh"));
                    const { stdout, stderr } = await execAsync(args.command, {
                        cwd: effectiveCwd,
                        timeout,
                        maxBuffer: 10 * 1024 * 1024,
                        shell: defaultShell,
                    });
                    let result = "";
                    if (stdout)
                        result += `STDOUT:\n${stdout}\n`;
                    if (stderr)
                        result += `STDERR:\n${stderr}\n`;
                    return result.trim() || "Command executed successfully with no console output.";
                }
                catch (error) {
                    let errOutput = `Command failed with exit code ${error.code ?? "unknown"}\n`;
                    if (error.stdout)
                        errOutput += `STDOUT:\n${error.stdout}\n`;
                    if (error.stderr)
                        errOutput += `STDERR:\n${error.stderr}\n`;
                    if (error.message)
                        errOutput += `Error message: ${error.message}\n`;
                    return errOutput;
                }
            },
        });
        // 2. read_file
        this.tools.set("read_file", {
            definition: {
                name: "read_file",
                description: "Reads file content from the workspace with optional startLine and maxLines for context economy.",
                parameters: {
                    type: "object",
                    properties: {
                        filePath: {
                            type: "string",
                            description: "Relative or absolute path to the file to read",
                        },
                        startLine: {
                            type: "number",
                            description: "Optional 1-based start line number",
                        },
                        maxLines: {
                            type: "number",
                            description: "Optional maximum lines to read (prevents dumping large logs or tables)",
                        },
                    },
                    required: ["filePath"],
                },
            },
            execute: async (args) => {
                const fullPath = this.resolvePath(args.filePath);
                const start = Math.max(1, args.startLine || 1);
                const max = Math.max(1, args.maxLines || 2000);
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
                return `File: ${args.filePath} (Lines ${start}-${endLine} of ${totalLines}):\n${selected.join("\n")}`;
            },
        });
        // 3. write_file
        this.tools.set("write_file", {
            definition: {
                name: "write_file",
                description: "Creates or overwrites a file in the workspace with new content.",
                parameters: {
                    type: "object",
                    properties: {
                        filePath: {
                            type: "string",
                            description: "Relative path to the file to write",
                        },
                        content: {
                            type: "string",
                            description: "Complete text content to write into the file",
                        },
                    },
                    required: ["filePath", "content"],
                },
            },
            execute: async (args) => {
                this.assertNotProtected(args.filePath);
                const fullPath = this.resolvePath(args.filePath);
                await fs.mkdir(path.dirname(fullPath), { recursive: true });
                await fs.writeFile(fullPath, args.content, "utf-8");
                return `Successfully wrote ${args.content.length} characters to ${args.filePath}`;
            },
        });
        // 4. replace_file_content
        this.tools.set("replace_file_content", {
            definition: {
                name: "replace_file_content",
                description: "Replaces an exact target substring with replacement content in an existing file. Note: For analysis scripts and files under 150 lines, prefer 'write_file' to overwrite the complete file cleanly and avoid whitespace mismatch errors.",
                parameters: {
                    type: "object",
                    properties: {
                        filePath: {
                            type: "string",
                            description: "Relative path to the file to edit",
                        },
                        targetContent: {
                            type: "string",
                            description: "Exact substring to find and replace",
                        },
                        replacementContent: {
                            type: "string",
                            description: "New content to replace the target substring with",
                        },
                    },
                    required: ["filePath", "targetContent", "replacementContent"],
                },
            },
            execute: async (args) => {
                this.assertNotProtected(args.filePath);
                const fullPath = this.resolvePath(args.filePath);
                const content = await fs.readFile(fullPath, "utf-8");
                if (!content.includes(args.targetContent)) {
                    throw new Error(`Target content was not found in ${args.filePath}. Ensure exact whitespace and line match.`);
                }
                const updated = content.replace(args.targetContent, () => args.replacementContent);
                await fs.writeFile(fullPath, updated, "utf-8");
                return `Successfully replaced content in ${args.filePath}`;
            },
        });
        // 5. list_directory
        this.tools.set("list_directory", {
            definition: {
                name: "list_directory",
                description: "Lists files and folders inside a given workspace directory.",
                parameters: {
                    type: "object",
                    properties: {
                        dirPath: {
                            type: "string",
                            description: "Relative path to directory to inspect (e.g. 'data', 'logs', 'code')",
                        },
                    },
                    required: ["dirPath"],
                },
            },
            execute: async (args) => {
                const fullPath = this.resolvePath(args.dirPath || ".");
                const entries = await fs.readdir(fullPath, { withFileTypes: true });
                const list = entries.map((e) => `${e.isDirectory() ? "[DIR]" : "[FILE]"} ${e.name}`).join("\n");
                return `Directory '${args.dirPath}':\n${list || "(empty)"}`;
            },
        });
        // 6. check_checkpoint_gate
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
                            items: { type: "string" },
                        },
                    },
                    required: ["requiredFiles"],
                },
            },
            execute: async (args) => {
                const results = [];
                let allPassed = true;
                for (const file of args.requiredFiles) {
                    const fullPath = this.resolvePath(file);
                    if (file.includes("*")) {
                        const dir = path.dirname(fullPath);
                        const basePattern = path.basename(file);
                        try {
                            const entries = await fs.readdir(dir);
                            const regexStr = "^" + basePattern.replace(/[-/\\^$+?.()|[\]{}]/g, "\\$&").replace(/\\\*/g, ".*") + "$";
                            const regex = new RegExp(regexStr);
                            const matched = entries.filter((e) => regex.test(e));
                            if (matched.length > 0) {
                                let anyValid = false;
                                for (const m of matched) {
                                    const s = await fs.stat(path.join(dir, m));
                                    if (s.size > 0) {
                                        anyValid = true;
                                        results.push(`PASS: ${path.join(path.dirname(file), m)} (size: ${s.size} bytes)`);
                                    }
                                }
                                if (!anyValid) {
                                    results.push(`FAIL: ${file} matched files but all had 0 bytes`);
                                    allPassed = false;
                                }
                            }
                            else {
                                results.push(`FAIL: ${file} matched 0 files in directory`);
                                allPassed = false;
                            }
                        }
                        catch {
                            results.push(`FAIL: Directory for ${file} does not exist`);
                            allPassed = false;
                        }
                    }
                    else {
                        try {
                            const stat = await fs.stat(fullPath);
                            if (stat.size > 0) {
                                results.push(`PASS: ${file} (size: ${stat.size} bytes)`);
                            }
                            else {
                                results.push(`FAIL: ${file} exists but has 0 bytes`);
                                allPassed = false;
                            }
                        }
                        catch {
                            results.push(`FAIL: ${file} does not exist`);
                            allPassed = false;
                        }
                    }
                }
                return `Checkpoint Gate Status: ${allPassed ? "ALL CHECKPOINTS PASSED" : "GATE FAILED"}\n${results.join("\n")}`;
            },
        });
        // 7. complete_phase
        this.tools.set("complete_phase", {
            definition: {
                name: "complete_phase",
                description: "Signals that the current phase's objectives, code execution, and quality gates have completed successfully.",
                parameters: {
                    type: "object",
                    properties: {
                        phaseName: {
                            type: "string",
                            description: "The name or filename of the completed phase",
                        },
                        summary: {
                            type: "string",
                            description: "Structured summary of findings, verified outputs, and gate status to update notes.md",
                        },
                    },
                    required: ["phaseName", "summary"],
                },
            },
            execute: async (args) => {
                return `PHASE_COMPLETED: ${args.phaseName}\nSummary:\n${args.summary}`;
            },
        });
    }
}
exports.ToolRegistry = ToolRegistry;
//# sourceMappingURL=ToolRegistry.js.map