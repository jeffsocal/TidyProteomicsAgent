### Phase 4: Differential Expression Analysis & Candidate Profiling

Construct and execute `code/04_expression.R`, capturing full execution output to `logs/04_expression.log` (e.g. `Rscript code/04_expression.R 2>&1 | tee logs/04_expression.log`). You must strictly enforce all checkpoints below.

---

#### Phase 4.1: Contrast Formulation & Group Verification
- Load the imputed dataset from Phase 3:
  ```r
  imp_data <- readRDS("data/tidyproteomics_data.rds")
  ```
- Inspect available sample groups from `get_sample_names(imp_data)` and confirm alignment with the study design decided in Phase 1 (`docs/experiment.md` and `docs/notes.md`):
  ```r
  sample_names <- get_sample_names(imp_data)
  cat("Available sample groups:\n")
  print(sample_names)
  ```
- Define contrast pairs as a list of two-element vectors representing `c(treatment, control)`:
  ```r
  # 1. Single comparison:
  # pairs <- list(c("<treatment_group>", "<control_group>"))

  # 2. Multi-group / multi-arm screen (e.g. comparing multiple perturbations to control or each other):
  # pairs <- list(
  #   c("drug_a", "vehicle"),
  #   c("drug_b", "vehicle"),
  #   c("drug_a", "drug_b")
  # )

  # 3. Factorial design (e.g. Genotype x Treatment):
  # Form composite groups (e.g. WT_vehicle, WT_treated, KO_vehicle, KO_treated) and define pairwise arms:
  # pairs <- list(
  #   c("WT_treated", "WT_vehicle"),
  #   c("KO_treated", "KO_vehicle"),
  #   c("KO_vehicle", "WT_vehicle")
  # )

  treatment_group <- "<decided_treatment_group>"
  control_group <- "<decided_control_group>"
  pairs <- list(c(treatment_group, control_group))
  ```

#### Phase 4.2: Empirical Bayes Differential Expression
- Compute differential expression via linear models with empirical Bayes moderation:
  ```r
  stat_data <- imp_data %>%
    expression(.pairs = pairs, .method = "limma")
  ```
  *(Note for repeated measures / paired-sample cohorts: specify subject origin in metadata and consider `expression(..., .method = "mixed-effects")`).*
- **Checkpoint 4.2**: Verify that differential expression contrasts are successfully computed and recorded in `operations(stat_data)`.

#### Phase 4.3: Automated Export, Volcano Plots & Candidate Expression Profiles
- **Dynamic Label Selection**:
  ```r
  label_col <- intersect(c("gene_name", "gene_symbol", "symbol", "protein"), get_annotation_terms(stat_data))[1]
  if (is.na(label_col)) label_col <- stat_data$identifier
  ```
- **Volcano Plot & Expression Table Export**:
  ```r
  stat_data %>%
    analyze_expressions(labels_column = label_col, log2fc_min = 1, significance_max = 0.05)
  ```
  *(Generates `<analyte>_volcano_<contrast>.png` and `table_<analyte>_expression_<contrast>.csv`).*

- **Top Candidate Directional Expression Profiles**:
  Export individual visual profiles for top upregulated and top downregulated candidates:
  ```r
  for (pair in pairs) {
    treatment_group <- pair[1]
    control_group <- pair[2]
    contrast_str <- paste0(treatment_group, "-", control_group)

    # 1. Top upregulated candidates
    invisible(stat_data %>% plot_expression(
      paste0(treatment_group, "/", control_group),
      log2fc_min = 0, significance_max = 1, top_n = 10,
      regulation = "up", labels_column = label_col, destination = "png"
    ))
    up_plot <- list.files(pattern = "^plot_(proteins|peptides)_.*_expression_.*\\.png$")[1]
    if (!is.na(up_plot) && file.exists(up_plot)) {
      file.rename(up_plot, file.path("data", sprintf("plot_expression_up_%s.png", contrast_str)))
    }

    # 2. Top downregulated candidates
    invisible(stat_data %>% plot_expression(
      paste0(treatment_group, "/", control_group),
      log2fc_min = 0, significance_max = 1, top_n = 10,
      regulation = "down", labels_column = label_col, destination = "png"
    ))
    down_plot <- list.files(pattern = "^plot_(proteins|peptides)_.*_expression_.*\\.png$")[1]
    if (!is.na(down_plot) && file.exists(down_plot)) {
      file.rename(down_plot, file.path("data", sprintf("plot_expression_down_%s.png", contrast_str)))
    }
  }
  ```

- **Move Generated Volcano & Table Assets into `data/`**:
  ```r
  generated_assets <- list.files(pattern = "^(plot_|table_|.*_volcano_|.*_expression_).*(png|csv)$")
  for (f in generated_assets) {
    file.rename(f, file.path("data", f))
  }
  ```

#### Phase 4.4: Object Persistence & Blackboard Recording
- Persist the analyzed dataset to disk:
  ```r
  saveRDS(stat_data, file = "data/tidyproteomics_data.rds")
  ```
- Record the following directly into `docs/notes.md`:
  - Total quantified features (proteins or peptides).
  - Number of significantly dysregulated features ($|\log_2\text{FC}| \ge 1.0, q \le 0.05$), with counts upregulated and downregulated per contrast.
  - Leading biomarker candidates with fold changes and adjusted $p$-values.

#### Phase 4.5: Checkpoint Verification & State Recording
- [ ] **Checkpoint 4.5**:
  1. `logs/04_expression.log` exists on disk with non-zero file size and no errors.
  2. `data/tidyproteomics_data.rds` exists on disk with non-zero file size and contains expression results.
  3. Expression tables (`data/table_*_expression_*.csv`) exist on disk with non-zero file size.
  4. Volcano and candidate expression plots (`data/*_volcano_*.png`, `data/plot_expression_up_*.png`, and `data/plot_expression_down_*.png`) exist on disk with non-zero file sizes.
  5. `docs/notes.md` contains the differential expression summary.
- [ ] **Complete Phase**:
  - Invoke `complete_phase(phaseName = "04_EXPRESSION", summary = "Differential expression analysis completed. Computed moderated t-statistics, generated volcano and directional candidate expression plots, exported expression tables, and persisted data/tidyproteomics_data.rds.")`
