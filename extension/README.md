# TidyProteomicsAgent: Phase-Gated Isolated Reasoning Extension

[![Version](https://img.shields.io/badge/version-0.1.0-blue.svg)](./package.json)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](../LICENSE)
[![VS Code](https://img.shields.io/badge/VS%20Code-%5E1.85.0-brightgreen.svg)](./package.json)

**TidyProteomicsAgent** (v0.1.0) is a lean, purpose-built VS Code extension architected for autonomous, reproducible computational pipelines (such as `tidyproteomics`).

Unlike standard conversational agents (e.g. Cline) that accumulate all file inspections, terminal outputs, and intermediate tool trajectories into a single, ever-growing conversation window, TidyProteomicsAgent enforces **Strict Context Partitioning**:

1. **Persistent Global Frame (Cached Prefix)**:
   - System Directives & Quality Gates (`agent/PROTOCOL.md`)
   - Full Skill / API Conventions (`agent/SKILL.md` ~63 KB)
   - Marked with provider-level **Prompt Caching** (e.g. Anthropic Ephemeral Caching or Gemini Context Caching) for fast, low-cost execution.

2. **Shared Blackboard (Persistent Disk State)**:
   - `docs/notes.md` (Progress tracking, durations, token statistics)
   - `docs/experiment.md` (Dataset parameters, target discovery, contrast groups, hypotheses)
   - `data/*.rds`, `logs/*.log`, `data/*.png` (Persistent artifacts)

3. **Isolated Phase Reasoning Loops (`analysis/*.md`)**:
   - Sequential, isolated phase executions:
     - `00_INSTALL.md`: System verification, package readiness & workspace gates
     - `01_INSPECT.md`: Data ingestion, replicate CV & exploratory quality inspection
     - `02_NORMALIZE.md`: Contaminant filtering & multi-method normalization benchmarking
     - `03_IMPUTE.md`: Missingness assessment (MAR vs MNAR) & quantitative imputation
     - `04_EXPRESSION.md`: Contrast modeling, moderated t-statistics (`limma`) & volcano plots
     - `05_ENRICHMENT.md`: Annotation adequacy assessment & multi-category pathway enrichment
     - `06_OBSERVATIONS.md`: Targeted data extraction & biological literature notes
     - `07_SYNTHESIS.md`: Publication-grade manuscript compilation
   - Tool calls, command executions, and self-correction retries stay local to the active phase.
   - Upon meeting phase checkpoints, the local trajectory is **completely discarded from memory**.
   - Subsequent phases start with a pristine, unpolluted context window reading only disk state!

---

## Architecture Overview

```
extension/
├── src/
│   ├── extension.ts                 # VS Code extension activation & commands
│   ├── types/index.ts               # Shared types, tool schemas, token trackers
│   ├── agent/
│   │   ├── ContextBuilder.ts       # Assembles static frame + blackboard + phase directive
│   │   └── AgentLoop.ts            # Isolated sub-loop with tool calling & self-correction
│   ├── tools/
│   │   └── ToolRegistry.ts         # Native tools: execute_command, read_file, write_file,
│   │                               # replace_file_content, list_directory, check_checkpoint_gate,
│   │                               # complete_phase
│   ├── llm/
│   │   └── ProviderClient.ts       # Multi-provider client: Anthropic (prompt-caching),
│   │                               # OpenRouter, Remote Hosted Ollama, Google Gemini, OpenAI
│   │                               # using native zero-dependency HTTP fetch
│   ├── orchestrator/
│   │   └── PipelineOrchestrator.ts # Sequential phase runner & notes.md logger
│   └── ui/
│       └── SidebarViewProvider.ts  # Webview UI with live terminal feed & token economy stats
├── esbuild.js                       # Fast bundling script (dist/extension.js is ~33KB)
├── package.json
└── tsconfig.json
```

---

## How to Test & Debug in VS Code

1. Open this workspace (`tidyllm_v02`) in VS Code.
2. Press **`F5`** (or go to **Run and Debug** -> Select **"Run TidyProteomicsAgent Extension"**).
3. A new **Extension Development Host** window will open.
4. Click on the **TidyProteomicsAgent** icon in the Activity Bar (left sidebar).
6. Configure your LLM provider:
   - **OpenRouter**: Select `OpenRouter`, enter your key (`sk-or-v1-...`), and specify any model like `anthropic/claude-3.7-sonnet`, `deepseek/deepseek-r1`, or `meta-llama/llama-3.3-70b-instruct`. Base URL defaults to `https://openrouter.ai/api/v1`.
   - **Remote Hosted Ollama**: Select `Remote Hosted Ollama`, set the Base URL to your server (e.g. `http://192.168.1.100:11434/v1`), and specify your model (e.g. `llama3.3:70b` or `qwen2.5:32b`). API Key is optional.
   - **Anthropic**: Select `Anthropic`, enter `sk-ant-...` with model `claude-3-7-sonnet-20250219` to benefit from automatic prompt caching.
   - **Google Gemini / OpenAI**: Directly supported with their respective API keys and endpoints.
7. Click **"Save Configuration"**.
8. Execute:
   - Click **"▶ Run All Phases"** to execute the autonomous pipeline end-to-end.
   - Or click **"Run Phase 1"**, **"Run Phase 2"**, etc., to execute and debug individual phases in isolation!

