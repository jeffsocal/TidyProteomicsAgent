---
tools: [tpa_health, tpa_set_workspace]
---

### Phase 0: System Installation, Environment Readiness & Workspace Gates

Execute workspace validation, enforce research specification gates, and establish the runtime tracking blackboard. You must strictly enforce all checkpoints below before allowing downstream analysis to proceed.

---

#### Phase 0.1: Subdirectory & Project Scaffolding Verification
- [ ] Verify that all standard project subdirectories exist in the workspace root:
  - `analysis/` (contains pipeline markdown task specifications)
  - `code/` (contains executable analysis R scripts)
  - `docs/` (contains runtime notes, model specifications, and experimental hypothesis)
  - `agent/` (contains protocol definitions and dataset parameters)
  - `data/` and `data/raw/` (stores imported and processed data artifacts)
  - `logs/` (stores persistent execution logs)
  - `tools/` (contains utility scripts like `tools/lint_tidyproteomics.R`)
- [ ] If any of the required directories are missing, create them immediately using `mkdir -p`.
- [ ] *Portability Note*: When checking files and directories, use standard POSIX tests (`test -d <dir>`, `test -f <file>`, or `ls`) rather than non-portable commands such as `head -c 0` (which fails on macOS BSD coreutils).


#### Phase 0.2: User Study Specification & Dataset Parameters Gate
- [ ] **Verify `docs/experiment.md`**:
  - Check that `docs/experiment.md` exists and defines both the dataset parameters and the experimental hypothesis/study design:
    - **Dataset Parameters**:
      - `PATH_TO_DATA_FILE`: Must NOT contain `[REQUIRED:` or placeholder tokens. If local path, confirm the file exists; if URL (HTTP/HTTPS), confirm it is a well-formed URL.
      - `PLATFORM`: Must NOT contain `[REQUIRED:`. Must specify the mass spectrometry search platform (e.g. `ProteomeDiscoverer`, `MaxQuant`, `DIA-NN`, `Spectronaut`, `FragPipe`, or `tidyproteomics` / `rds` for pre-processed R data objects).
      - `ANALYTE`: Must NOT contain `[REQUIRED:`. Must specify either `proteins` or `peptides` (or state analyte inherited from pre-processed RDS object).
    - **Hypothesis & Study Design**:
      - Must contain the researcher's experimental hypothesis, biological model, and study design.
      - **Gate Check**: Verify that Section 1 parameters (`PATH_TO_DATA_FILE`, `PLATFORM`, `ANALYTE`) and Section 2 (`Hypothesis`) do **NOT** contain unedited `[REQUIRED:` placeholder values and are not blank or whitespace-only. Do not fail on instructional comments `<!-- ... -->`.
  - *If any required parameter is missing, retains a placeholder, or is blank*: HALT immediately with status `failed`. Record the gate failure in `docs/notes.md` and invoke:
    `fail_phase(phaseName = "00_INSTALL", reason = "Pre-flight Gate Failed: docs/experiment.md contains unconfigured placeholders", actionableInsights = "Please configure PATH_TO_DATA_FILE, PLATFORM, ANALYTE, and your study hypothesis in docs/experiment.md before rerunning Phase 0.")`
    Provide clear actionable insights in your response explaining what placeholders remain unconfigured and how the researcher should configure `docs/experiment.md`.

#### Phase 0.3: Initialize Blackboard (`docs/notes.md`)
- [ ] Verify or initialize `docs/notes.md` runtime notes:
  - Verify that `docs/notes.md` exists on disk (the orchestration harness automatically initializes and maintains timestamps, durations, token counts, and phase status headers).
  - You do NOT need to calculate or track execution token counts or run durations; telemetry is owned entirely by the orchestrator.

#### Phase 0.4: MCP Environment & Runtime Health Verification
- [ ] Verify connectivity and health of the live TidyProteomics MCP Server:
  - Invoke `tpa_health()`.
  - Confirm that the server status reports healthy, exposing the R runtime version and active `tidyproteomics` package version.
- [ ] Configure the active project workspace root:
  - Invoke `tpa_set_workspace(workspace = "<workspace_root>")`.
- [ ] Check that output is mirrored into `logs/00_install/console.log` confirming that all containerized R dependencies, Bioconductor packages, and tidyproteomics functions are operational.

#### Phase 0.5: Checkpoint Verification & State Recording
- [ ] **Checkpoint 0.1 (Workspace & Readiness Gate)**:
  1. All subdirectories (`analysis/`, `code/`, `docs/`, `agent/`, `data/`, `logs/`, `tools/`) are verified on disk.
  2. `docs/experiment.md` is verified to contain valid `PATH_TO_DATA_FILE`, `PLATFORM`, and `ANALYTE` dataset parameters and non-placeholder user hypothesis/study content.
  3. `logs/00_install/console.log` exists on disk with non-zero file size confirming MCP server health and active runtime versions.
  4. `docs/notes.md` exists on disk.
- [ ] **Phase Gate Failure Handling**:
  - If any checkpoint or pre-flight gate cannot be satisfied, invoke `fail_phase(phaseName = "00_INSTALL", reason = "<REASON>", actionableInsights = "<ACTIONABLE_STEPS>")` to halt execution cleanly and provide actionable next steps.
- [ ] **Complete Phase**:
  - If all checkpoints pass, invoke `complete_phase(phaseName = "00_INSTALL", summary = "Workspace verification passed. All subdirectories present, experiment hypothesis and dataset parameters configured in docs/experiment.md, and MCP runtime server verified healthy in logs/00_install/console.log.")`
