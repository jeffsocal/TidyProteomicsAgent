### Phase 1: Data Ingestion & Exploratory Quality Inspection

Construct and execute `code/01_inspect.R`, capturing full execution output to `logs/01_inspect.log` (e.g. `Rscript code/01_inspect.R 2>&1 | tee logs/01_inspect.log`). You must strictly enforce all checkpoints below.

---

#### Phase 1.1: Data Ingestion
- [ ] Construct and execute `code/01_inspect.R`, piping stdout and stderr to generate `logs/01_inspect.log` (e.g. `Rscript code/01_inspect.R 2>&1 | tee logs/01_inspect.log`).
- [ ] Load required libraries: `tidyproteomics` and `dplyr`.
- [ ] Ingest the quantitative dataset (substituting `{{PATH_TO_DATA_FILE}}`, `{{PLATFORM}}`, and `{{ANALYTE}}` with actual values from `docs/experiment.md`). If `{{PATH_TO_DATA_FILE}}` is a remote URL (starts with `http://` or `https://`), stage it locally into `data/raw/` first:
  ```r
  raw_file <- "{{PATH_TO_DATA_FILE}}"
  if (grepl("^https?://", raw_file)) {
    dir.create("data/raw", recursive = TRUE, showWarnings = FALSE)
    local_dest <- file.path("data/raw", basename(raw_file))
    if (!file.exists(local_dest)) {
      cat(sprintf("Downloading remote dataset to %s...\n", local_dest))
      download.file(raw_file, destfile = local_dest, mode = "wb")
    }
    raw_file <- local_dest
  }

  # Ingest pre-processed tidyproteomics RDS object or import raw platform output:
  if (grepl("\\.rds$", raw_file, ignore.case = TRUE) || tolower("{{PLATFORM}}") %in% c("tidyproteomics", "rds")) {
    cat(sprintf("Ingesting pre-processed tidyproteomics R data object from %s...\n", raw_file))
    data <- readRDS(raw_file)
  } else {
    data <- import(files = raw_file, platform = "{{PLATFORM}}", analyte = "{{ANALYTE}}")
  }
  ```
- [ ] **Audit Trail & Upstream Operations Discovery**:
  Interrogate the ingested object's operations history and quantitative layers to detect pre-existing processing:
  ```r
  ops <- operations(data)
  cat("=== UPSTREAM OPERATIONS AUDIT TRAIL ===\n")
  print(ops)

  quants <- get_quant_names(data)
  cat(sprintf("Available quantitative assays: %s\n", paste(quants, collapse = ", ")))

  has_normalization <- length(quants) > 1 || any(grepl("normalize", ops))
  has_imputation <- any(grepl("impute", ops)) || (sum(is.na(as.data.frame(data)$abundance_raw)) == 0)

  cat(sprintf("Pre-existing Normalization Detected: %s\n", has_normalization))
  cat(sprintf("Pre-existing Imputation Detected: %s\n", has_imputation))
  ```
- [ ] **Checkpoint 1.1**: Print the core object state via `print(data)`. Verify origin platform, dynamic range, percent missingness, protein/peptide counts, and upstream operations audit in stdout and log.

#### Phase 1.2: Sample Quality & Replicate Inspection
- [ ] Profile sample preparation contaminants using:
  ```r
  summary(data, contamination = "CRAP")
  ```
  *(CRITICAL: Always use the named parameter `contamination = "CRAP"`; never execute `summary(data, "contamination")`).*
- [ ] Run sample-level quality metrics:
  ```r
  summary(data, "sample")
  ```
- [ ] Generate identification counts diagnostic plot:
  ```r
  invisible(data %>% plot_counts(destination = "png"))
  for (f in list.files(pattern = "^plot_.*_counts\\.png$")) {
    file.rename(f, file.path("data", f))
  }
  ```
- [ ] **Checkpoint 1.2**: Verify that replicate counts, quantifiable fractions, replicate CV distributions, and missingness metrics are printed to stdout and recorded in `logs/01_inspect.log`.

#### Phase 1.3: Annotation & Sample Inventory Enforcement
- [ ] Extract and inspect sample group designations:
  ```r
  sample_names <- get_sample_names(data)
  print(sample_names)
  ```
- [ ] Query and print all available functional annotation terms:
  ```r
  annot_terms <- get_annotation_terms(data)
  cat("Annotation categories:\n")
  print(annot_terms)
  ```
- [ ] Persist the imported dataset to disk for downstream phases:
  ```r
  saveRDS(data, file = "data/tidyproteomics_data.rds")
  ```
- [ ] **Checkpoint 1.3 (Phase Gate & Log Verification)**:
  1. `logs/01_inspect.log` exists on disk with non-zero file size.
  2. `data/tidyproteomics_data.rds` exists on disk with non-zero file size.
  3. `sample_names` confirms the exact naming of control and treatment/perturbation conditions.
  4. `annot_terms` outputs all functional category names available in the dataset (e.g., Gene Ontology, Reactome, UniProt keywords).
  5. Count diagnostic plot (`data/plot_proteins_counts.png` or `data/plot_peptides_counts.png`) exists in `data/` with non-zero file size.

