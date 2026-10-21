### Phase 4: Differential Expression Analysis & Candidate Profiling

Construct and execute `code/04_expression.R`, capturing full execution output to `logs/04_expression/console.log` (e.g. `mkdir -p logs/04_expression && Rscript code/04_expression.R 2>&1 | tee logs/04_expression/console.log`). You must strictly enforce all checkpoints below.

---

#### Phase 4.1: Contrast Formulation, Sample Recoding & Group Verification
- Load the imputed dataset from Phase 3:
  ```r
  imp_data <- readRDS("data/tidyproteomics_data.rds")
  raw_sample_names <- get_sample_names(imp_data)
  cat("Raw sample groups in data:\n")
  print(raw_sample_names)
  ```

- **Parse Sample Group Renaming & Pooling Map (`docs/experiment.md` Section 3)**:
  If raw sample groups embed technical batch tags (e.g. `_batch5`, `_run1`) or need pooling into clean biological groups:
  ```r
  # Ingest sample renaming map from docs/experiment.md Section 3 if enabled:
  exp_file <- "docs/experiment.md"
  apply_pooling <- TRUE
  if (file.exists(exp_file)) {
    pool_lines <- grep("Reassign Sample Names According to (Sample Group Renaming & )?Pooling Map", readLines(exp_file, warn = FALSE), value = TRUE)
    if (length(pool_lines) > 0 && grepl("FALSE", pool_lines[1], ignore.case = TRUE)) {
      apply_pooling <- FALSE
    }
  }

  if (apply_pooling && file.exists(exp_file)) {
    exp_lines <- readLines(exp_file, warn = FALSE)
    table_idx <- grep("^\\|\\s*Raw Sample Group", exp_lines)
    if (length(table_idx) > 0) {
      table_lines <- exp_lines[table_idx:length(exp_lines)]
      blank_idx <- grep("^\\s*$", table_lines)
      if (length(blank_idx) > 0 && blank_idx[1] > 1) {
        table_lines <- table_lines[1:(blank_idx[1] - 1)]
      }
      if (length(table_lines) >= 3) {
        recode_df <- tryCatch(
          read.table(text = table_lines, sep = "|", header = TRUE, strip.white = TRUE, comment.char = "", stringsAsFactors = FALSE),
          error = function(e) NULL
        )
        if (!is.null(recode_df) && ncol(recode_df) >= 3) {
          raw_vals <- trimws(recode_df[[2]])
          clean_vals <- trimws(recode_df[[3]])
          valid <- nzchar(raw_vals) & nzchar(clean_vals) & !grepl("^-+$", raw_vals)
          for (i in which(valid)) {
            r_name <- raw_vals[i]
            c_name <- clean_vals[i]
            if (r_name != c_name && any(imp_data$experiments$sample == r_name)) {
              imp_data$experiments$sample[imp_data$experiments$sample == r_name] <- c_name
            }
          }
        }
      }
    }
  }

  sample_names <- get_sample_names(imp_data)
  cat("Active sample groups for analysis:\n")
  print(sample_names)
  ```

- **Define Contrast Pairs & Verify Design Identifiability**:
  Define contrast pairs as a list of two-element vectors representing `c(treatment, control)`:
  ```r
  # Single comparison:
  # pairs <- list(c("<treatment_group>", "<control_group>"))

  # Multi-group / multi-arm screen:
  # pairs <- list(c("drug_a", "vehicle"), c("drug_b", "vehicle"))

  treatment_group <- "<decided_treatment_group>"
  control_group <- "<decided_control_group>"
  pairs <- list(c(treatment_group, control_group))
  ```

