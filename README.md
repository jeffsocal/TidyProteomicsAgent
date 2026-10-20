# TidyProteomicsAgent

[![Version](https://img.shields.io/badge/version-0.1.0-blue.svg)](./extension/package.json)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![VS Code](https://img.shields.io/badge/VS%20Code-%5E1.85.0-brightgreen.svg)](./extension/package.json)

**TidyProteomicsAgent** (v0.1.0) is an autonomous, phase-gated agentic reasoning extension for VS Code designed for reproducible, publication-grade computational proteomics pipelines using [`tidyproteomics`](https://github.com/jeffsocal/tidyproteomics) in R.

Unlike traditional conversational coding agents that accumulate tool executions, terminal outputs, and intermediate data files into an ever-growing conversation window, TidyProteomicsAgent enforces **Strict Context Partitioning**. Each analysis phase runs in an isolated sub-loop with a pristine context window, using persistent disk artifacts as a shared blackboard.

---

## Architecture & Concept

The diagram below illustrates the core execution architecture:

```
┌────────────────────────────────────────────────────────────────────────┐
│                   PERSISTENT GLOBAL FRAME (Cached)                     │
│  - System Directives (agent/PROTOCOL.md)                               │
│  - Skill Knowledge Base (agent/SKILL.md ~63 KB)                        │
│  - Curated Biology Context (agent/BIOLOGY.md - Optional)               │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                       ┌────────────┴────────────┐
                       │  Pipeline Orchestrator  │
                       └────────────┬────────────┘
                                    │
        ┌───────────────────────────┼───────────────────────────┐
        ▼                           ▼                           ▼
┌───────────────┐           ┌───────────────┐           ┌───────────────┐
│ Sub-Loop: P1  │           │ Sub-Loop: P2  │           │ Sub-Loop: P3  │
│ 01_INSPECT.md │  Passed   │ 02_NORMALIZE  │  Passed   │ 03_IMPUTE...  │
│ (Isolated     ├──────────►│ (Fresh Context├──────────►│ (Fresh Context│
│  Tool History)│           │  Tool History)│           │  Tool History)│
└───────┬───────┘           └───────┬───────┘           └───────┬───────┘
        │ Writes                    │ Writes                    │ Writes
        ▼                           ▼                           ▼
┌───────────────────────────────────────────────────────────────────────────────┐
│                     SHARED BLACKBOARD (Disk State)                            │
│  - docs/notes.md (Runtime tracker, telemetry, phase status headers)           │
│  - docs/llm.md (Active Model Summary & Agent Specification - Read-Only)       │
│  - docs/experiment.md (User hypothesis, study design, contrasts - Read-Only)  │
│  - data/tidyproteomics_data.rds (Serialized tidyproteomics R data object)     │
│  - logs/01_*.log, logs/02_*.log (Persistent stdout/stderr execution logs)     │
└───────────────────────────────────────────────────────────────────────────────┘
```

### Three Architectural Pillars

1. **Persistent Global Frame (Cached Prefix)**:
   - System Directives & Protocol Guidelines (`agent/PROTOCOL.md`)
   - Domain Skill Knowledge Base & API Conventions (`agent/SKILL.md` ~63 KB)
   - Configured with provider-level **Prompt Caching** (e.g. Anthropic Ephemeral Caching or Gemini Context Caching) for rapid turnarounds and significant token cost reduction (often >80% prompt token cache hits).

2. **Shared Blackboard (Persistent Disk State)**:
   - `docs/notes.md`: Runtime tracking blackboard automatically recording durations, token usage, and phase status.
   - `docs/experiment.md`: Unified researcher-defined specification containing **Input Dataset Parameters** (`PATH_TO_DATA_FILE`, `PLATFORM`, `ANALYTE`) and biological study hypothesis/contrasts.
   - `data/tidyproteomics_data.rds`: Standardized, serialized R data object shared between phases.
   - `logs/*.log`: Complete persistent execution logs capturing stdout and stderr.

3. **Isolated Phase Reasoning Loops (`analysis/*.md`)**:
   - Each phase executes sequentially in a sandboxed, isolated loop.
   - Tool calls, command executions, and self-correction cycles remain local to the active phase.
   - Upon satisfying phase verification gates, the local turn history is discarded.
   - Subsequent phases start with fresh context windows reading verified disk state, eliminating context degradation and hallucinations.

---

## Features

- **Built-in Pipeline Templates**:
  - 🧬 **Standard Differential Expression (11 Phases)**: Full modular workflow from environment readiness (`00_INSTALL`), data inspection (`01_INSPECT`), normalization benchmarking (`02_NORMALIZE`), missingness assessment & imputation (`03_IMPUTE`), differential expression (`04_EXPRESSION`), functional annotation & pathway enrichment (`05_ENRICHMENT`), primary data observations (`06_OBSERVATIONS`), internal knowledge contextualization (`07_KNOWLEDGE`), web search corroboration (`08_WEBSEARCH`), literature database interrogation (`09_LITERATURE`), to publication-grade manuscript synthesis (`10_SYNTHESIS`).
  - 📊 **Quality Control & Exploration (2 Phases)**: Rapid exploratory data analysis, replicate CV evaluation, quantifiable fraction verification, and PCA separation.
- **One-Click Workspace Initialization**:
  - Open any empty directory in VS Code and initialize the complete study structure (`analysis/`, `code/`, `agent/`, `data/`, `docs/`, `logs/`, `tools/`, and `.gitignore`) with a single click.
- **Pre-Flight Research Gates (`00_INSTALL`)**:
  - Validates project folder structure.
  - Ensures the researcher has populated `docs/experiment.md` with dataset parameters (`PATH_TO_DATA_FILE`, `PLATFORM`, `ANALYTE`) and study hypotheses (rejecting unedited placeholder templates).
  - Tests R package availability (CRAN, Bioconductor, and `tidyproteomics`).
- **Multi-Provider LLM Integration**:
  - **Anthropic**: Full prompt caching support (`claude-3-7-sonnet-20250219`).
  - **Google Gemini**: Large context reasoning (`gemini-1.5-pro`).
  - **OpenRouter**: Access to open-source and hosted models (`deepseek-r1`, `llama-3.3-70b-instruct`).
  - **Remote / Local Ollama**: Local model execution without external API dependencies.
  - **OpenAI**: Native support for `gpt-4o` and compatible endpoints.
- **Lean, Zero-Dependency Extension**:
  - Built with native TypeScript and bundled via `esbuild` into a single, high-performance ~33 KB distribution bundle.
  - Real-time sidebar UI with execution ticker, token economy telemetry, live log stream, and interactive phase checklist.

---

## Workflow: Starting a New Analysis

1. **Open an Empty Directory**:
   In VS Code, select **File > Open Folder...** and choose an empty directory for your analysis (e.g. `~/Projects/Experiment_p97KD`).
2. **Initialize Pipeline**:
   In the TidyProteomicsAgent sidebar, choose your desired pipeline template from the dropdown (e.g. *Differential Expression*) and click **"✨ Initialize Working Directory"** (or use `Cmd+Shift+P` -> `TidyProteomicsAgent: Initialize Analysis Pipeline`).
3. **Configure Study Parameters**:
   - Edit `docs/experiment.md` (opened automatically in VS Code upon initialization) with your dataset path/URL, mass spectrometry platform, analyte, and study design/hypothesis.
4. **Run the Pipeline**:
   - Click **"▶ Run All Tasks"** to execute the autonomous end-to-end pipeline, or run individual phases selectively using **"RUN ▶"** on any task card.

---

## Repository Structure

```
TidyProteomicsAgent/
├── VERSION                            # Canonical semantic version declaration (0.1.0)
├── README.md                          # Project documentation and architecture guide
├── LICENSE                            # License
├── .gitignore                         # Repository gitignore rules
└── extension/                         # VS Code extension package
    ├── package.json                   # Extension manifest & commands
    ├── tsconfig.json                  # TypeScript configuration
    ├── esbuild.js                     # Bundle configuration
    ├── src/                           # Extension source code
    │   ├── extension.ts               # Extension lifecycle & command registration
    │   ├── types/index.ts             # Shared data models and interfaces
    │   ├── agent/                     # Agent loops, context assembly, chat logging
    │   ├── llm/                       # Multi-provider LLM API client
    │   ├── orchestrator/              # Phase sequencing & blackboard synchronization
    │   ├── tools/                     # Native tool execution & security sandbox
    │   └── ui/                        # Webview sidebar provider & view state
    ├── media/                         # Extension icons and UI assets
    ├── dist/                          # Compiled production bundle
    └── templates/                     # Workspace scaffolding templates
        ├── shared/                    # Boilerplate: 00_install.R, linter, protocols, .gitignore
        └── pipelines/                 # Pipeline phases: differential_expression/, quality_control_only/
```

---

## Developing & Debugging the Extension

1. Clone this repository and install extension dependencies:
   ```bash
   cd extension
   npm install
   ```
2. Build the extension:
   ```bash
   npm run build
   ```
3. Launch the Extension Development Host:
   - Press **`F5`** (or select **Run > Start Debugging** in VS Code).
   - In the new debug window, click the **TidyProteomicsAgent** robot icon in the Activity Bar.
   - Choose a target analysis folder via the **Directory** tab or initialize a pipeline to test changes.

---

## License

This project is licensed under the terms specified in [LICENSE](./LICENSE).