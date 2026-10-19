### Phase 1: Data Ingestion & Exploratory Inspection
Construct and execute `code/01_data_quality.R`, capturing full execution output to `logs/01_data_quality.log` (e.g. `Rscript code/01_data_quality.R 2>&1 | tee logs/01_data_quality.log`). You must strictly enforce all checkpoints below.


---

#### Phase 1.1: Data Ingestion
- [ ] Construct and execute `code/01_data_quality.R`, piping stdout and stderr to generate `logs/01_data_quality.log` (e.g. `Rscript code/01_data_quality.R 2>&1 | tee logs/01_data_quality.log`).
- [ ] Load required libraries: `tidyproteomics` and `dplyr`.
- [ ] Ingest the raw quantitative dataset (substituting `{{PATH_TO_DATA_FILE}}`, `{{PLATFORM}}`, and `{{ANALYTE}}` with actual values from `docs/experiment.md`). If `{{PATH_TO_DATA_FILE}}` is a remote URL (starts with `http://` or `https://`), stage it locally into `data/raw/` first:
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
  data <- import(files = raw_file, platform = "{{PLATFORM}}", analyte = "{{ANALYTE}}")
  ```
- [ ] **Checkpoint 1.1**: Print the core object state via `print(data)`. Verify origin platform, dynamic range, percent missingness, and protein/peptide counts in stdout and log.

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
- [ ] **Checkpoint 1.2**: Verify that replicate counts, quantifiable fractions, replicate CV distributions, and PCA separation are printed to stdout and recorded in `logs/01_data_quality.log`.

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
  1. `logs/01_data_quality.log` exists on disk with non-zero file size.
  2. `data/tidyproteomics_data.rds` exists on disk with non-zero file size.
  3. `sample_names` confirms the exact naming of control and treatment/perturbation conditions.
  4. `annot_terms` outputs all functional category names available in the dataset (e.g., Gene Ontology, Reactome, UniProt keywords).

#### Phase 1.4: Experimental Alignment & Hypothesis Verification (`docs/experiment.md` is Read-Only)
- [ ] **READ-ONLY INSPECTION**: Inspect `docs/experiment.md` (user-maintained specification) to extract:
  1. **User Working Hypothesis & Rationale**: Understand the underlying biological inquiry.
  2. **Biological System & Model**: Note the expected cell line, tissue, or organism.
  3. **Investigated Target(s)**: Note the primary target gene/protein symbol and UniProt accession (e.g., VCP / P55072).
  4. **Decided Contrast Designations**: Note the user's defined control and treatment groups for downstream differential expression analysis (`treatment` vs `control`).
- [ ] **Data Alignment Check**: Cross-reference the user's defined contrast groups against the extracted `sample_names` in stdout. Confirm that the dataset contains the required sample conditions.
- [ ] **Blackboard Recording**:
  - **NEVER modify or overwrite `docs/experiment.md`** (it is strictly reserved for user/researcher modification).
  - Record the experimental alignment verification, confirmed contrast groups, and discovered target metadata directly into `docs/notes.md`.
- [ ] **Checkpoint 1.4 (Design Alignment Gate)**: Do not proceed to Phase 2 until `docs/experiment.md` has been verified, sample alignment is confirmed against `sample_names`, and the verification summary is recorded in `docs/notes.md`.
- [ ] **Complete Phase**:
  - Invoke `complete_phase(phaseName = "01_DATA_QUALITY", summary = "Data ingestion complete. Staged raw data, verified sample groups in sample_names, confirmed alignment with docs/experiment.md, and persisted data/tidyproteomics_data.rds.")`