- **Pre-flight Gate & Scaffolding Policy**:
  - If `docs/experiment.md` does not specify target contrasts, or if disease condition is confounded with batch (e.g. all controls in one batch, all disease in different batches) and `Proceed With Potential Batch Confounding: TRUE` (or `Authorize Unadjusted Exploratory Comparison: TRUE`) has NOT been confirmed:
    1. **Scaffold Section 3 in `docs/experiment.md`**: If not already scaffolded during Phase 1, ensure Section 3 of `docs/experiment.md` is populated using standardized visual badges:
       - Section 3.A: `ℹ️ [AUTO-GENERATED REFERENCE - READ ONLY]:` with discovered raw sample groups.
       - Section 3.B: `👉 [USER REVIEW & EDIT TABLE]:` with a suggested **Sample Group Renaming & Pooling Map** table (e.g. pooling `active_necrotic granuloma_batch5`, `batch6`, `batch9` -> `active necrotic granuloma`, and `healthy_healthy_batch8` -> `healthy`), and `👉 [USER TOGGLE]:` with `- **Reassign Sample Names According to Pooling Map**: TRUE`.
       - Section 3.C: `👉 [USER ACTION REQUIRED - DEFINE TARGET CONTRASTS]:` with suggested **Target Contrasts** (`active necrotic granuloma` vs `healthy`).
       - Section 3.D: `⚠️ [PRE-FLIGHT GATE DECISION]:` with `- **Proceed With Potential Batch Confounding**: FALSE` (strictly as a clean boolean with no inline notes or explanations).
    2. **Halt execution cleanly via `fail_phase()`**:
       ```r
       fail_phase(
         phaseName = "04_EXPRESSION", 
         reason = "Pre-flight Gate: Batch confounding detected between treatment and control cohorts.",
         actionableInsights = "ACTION REQUIRED:
  1. Open docs/experiment.md.
  2. In Section 3.D, change `- **Proceed With Potential Batch Confounding**: FALSE` to `TRUE` (or adjust contrast definitions in Section 3.C).
  3. Re-run Phase 4."
       )
       ```
    3. Do NOT proceed to calculate linear models until Section 3 has been confirmed by the user.

#### Phase 4.2: Empirical Bayes Differential Expression & Pass-Through Audit
- Check if differential expression results have already been computed for the designated contrast(s) in upstream operations:
  ```r
  ops <- operations(imp_data)

  # Audit whether differential expression is pre-existing for each target pair:
  all_pairs_computed <- TRUE
  for (pair in pairs) {
    contrast_str <- paste0(pair[1], "/", pair[2])
    has_pair <- tryCatch({
      tbl <- export_analysis(imp_data, contrast_str, .analysis = "expression")
      !is.null(tbl) && nrow(tbl) > 0
    }, error = function(e) FALSE)
    if (!has_pair) {
      all_pairs_computed <- FALSE
      break
    }
  }

  if (all_pairs_computed && any(grepl("expression", ops))) {
    cat("Pre-existing differential expression results detected in tidyproteomics object history. Preserving upstream statistical calculations.\n")
    stat_data <- imp_data
  } else {
    cat("Computing empirical Bayes moderated t-statistics via limma...\n")
    stat_data <- imp_data %>%
      expression(.pairs = pairs, .method = "limma")
  }
  ```
  *(Note for repeated measures / paired-sample cohorts: specify subject origin in metadata and consider `expression(..., .method = "mixed-effects")`).*
- **Checkpoint 4.2**: Verify that differential expression contrasts are confirmed and recorded in `operations(stat_data)`.

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
  1. `logs/04_expression/console.log` (or `logs/04_expression.log`) exists on disk with non-zero file size and no errors.
  2. `data/tidyproteomics_data.rds` exists on disk with non-zero file size and contains expression results.
  3. Expression tables (`data/table_*_expression_*.csv`) exist on disk with non-zero file size.
  4. Volcano and candidate expression plots (`data/*_volcano_*.png`, `data/plot_expression_up_*.png`, and `data/plot_expression_down_*.png`) exist on disk with non-zero file sizes.
  5. `docs/notes.md` contains the differential expression summary.
- [ ] **Complete Phase**:
  - Invoke `complete_phase(phaseName = "04_EXPRESSION", summary = "Differential expression analysis/verification completed. Confirmed statistical calculations, generated volcano and directional candidate expression plots, exported expression tables, and persisted data/tidyproteomics_data.rds.")`
