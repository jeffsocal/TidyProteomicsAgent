### Phase 2: Contaminant Filtering & Multi-Method Normalization Benchmarking

Construct and execute `code/02_normalize.R`, capturing full execution output to `logs/02_normalize.log` (e.g. `Rscript code/02_normalize.R 2>&1 | tee logs/02_normalize.log`). You must strictly enforce all checkpoints below.

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

#### Phase 2.2: Multi-Method Normalization Benchmarking
- Compute candidate normalizations:
  ```r
  norm_candidates <- data_filtered %>%
    normalize(.method = c("median", "linear", "loess", "limma"))
  ```
- Select optimal normalization model based on variance minimization and replicate concordance:
  ```r
  norm_data <- norm_candidates %>% select_normalization()
  summary(norm_data, "normalization")
  ```
- **Checkpoint 2.2**: Verify that `summary(norm_data, "normalization")` displays CV and PC1 metrics for each candidate method and identifies the selected optimal model.

#### Phase 2.3: Quantitative Variation Benchmarking & CV Reduction Verification
- Benchmark quantitative variation across normalization candidates:
  ```r
  if (length(get_quant_names(norm_data)) > 1) {
    invisible(norm_data %>% plot_variation_cv(destination = "png"))
  }
  invisible(norm_data %>% plot_pca(destination = "png"))
  ```
- Move generated diagnostic plots into `data/`:
  ```r
  plots <- list.files(pattern = "^plot_.*(variation|pca).*\\.png$")
  for (p in plots) {
    file.rename(p, file.path("data", p))
  }
  ```
- **Variation Audit Check**:
  - Inspect `summary(norm_data, "normalization")` output to confirm that the selected normalization method successfully reduced quantitative CV across replicates relative to raw/unnormalized abundance.
  - Confirm replicate clustering and condition separation in PCA scores.

#### Phase 2.4: Object Persistence & Blackboard Recording
- Persist the normalized dataset to disk:
  ```r
  saveRDS(norm_data, file = "data/tidyproteomics_data.rds")
  ```
- Record the following directly into `docs/notes.md`:
  - Selected normalization method (e.g., `loess`, `limma`, `median`).
  - Pre- and post-normalization replicate CV statistics demonstrating improvement.
  - PCA clustering observations (e.g. replicate tightness, PC1/PC2 variance explained).

#### Phase 2.5: Checkpoint Verification & State Recording
- [ ] **Checkpoint 2.5**:
  1. `logs/02_normalize.log` exists on disk with non-zero file size.
  2. `data/tidyproteomics_data.rds` exists on disk with non-zero file size and contains normalized abundance layers.
  3. PCA score plot (`data/plot_*_pca_PC1PC2.png`) exists on disk with non-zero file size.
  4. If multiple quantitative layers exist, variation plot (`data/plot_*_normalizated_variation.png`) exists on disk.
  5. `docs/notes.md` contains the normalization benchmark summary.
- [ ] **Complete Phase**:
  - Invoke `complete_phase(phaseName = "02_NORMALIZE", summary = "Normalization benchmarking completed. Selected optimal normalization method, verified CV reduction across replicates, generated PCA and variation plots, and persisted data/tidyproteomics_data.rds.")`