#### Phase 1.4: Experimental Alignment, Contrast Scaffolding & Hypothesis Verification
- [ ] **Inspect User Hypothesis & Parameters (`docs/experiment.md` Sections 1 & 2)**:
  - Extract the working hypothesis, biological model, and investigated target(s) / discovery scope from Sections 1 and 2.
  - **CRITICAL**: Never overwrite, modify, or delete Sections 1 or 2 of `docs/experiment.md` (reserved strictly for researcher input).
- [ ] **Sample Group & Batch Pattern Audit (`sample_names`)**:
  - Inspect the discovered `sample_names` output from Phase 1.3.
  - Check whether `sample_names` contain technical batch suffixes (e.g. `_batch\d+`, `_plate\d+`, `_run\d+`, `_rep\d+`), multiple technical replicates, or compound delimiters.
- [ ] **Proactive Section 3 Scaffolding in `docs/experiment.md`**:
  - Inspect Section 3 (`## 3. Sample Grouping, Recoding & Contrast Designations`) in `docs/experiment.md`.
  - If Section 3 contains `*(Pending Phase 1 data ingestion)*`, is missing, or contains unconfigured tables:
    - **Scaffold Section 3**: Update Section 3 of `docs/experiment.md` directly using standardized visual badges:
      1. Section 3.A: Label with `ℹ️ [AUTO-GENERATED REFERENCE - READ ONLY]:` and list all discovered sample groups with replicate counts.
      2. Section 3.B: Label with `👉 [USER REVIEW & EDIT TABLE]:`. If technical batch suffixes are detected (e.g. `active_necrotic granuloma_batch5`, `batch6`, `batch9` and `healthy_healthy_batch8`), provide a suggested **Sample Group Renaming & Pooling Map** table proposing clean biological names (e.g. stripping `_batch\d+` to pool into `active necrotic granuloma` and `healthy`), and add `👉 [USER TOGGLE]:` with `- **Reassign Sample Names According to Pooling Map**: TRUE`.
      3. Section 3.C: Label with `👉 [USER ACTION REQUIRED - DEFINE TARGET CONTRASTS]:` and suggest logical **Target Contrasts** based on the cleaned groups (e.g. `active necrotic granuloma` vs `healthy`).
      4. Section 3.D: Label with `⚠️ [PRE-FLIGHT GATE DECISION]:`. If disease condition is confounded with batch across cohorts (e.g. healthy only in batch 8, disease in batches 5/6/9), explicitly document the confounding in the template comments and set `- **Proceed With Potential Batch Confounding**: FALSE` as the scaffolded default awaiting researcher review. Setting this default does NOT fail or halt Phase 1 (confounding authorization gating belongs strictly in Phase 4).
  - If Section 3 already contains user-customized renaming or contrast definitions, preserve them exactly!
  - **Enforce Clean Boolean Values & Badge Preservation**: Preserve visual badges (`ℹ️ [AUTO-GENERATED REFERENCE]`, `👉 [USER ACTION REQUIRED]`, `⚠️ [PRE-FLIGHT GATE DECISION]`) and keep all boolean configuration toggles (`- **Reassign Sample Names According to Pooling Map**: TRUE` and `- **Proceed With Potential Batch Confounding**: FALSE`) strictly as clean booleans without appending conversational notes or explanations. Any notes must be placed in markdown comments `<!-- ... -->` or recorded in `docs/notes.md`.
- [ ] **Blackboard Recording**:
  - Record the experimental alignment verification, discovered sample inventory, proposed or confirmed contrast groups, discovered target metadata (or untargeted scope), baseline quality stats, and detected upstream operations (normalization and imputation status) directly into `docs/notes.md`. If pre-existing normalization or imputation is detected, explicitly record that Phase 2 (Normalization) and/or Phase 3 (Imputation) will execute in verification and metric-extraction pass-through mode to preserve upstream data transformations without double-scaling.
- [ ] **Checkpoint 1.4 (Design Alignment Gate)**: 
  - Verify that `sample_names` are confirmed, alignment with `docs/experiment.md` is verified, Section 3 is scaffolded with discovered sample groups, and the summary is recorded in `docs/notes.md`.
  - Setting `- **Proceed With Potential Batch Confounding**: FALSE` is the scaffolded default awaiting researcher review and does NOT fail or halt Phase 1. Phase 1 must NEVER invoke `fail_phase` for discovered groups, batch suffixes, or confounding.
- [ ] **Complete Phase**:
  - Once `docs/experiment.md` Section 3 is scaffolded, QC plots are generated, and `docs/notes.md` is updated, Phase 1 MUST invoke `complete_phase(phaseName = "01_INSPECT", ...)` to preserve all QC artifacts and allow baseline inspection:
    `complete_phase(phaseName = "01_INSPECT", summary = "Data ingestion complete. Ingested dataset, audited operations history, verified sample groups in sample_names, scaffolded sample grouping and contrast template in docs/experiment.md Section 3, generated count diagnostic plot, and persisted data/tidyproteomics_data.rds.")`
