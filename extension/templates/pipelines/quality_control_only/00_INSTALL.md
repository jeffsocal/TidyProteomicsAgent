### Phase 0: System Installation, Environment Readiness & Workspace Gates

Execute workspace validation, enforce research specification gates, and establish the runtime tracking blackboard. You must strictly enforce all checkpoints below before allowing downstream analysis to proceed.

---

#### Phase 0.1: Subdirectory & Project Scaffolding Verification
- [ ] Verify that all standard project subdirectories exist in the workspace root:
  - `analysis/` (contains pipeline markdown task specifications)
  - `code/` (contains executable analysis R scripts and `code/00_environment.R`)
  - `docs/` (contains runtime notes, model specifications, and experimental hypothesis)
  - `agent/` (contains protocol definitions and dataset parameters)
  - `data/` and `data/raw/` (stores imported and processed data artifacts)
  - `logs/` (stores persistent execution logs)
  - `tools/` (contains utility scripts like `tools/lint_tidyproteomics.R`)
- [ ] If any of the required directories are missing, create them immediately using `mkdir -p`.
- [ ] Confirm that `code/00_environment.R` exists on disk.

#### Phase 0.2: User Study Specification & Dataset Parameters Gate
- [ ] **Verify `docs/experiment.md`**:
  - Check that `docs/experiment.md` exists and defines both the dataset parameters and the experimental hypothesis/study design:
    - **Dataset Parameters**:
      - `PATH_TO_DATA_FILE`: Must NOT contain `[REQUIRED:` or placeholder tokens. If local path, confirm the file exists; if URL (HTTP/HTTPS), confirm it is a well-formed URL.
      - `PLATFORM`: Must NOT contain `[REQUIRED:`. Must specify the mass spectrometry search platform (e.g. `ProteomeDiscoverer`, `MaxQuant`, `DIA-NN`, `Spectronaut`, `FragPipe`).
      - `ANALYTE`: Must NOT contain `[REQUIRED:`. Must specify either `proteins` or `peptides`.
    - **Hypothesis & Study Design**:
      - Must contain the researcher's experimental hypothesis, biological model, and study design.
      - **Gate Check**: Verify that `docs/experiment.md` does **NOT** contain unedited `[REQUIRED:` placeholder tokens anywhere in the file and is not blank or whitespace-only.
  - *If any parameter is missing, placeholder, or blank*: HALT immediately with status `failed`. Prompt the user with:
    > "❌ **Pre-flight Gate Failed**: `docs/experiment.md` contains unconfigured placeholders. Please configure `PATH_TO_DATA_FILE`, `PLATFORM`, `ANALYTE`, and your study hypothesis in `docs/experiment.md` before rerunning Phase 0."

#### Phase 0.3: Initialize Blackboard (`docs/notes.md`)
- [ ] Verify or initialize `docs/notes.md` runtime notes:
  - Verify that `docs/notes.md` exists on disk (the orchestration harness automatically initializes and maintains timestamps, durations, token counts, and phase status headers).
  - You do NOT need to calculate or track execution token counts or run durations; telemetry is owned entirely by the orchestrator.

#### Phase 0.4: Environment & Package Readiness Verification
- [ ] Execute the pre-flight environment script from the project root, piping stdout and stderr to `logs/00_install.log` (or `logs/00_setup.log`):
  ```bash
  Rscript code/00_environment.R 2>&1 | tee logs/00_install.log
  ```
- [ ] Verify that all required CRAN packages (`dplyr`, `ggplot2`, `knitr`, etc.), Bioconductor packages (`limma`, `fgsea`, etc.), and GitHub package (`jeffsocal/tidyproteomics`) are installed and load cleanly.
- [ ] Confirm that `logs/00_install.log` exposes the active R version, tidyproteomics version, and the versions of all installed dependencies.

#### Phase 0.5: Checkpoint Verification & State Recording
- [ ] **Checkpoint 0.1 (Workspace & Readiness Gate)**:
  1. All subdirectories (`analysis/`, `code/`, `docs/`, `agent/`, `data/`, `logs/`, `tools/`) are verified on disk.
  2. `docs/experiment.md` is verified to contain valid `PATH_TO_DATA_FILE`, `PLATFORM`, and `ANALYTE` dataset parameters and non-placeholder user hypothesis/study content.
  3. `logs/00_install.log` (or `logs/00_setup.log`) exists on disk with non-zero file size and script exit status 0.
  4. The log ends with `Setup complete! All required packages are ready to use.`.
  5. `docs/notes.md` exists on disk.
- [ ] **Complete Phase**:
  - Invoke `complete_phase(phaseName = "00_INSTALL", summary = "Workspace verification passed. All subdirectories present, experiment hypothesis and dataset parameters configured in docs/experiment.md, and all R packages verified in logs/00_install.log.")`
