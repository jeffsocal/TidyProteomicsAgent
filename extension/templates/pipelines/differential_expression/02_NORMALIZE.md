---
skills:
  - TIDYPROTEOMICS_CORE
  - TIDYPROTEOMICS_NORMALIZE_IMPUTE
---

### Phase 2: Contaminant Filtering & Multi-Method Normalization Benchmarking

Construct and execute `code/02_normalize.R`, capturing full execution output to `logs/02_normalize/console.log` (e.g. `mkdir -p logs/02_normalize && Rscript code/02_normalize.R 2>&1 | tee logs/02_normalize/console.log`). You must strictly enforce all checkpoints below.

---

#### Phase 2.1: Contaminant & Confidence Filtering
- Load persisted dataset from Phase 1:
  ```r
  data <- readRDS("data/tidyproteomics_data.rds")
  ```
- Filter out sample contaminants (if description annotations exist):
  ```r
  if ("description" %in% colnames(as.data.frame(data))) {
    data_filtered <- data %>% subset(!description %like% "CRAP|Trypsin")
  } else {
    data_filtered <- data
  }
  ```
- If analyte is `proteins` and peptide accounting is present, retain high-confidence identifications:
  ```r
  if (data_filtered$analyte == "proteins" && "num_unique_peptides" %in% colnames(as.data.frame(data_filtered))) {
    data_filtered <- data_filtered %>% subset(num_unique_peptides >= 2)
  }
  ```
- **Checkpoint 2.1**: Print `print(data_filtered)` to confirm removed contaminant count and remaining high-confidence IDs in stdout and log.

#### Phase 2.2: Multi-Method Normalization Benchmarking & Pass-Through Audit
- Check if normalization has already been applied in upstream operations:
  ```r
  ops <- operations(data_filtered)
  quants <- get_quant_names(data_filtered)
  already_normalized <- length(quants) > 1 || any(grepl("normalize", ops))

  if (already_normalized) {
    cat("Pre-existing normalization detected in tidyproteomics object history. Preserving upstream normalization to prevent double-scaling and variance distortion.\n")
    norm_data <- data_filtered
    print(norm_data)
    tryCatch(summary(norm_data, "normalization"), error = function(e) summary(norm_data))
  } else {
    cat("Benchmarking multi-method normalization models (median, linear, loess, limma)...\n")
    norm_candidates <- data_filtered %>%
      normalize(.method = c("median", "linear", "loess", "limma"))
    norm_data <- norm_candidates %>% select_normalization()
    summary(norm_data, "normalization")
  }
  ```
- **Checkpoint 2.2**: Verify that normalized abundances are confirmed in stdout and log (displaying CV and PC1 metrics for benchmarked candidates or confirming pre-existing normalized state).

#### Phase 2.3: Quantitative Variation Benchmarking & CV Reduction Verification
- Benchmark quantitative variation across normalization candidates:
  ```r
  if (length(get_quant_names(norm_data)) > 1) {
    invisible(norm_data %>% plot_variation_cv(destination = "png"))
  }
  invisible(norm_data %>% plot_pca(destination = "png"))

  # Optional / Discretionary unsupervised sample clustering heatmap:
  # Generates global sample-level clustering across replicates to inspect cohort separation:
  invisible(tryCatch(norm_data %>% plot_heatmap(destination = "png"), error = function(e) NULL))
  ```
- Move generated diagnostic plots into `data/`:
  ```r
  plots <- list.files(pattern = "^plot_.*(variation|pca|heatmap).*\\.png$")
  for (p in plots) {
    file.rename(p, file.path("data", p))
  }
  ```
- **Variation & Clustering Audit Check**:
  - Inspect summary output to confirm that the normalization method successfully minimized quantitative CV across replicates relative to raw abundance (or verified replicate stability for pre-normalized data).
  - Confirm replicate clustering and condition separation in PCA scores.
  - Interrogate top PCA loadings (identifying key proteins driving separation along PC1 and PC2) and global sample distance trends from the heatmap.

#### Phase 2.4: Object Persistence & Blackboard Recording
- Persist the normalized dataset to disk:
  ```r
  saveRDS(norm_data, file = "data/tidyproteomics_data.rds")
  ```
- Record the following directly into `docs/notes.md`:
  - Normalization method (e.g., `loess`, `limma`, `median`, or verified pre-existing model).
  - Replicate CV statistics demonstrating variance minimization or replicate concordance.
  - PCA clustering observations (e.g. replicate tightness, PC1/PC2 variance explained, and leading proteins driving PC separation).
  - Unsupervised heatmap clustering trends (if generated).

#### Phase 2.5: Checkpoint Verification & State Recording
- [ ] **Checkpoint 2.5**:
  1. `logs/02_normalize/console.log` (or `logs/02_normalize.log`) exists on disk with non-zero file size.
  2. `data/tidyproteomics_data.rds` exists on disk with non-zero file size and contains normalized abundance layers.
  3. PCA score plot (`data/plot_*_pca_PC1PC2.png`) exists on disk with non-zero file size.
  4. If multiple quantitative layers exist, variation plot (`data/plot_*_normalizated_variation.png`) exists on disk (along with optional `data/plot_*_heatmap.png` if generated).
  5. `docs/notes.md` contains the normalization benchmark or verification summary.
- [ ] **Complete Phase**:
  - Invoke `complete_phase(phaseName = "02_NORMALIZE", summary = "Normalization benchmarking/verification completed. Confirmed normalized abundance state, verified replicate clustering on PCA (and sample heatmap if generated), generated diagnostic plots, and persisted data/tidyproteomics_data.rds.")`
