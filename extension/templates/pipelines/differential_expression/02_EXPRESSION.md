### Phase 2: Quality Filtering, Normalization, & Statistical Pipeline
Based on the console output from Phase 1, construct and execute `code/02_expression.R`, capturing full execution output to `logs/02_expression.log` (e.g. `Rscript code/02_expression.R 2>&1 | tee logs/02_expression.log`). You must strictly enforce all checkpoints below.

---

#### Phase 2.1: Contaminant & Confidence Filtering
- Load persisted dataset from Phase 1:
  ```r
  data <- readRDS("data/tidyproteomics_data.rds")
  ```
- Filter out sample contaminants:
  ```r
  data_filtered <- data %>% subset(!description %like% "CRAP|Trypsin")
  ```
- If analyte is `proteins`, retain high-confidence identifications:
  ```r
  data_filtered <- data_filtered %>% subset(num_unique_peptides >= 2)
  ```
- **Checkpoint 2.1**: Print `print(data_filtered)` to confirm removed contaminant count and remaining high-confidence protein IDs.

#### Phase 2.2: Multi-Method Normalization Benchmarking & Imputation
- Compute candidate normalizations:
  ```r
  norm_candidates <- data_filtered %>%
    normalize(.method = c("median", "linear", "loess", "limma"))
  ```
- Select optimal normalization model:
  ```r
  norm_data <- norm_candidates %>% select_normalization()
  summary(norm_data, "normalization")
  ```
- Impute residual missing values using within-condition left-censored minimum:
  ```r
  imp_data <- norm_data %>%
    impute(.function = base::min, method = "column", group_by_sample = TRUE)
  ```
- **Checkpoint 2.2**: Verify that `summary(norm_data, "normalization")` displays CV and PC1 metrics, and confirm imputation completed without error.

#### Phase 2.3: Annotation Enrichment Enforcement (Strict Requirement)
You MUST execute enrichment mapping using all available annotation columns in the `tidyproteomics` object (e.g., Gene Ontology, pathways, localized components).

- **Constraint 1 (Vector Extraction & Terminal Verification)**:
  Extract the character vector of available annotation categories using `get_annotation_terms(imp_data)`:
  ```r
  available_terms <- get_annotation_terms(imp_data)
  cat("Available Annotation Categories:\n")
  print(available_terms)
  ```
- **Constraint 2 (Multi-Category Threshold Enforcement)**:
  Do not proceed to Phase 3 until at least 3 distinct annotation categories (e.g., `biological_process`, `cellular_component`, `molecular_function`, `reactome_pathway`, or `wiki_pathway`) have been queried and written to intermediary data variables. If fewer than 3 terms exist natively in the file, query all available categories or bind external annotations via `annotate()`.
  ```r
  # Select at least 3 terms (or all available if 3+):
  selected_terms <- intersect(
    available_terms,
    c("biological_process", "cellular_component", "molecular_function", "reactome_pathway", "wiki_pathway")
  )
  if(length(selected_terms) < 3) {
    selected_terms <- available_terms
  }
  stopifnot("Enrichment requires at least 3 distinct annotation categories" = length(selected_terms) >= 3 || length(available_terms) < 3)
  cat("Enrichment targeted terms:\n")
  print(selected_terms)
  ```

#### Phase 2.4: Differential Expression & Multi-Term Pathway Enrichment
- Define contrast pairs based on the experimental design and contrast groups decided in Phase 1 (`docs/experiment.md` and verified against `sample_names` in `logs/01_data_quality.log`). Formulate as a two-element list representing `treatment` vs `control`:
  ```r
  # Use your decided contrast groups (e.g. treatment = "p97_kd", control = "ctl"):
  treatment_group <- "<decided_treatment_group>"
  control_group <- "<decided_control_group>"
  pairs <- list(c(treatment_group, control_group))

  # For stratified / multi-tissue designs (e.g., recoded as paste(sample_tissue, sample, sep = "_")):
  # Define contrast pairs per stratum/tissue:
  # pairs <- list(
  #   c("brain_stem_necrotic", "brain_stem_control"),
  #   c("cortex_necrotic", "cortex_control")
  # )
  ```
- Compute differential expression via empirical Bayes moderation:
  ```r
  stat_data <- imp_data %>%
    expression(.pairs = pairs, .method = "limma")
  ```
- Execute multi-term enrichment across all selected terms:
  ```r
  enriched_data <- stat_data %>%
    enrichment(.pairs = pairs, .terms = selected_terms, .method = "wilcoxon", .cpu_cores = 4)
  ```
- **Checkpoint 2.4**:
  - Verify that expression contrasts and all targeted enrichment terms are successfully computed without errors and recorded in `operations(enriched_data)`.
  - **Conditional Normalization Variation Benchmarking**: `plot_variation_cv()` is only required when `length(get_quant_names(data)) > 1` (or when raw abundance is available alongside candidate normalizations for benchmarking). If only a single quantitative column/layer exists in the dataset, `plot_variation_cv()` must be skipped and `plot_proteins_normalizated_variation.png` is not required.

#### Phase 2.5: Automated Export, Diagnostic Plots, & Object Persistence
- **Cohort Quality Diagnostic Plots**:
  Save cohort QC and normalization benchmarking plots:
  ```r
  # Capture output to prevent print(data) console dumping
  invisible(norm_data %>% plot_counts(destination = "png"))
  if (length(get_quant_names(norm_data)) > 1) {
    invisible(norm_data %>% plot_variation_cv(destination = "png"))
  }
  invisible(norm_data %>% plot_pca(destination = "png"))
  ```
  *(Generates `plot_proteins_counts.png`, `plot_proteins_<norm>_pca_PC1PC2.png`, and conditionally `plot_proteins_normalizated_variation.png` only when `length(get_quant_names(data)) > 1` or raw abundance is available).*

