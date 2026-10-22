---
skills:
  - TIDYPROTEOMICS_CORE
  - TIDYPROTEOMICS_IMPORT_INSPECT
---

### Phase 1: Data Ingestion & Exploratory Quality Inspection

Construct and execute `code/01_inspect.R`, capturing full execution output to `logs/01_inspect/console.log` (e.g. `mkdir -p logs/01_inspect && Rscript code/01_inspect.R 2>&1 | tee logs/01_inspect/console.log`). You must strictly enforce all checkpoints below.

---

#### Phase 1.1: Data Ingestion
- [ ] Construct and execute `code/01_inspect.R`, piping stdout and stderr to generate `logs/01_inspect/console.log` (e.g. `mkdir -p logs/01_inspect && Rscript code/01_inspect.R 2>&1 | tee logs/01_inspect/console.log`).
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
- [ ] **Qualitative Binary Switch Detection & Feature Overlap Profiling (`plot_venn` / `plot_euler`)**:
  Inspect condition-unique presence/absence (proteins detected exclusively in one biological group vs another prior to imputation):
  ```r
  # Generate feature overlap visualization across sample groups:
  invisible(tryCatch(data %>% plot_venn(destination = "png"), error = function(e) {
    tryCatch(data %>% plot_euler(destination = "png"), error = function(e2) NULL)
  }))
  for (f in list.files(pattern = "^plot_.*_(venn|euler)\\.png$")) {
    file.rename(f, file.path("data", f))
  }
  ```
- [ ] **Checkpoint 1.2**: Verify that replicate counts, quantifiable fractions, replicate CV distributions, missingness metrics, and feature overlap / binary switch profiles are printed to stdout and recorded in `logs/01_inspect/console.log`.

#### Phase 1.3: Annotation, Metadata Heuristics & Sample Inventory Enforcement
- [ ] Extract and inspect sample group designations:
  ```r
  sample_names <- get_sample_names(data)
  print(sample_names)
  ```
- [ ] **Automated Metadata Heuristics & Study Structure Parser**:
  Inspect raw acquisition file names (`data$experiments$sample_file`) to discover hidden study structure, donor pairings, technical cuts, and cross-batch bridge samples:
  ```r
  parse_sample_metadata <- function(files) {
    sub_matches <- regmatches(files, regexec("(Sample|Donor|Patient|Subject)[-_ ]?([0-9]+)([a-zA-Z])?", files, ignore.case = TRUE))
    batch_matches <- regmatches(files, regexec("(Batch[-_ ]?[0-9]+)", files, ignore.case = TRUE))
    date_matches <- regmatches(files, regexec("(20[12][0-9][01][0-9][0-3][0-9])", files))
    rep_matches <- regmatches(files, regexec("[-_ ](rep|run|tech|cut)[-_ ]?([0-9]+|[a-zA-Z])", files, ignore.case = TRUE))
    
    n <- length(files)
    subjects <- character(n)
    replicates <- character(n)
    batches <- character(n)
    
    for (i in seq_len(n)) {
      sm <- sub_matches[[i]]
      if (length(sm) >= 3) {
        subjects[i] <- paste0(sm[2], sm[3])
        replicates[i] <- if (length(sm) >= 4 && nzchar(sm[4])) sm[4] else "rep1"
      } else {
        subjects[i] <- paste0("Subject_", i)
        replicates[i] <- "rep1"
      }
      
      rm <- rep_matches[[i]]
      if (length(rm) >= 3 && replicates[i] == "rep1") {
        replicates[i] <- paste0(rm[2], rm[3])
      }
      
      bm <- batch_matches[[i]]
      dm <- date_matches[[i]]
      if (length(bm) >= 2 && nzchar(bm[2])) {
        batches[i] <- bm[2]
      } else if (length(dm) >= 2 && nzchar(dm[2])) {
        batches[i] <- paste0("Batch_", dm[2])
      } else {
        batches[i] <- "Batch1"
      }
    }
    
    data.frame(
      sample_file = files,
      subject_id = subjects,
      replicate_id = replicates,
      batch = batches,
      stringsAsFactors = FALSE
    )
  }

  parsed_meta <- parse_sample_metadata(data$experiments$sample_file)
  data$experiments$subject_id <- parsed_meta$subject_id
  data$experiments$replicate_id <- parsed_meta$replicate_id
  data$experiments$batch <- parsed_meta$batch

  n_files <- nrow(data$experiments)
  n_subjects <- length(unique(data$experiments$subject_id))
  n_batches <- length(unique(data$experiments$batch))
  cat(sprintf("Discovered Study Structure: %d raw files mapping to %d unique biological subjects across %d batches.\n",
              n_files, n_subjects, n_batches))

  # Audit pairings, bridge samples, and technical replicates:
  subj_by_cond <- split(data$experiments$sample, data$experiments$subject_id)
  paired_subjs <- names(subj_by_cond)[sapply(subj_by_cond, function(x) length(unique(x)) > 1)]
  subj_by_batch <- split(data$experiments$batch, data$experiments$subject_id)
  bridge_subjs <- names(subj_by_batch)[sapply(subj_by_batch, function(x) length(unique(x)) > 1)]
  tech_subjs <- names(which(sapply(subj_by_cond, function(x) length(x) > length(unique(x)))))

  cat("Paired subjects across groups: ", ifelse(length(paired_subjs), paste(paired_subjs, collapse = ", "), "none"), "\n")
  cat("Bridge subjects across batches: ", ifelse(length(bridge_subjs), paste(bridge_subjs, collapse = ", "), "none"), "\n")
  cat("Technical cuts within group: ", ifelse(length(tech_subjs), paste(tech_subjs, collapse = ", "), "none"), "\n")
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
  1. `logs/01_inspect/console.log` (or `logs/01_inspect.log`) exists on disk with non-zero file size.
  2. `data/tidyproteomics_data.rds` exists on disk with non-zero file size and populated `subject_id`, `replicate_id`, and `batch` metadata.
  3. `sample_names` confirms the exact naming of control and treatment/perturbation conditions.
  4. `annot_terms` outputs all functional category names available in the dataset (e.g., Gene Ontology, Reactome, UniProt keywords).
  5. Count diagnostic plot (`data/plot_proteins_counts.png` or `data/plot_peptides_counts.png`) exists in `data/` with non-zero file size (along with optional `data/plot_*_venn.png` or `data/plot_*_euler.png` if generated).

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
      1. Section 3.A: Label with `ℹ️ [AUTO-GENERATED REFERENCE - READ ONLY]:` and list:
         - Discovered biological subjects vs raw files count (`<N>` unique subjects across `<M>` raw files).
         - Paired donor detection (flagging subjects detected in multiple condition groups).
         - Cross-batch bridge samples (flagging subjects acquired across multiple batches).
         - Technical replicates / cuts (flagging subjects with duplicate injections/cuts within group).
         - Discovered sample groups table with raw file counts and unique subject counts.
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