- **Automated Expression & Enrichment Exports**:
  ```r
  # Dynamically select optimal label column (prefer gene symbol/name, fall back to identifier)
  label_col <- intersect(c("gene_name", "gene_symbol", "symbol", "protein"), get_annotation_terms(enriched_data))[1]
  if (is.na(label_col)) label_col <- enriched_data$identifier

  enriched_data %>%
    analyze_expressions(labels_column = label_col, log2fc_min = 1, significance_max = 0.05)
  ```
  *(Generates `proteins_volcano_<contrast>.png` and `table_proteins_expression_<contrast>.csv`, or `{tissue}_` prefixed equivalents for stratified designs).*

  ```r
  enriched_data %>%
    analyze_enrichments(significance_max = 0.05, top_n = 30)
  ```
  *(Generates composite `proteins_enrichment_<contrast>.png` and `table_proteins_enrichment_<contrast>.csv`, or `{tissue}_` prefixed equivalents for stratified designs).*

- **Top Candidate Expression Plots (Directional Profiles)**:
  `plot_expression()` creates `plot_proteins_<norm>_expression_<contrast>.png` by default. To preserve both upregulated and downregulated panels without overwriting, rename and place them directly into `data/`:
  ```r
  for (pair in pairs) {
    treatment_group <- pair[1]
    control_group <- pair[2]
    contrast_str <- paste0(treatment_group, "-", control_group)

    # In plot_expression(), pass the unquoted formula for your decided contrast (e.g. p97_kd/ctl):
    # 1. Top upregulated candidates
    invisible(enriched_data %>% plot_expression(
      paste0(treatment_group, "/", control_group),
      log2fc_min = 0, significance_max = 1, top_n = 10,
      regulation = "up", labels_column = label_col, destination = "png"
    ))
    up_plot <- list.files(pattern = "^plot_proteins_.*_expression_.*\\.png$")[1]
    if (!is.na(up_plot) && file.exists(up_plot)) {
      file.rename(up_plot, file.path("data", sprintf("plot_expression_up_%s.png", contrast_str)))
    }

    # 2. Top downregulated candidates
    invisible(enriched_data %>% plot_expression(
      paste0(treatment_group, "/", control_group),
      log2fc_min = 0, significance_max = 1, top_n = 10,
      regulation = "down", labels_column = label_col, destination = "png"
    ))
    down_plot <- list.files(pattern = "^plot_proteins_.*_expression_.*\\.png$")[1]
    if (!is.na(down_plot) && file.exists(down_plot)) {
      file.rename(down_plot, file.path("data", sprintf("plot_expression_down_%s.png", contrast_str)))
    }
  }
  ```

- **Move Generated QC Plots & Analysis Tables into `data/`**:
  Ensure all generated tables and figures are organized into `data/`:
  ```r
  generated_assets <- list.files(pattern = "^(.*plot_|.*proteins_|.*table_proteins_).*(png|csv)$")
  for (f in generated_assets) {
    file.rename(f, file.path("data", f))
  }
  ```

- **Persist Complete `tidyproteomics` Object**:
  Save the final analyzed data object to disk in `data/` for deterministic downstream extraction:
  ```r
  saveRDS(enriched_data, file = "data/tidyproteomics_data.rds")
  ```

- **Checkpoint 2.5 (Phase Gate & Log Verification)**:
  Verify on disk before proceeding to Phase 3:
  1. `logs/02_expression.log` exists with non-zero size, containing complete execution output without errors.
  2. `data/tidyproteomics_data.rds` exists on disk with non-zero size.
  3. All CSV tables (`data/table_proteins_expression_*.csv`, `data/table_proteins_enrichment_*.csv`) exist in `data/` with non-zero size. **Flexible Gate Patterns**: Checkpoint gates accept `{tissue}_` prefixed tables (e.g. `data/{tissue}_table_proteins_expression_*.csv`, `data/{tissue}_table_proteins_enrichment_*.csv`, or `{tissue}`-encoded contrast tables) when a dataset specifies stratification.
  4. All QC plots (`data/plot_proteins_counts.png`, `data/plot_proteins_*_pca_PC1PC2.png`, and conditionally `data/plot_proteins_normalizated_variation.png` only when `length(get_quant_names(data)) > 1` or raw abundance is available), volcano (`data/proteins_volcano_*.png`), enrichment (`data/proteins_enrichment_*.png`), and directional expression plots (`data/plot_expression_up_*.png`, `data/plot_expression_down_*.png`) exist in `data/` with non-zero file sizes. **Flexible Gate Patterns**: Checkpoint gates accept `{tissue}_` prefixed figures (e.g. `data/{tissue}_proteins_volcano_*.png`, `data/{tissue}_proteins_enrichment_*.png`, `data/{tissue}_plot_expression_*.png`) when a dataset specifies stratification.
- [ ] **Complete Phase**:
  - Invoke `complete_phase(phaseName = "02_EXPRESSION", summary = "Differential expression and multi-category pathway enrichment completed. Generated all diagnostic plots, tables, and persisted data/tidyproteomics_data.rds.")`