---
skills:
  - TIDYPROTEOMICS_CORE
  - TIDYPROTEOMICS_EXPRESSION
---

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

#### Phase 4.2: Repeated Measures, Paired Modeling & Empirical Bayes Differential Expression
- **Repeated Measures, Paired Contrasts & Batch Adjustment Audit**:
  Inspect `imp_data$experiments` for `subject_id`, `replicate_id`, and `batch` (populated in Phase 1) to eliminate pseudo-replication:
  ```r
  cat("\n=== REPEATED MEASURES & PAIRED MODELING AUDIT ===\n")
  if (!"subject_id" %in% names(imp_data$experiments)) {
    # Fallback heuristic if not populated in Phase 1:
    files <- imp_data$experiments$sample_file
    sub_matches <- regmatches(files, regexec("(Sample|Donor|Patient|Subject)[-_ ]?([0-9]+)([a-zA-Z])?", files, ignore.case = TRUE))
    imp_data$experiments$subject_id <- sapply(seq_along(files), function(i) {
      sm <- sub_matches[[i]]
      if (length(sm) >= 3) paste0(sm[2], sm[3]) else paste0("Subject_", i)
    })
  }

  subj_by_cond <- split(imp_data$experiments$sample, imp_data$experiments$subject_id)
  has_tech_reps <- any(sapply(subj_by_cond, function(x) length(x) > length(unique(x))))
  paired_subjs <- names(subj_by_cond)[sapply(subj_by_cond, function(x) length(unique(x)) > 1)]
  has_paired <- length(paired_subjs) > 0

  cat(sprintf("Repeated measures within condition (technical cuts): %s\n", has_tech_reps))
  cat(sprintf("Paired donors across conditions: %s (%d subjects: %s)\n",
              has_paired, length(paired_subjs), paste(paired_subjs, collapse = ", ")))

  # 1. Technical Replicate Handling:
  # If multiple files share the same subject_id within a condition, evaluate consensus correlation via limma::duplicateCorrelation():
  if (has_tech_reps || has_paired) {
    cat("Evaluating within-subject correlation via limma::duplicateCorrelation(..., block = subject_id)...\n")
    tryCatch({
      data_quant <- imp_data %>% tidyproteomics::extract(imp_data$quantitative_source) %>% 
        dplyr::select(!dplyr::matches("^origin$")) %>% 
        tidyproteomics:::transform_log2()
      
      data_quant_wide <- data_quant %>% 
        dplyr::filter(sample %in% c(treatment_group, control_group)) %>% 
        tidyr::pivot_wider(names_from = c("sample", "replicate"), names_sep = "___", values_from = "abundance_log2")
      
      data_lmfit <- data_quant_wide %>% tibble::column_to_rownames("identifier") %>% as.data.frame()
      col_df <- data.frame(colname = colnames(data_lmfit), stringsAsFactors = FALSE) %>%
        tidyr::separate(colname, into = c("sample", "replicate"), sep = "___", remove = FALSE) %>%
        mutate(replicate = as.character(replicate)) %>%
        left_join(imp_data$experiments %>% mutate(replicate = as.character(replicate)), by = c("sample", "replicate"))
      
      design <- model.matrix(~ factor(col_df$sample, levels = c(control_group, treatment_group)))
      corfit <- limma::duplicateCorrelation(data_lmfit, design, block = col_df$subject_id)
      cat(sprintf("limma::duplicateCorrelation consensus correlation on subject_id: %.4f\n", corfit$consensus.correlation))
    }, error = function(e) {
      cat("Note: duplicateCorrelation audit encountered: ", conditionMessage(e), "\n")
    })
  }

  # 2. Paired Contrasts:
  # If donors are matched across conditions, model.matrix(~ subject_id + condition) should be considered:
  # design <- model.matrix(~ subject_id + condition)

  # 3. Batch Adjustment:
  # If bridge samples indicate identifiable batch effects without total confounding, support additive batch terms:
  # design <- model.matrix(~ batch + condition) # or limma::removeBatchEffect()
  ```

- Check if differential expression results have already been computed for the designated contrast(s) in upstream operations:
  ```r
  ops <- operations(imp_data)

  # Audit whether differential expression is pre-existing for each target pair:
  all_pairs_computed <- TRUE
  for (pair in pairs) {
    contrast_str <- paste0(pair[1], "/", pair[2])
    has_pair <- tryCatch({
      tbl <- rlang::inject(export_analysis(imp_data, !!rlang::parse_expr(contrast_str), .analysis = "expression"))
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
- **Checkpoint 4.2**: Verify that differential expression contrasts are confirmed and recorded in `operations(stat_data)`.

#### Phase 4.3: Automated Export, Volcano Plots & Candidate Expression Profiles
- **Dynamic Label Selection**:
  ```r
  label_col <- intersect(c("gene_name", "gene_symbol", "symbol", "protein"), get_annotation_terms(stat_data, format = "vector"))[1]
  if (is.na(label_col)) label_col <- stat_data$identifier
  ```
- **Volcano Plot & Expression Table Export**:
  ```r
  stat_data %>%
    analyze_expressions(labels_column = label_col, log2fc_min = 1, significance_max = 0.05)
  ```
  *(Generates `<analyte>_volcano_<contrast>.png` and `table_<analyte>_expression_<contrast>.csv`).*

- **Hypothesis-Driven Target & Candidate Expression Profiles**:
  Export individual visual profiles for target perturbation candidates, top directional candidates, and agent-selected biological subsets of interest:
  ```r
  # 1. Hypothesis-Driven Target Expression Profile (if specific target specified):
  target_gene <- "<decided_target_gene_or_NULL>"
  if (!is.null(target_gene) && nzchar(target_gene) && !grepl("<decided_", target_gene)) {
    target_data <- tryCatch({
      imp_data %>%
        subset(as.name(label_col) %like% target_gene) %>%
        expression(.pairs = pairs, .method = "limma")
    }, error = function(e) {
      tryCatch({
        imp_data %>%
          subset(as.name(stat_data$identifier[1]) %like% target_gene) %>%
          expression(.pairs = pairs, .method = "limma")
      }, error = function(e2) NULL)
    })

    if (!is.null(target_data)) {
      cat(sprintf("Generating dedicated candidate expression profile for investigated target (%s)...\n", target_gene))
      for (pair in pairs) {
        c_str <- paste0(pair[1], "-", pair[2])
        invisible(target_data %>% plot_expression(
          paste0(pair[1], "/", pair[2]),
          log2fc_min = 0, significance_max = 1, top_n = 5,
          regulation = "both", labels_column = label_col, destination = "png"
        ))
        t_plot <- list.files(pattern = "^plot_(proteins|peptides)_.*_expression_.*\\.png$")[1]
        if (!is.na(t_plot) && file.exists(t_plot)) {
          file.rename(t_plot, file.path("data", sprintf("plot_expression_target_%s_%s.png", target_gene, c_str)))
        }
      }
    }
  }

  for (pair in pairs) {
    treatment_group <- pair[1]
    control_group <- pair[2]
    contrast_str <- paste0(treatment_group, "-", control_group)

    # 2. Top upregulated candidates
    invisible(stat_data %>% plot_expression(
      paste0(treatment_group, "/", control_group),
      log2fc_min = 0, significance_max = 1, top_n = 10,
      regulation = "up", labels_column = label_col, destination = "png"
    ))
    up_plot <- list.files(pattern = "^plot_(proteins|peptides)_.*_expression_.*\\.png$")[1]
    if (!is.na(up_plot) && file.exists(up_plot)) {
      file.rename(up_plot, file.path("data", sprintf("plot_expression_up_%s.png", contrast_str)))
    }

    # 3. Top downregulated candidates
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

  # 5. Multi-Contrast Cross-Comparison (plot_compexp):
  if (length(pairs) >= 2) {
    cat("Multiple contrasts evaluated. Generating comparative expression scatter plot(s) (plot_compexp)...\n")
    for (i in 1:(length(pairs) - 1)) {
      for (j in (i + 1):length(pairs)) {
        c_a <- paste0(pairs[[i]][1], "/", pairs[[i]][2])
        c_b <- paste0(pairs[[j]][1], "/", pairs[[j]][2])
        tag_a <- paste0(pairs[[i]][1], "-", pairs[[i]][2])
        tag_b <- paste0(pairs[[j]][1], "-", pairs[[j]][2])

        tbl_a <- export_analysis(stat_data, c_a, .analysis = "expression")
        tbl_b <- export_analysis(stat_data, c_b, .analysis = "expression")

        comp_plot <- plot_compexp(
          tbl_a, tbl_b,
          log2fc_min = 1, significance_max = 0.05,
          labels_column = label_col
        )
        tidyproteomics:::plot_save(
          comp_plot, data = NULL,
          file_name = sprintf("compexp_%s_vs_%s", tag_a, tag_b),
          destination = "png"
        )
        c_plot <- list.files(pattern = sprintf("^plot_compexp_%s_vs_%s\\.png$", tag_a, tag_b))[1]
        if (!is.na(c_plot) && file.exists(c_plot)) {
          file.rename(c_plot, file.path("data", c_plot))
        }
      }
    }
  }
  ```

- **Move Generated Plots & Default Tables into `data/`**:
  ```r
  generated_assets <- list.files(pattern = "^(plot_|table_|.*_volcano_|.*_expression_).*(png|csv)$")
  for (f in generated_assets) {
    file.rename(f, file.path("data", f))
  }
  ```

- **Imputation Proportion Tracking & Detection-Rate Sensitivity Tagging**:
  Prevent on/off limit-of-detection artifacts from masquerading as continuous biological shifts. Ensure `table_<analyte>_expression_<contrast>.csv` contains per-condition imputation tracking and risk flags:
  ```r
  for (pair in pairs) {
    c_str <- paste0(pair[1], "/", pair[2])
    c_tag <- paste0(pair[1], "-", pair[2])
    g1 <- pair[1]
    g2 <- pair[2]
    g1_imp <- paste0("imputed_", g1)
    g2_imp <- paste0("imputed_", g2)

    result <- rlang::inject(export_analysis(stat_data, !!rlang::parse_expr(c_str), .analysis = "expression"))
    if (!is.null(result) && nrow(result) > 0) {
      result <- result %>%
        mutate(
          imputed_total = if ("imputed" %in% names(.)) imputed else NA_real_,
          imputation_bias = case_when(
            pmax(if (g1_imp %in% names(.)) get(g1_imp) else 0,
                 if (g2_imp %in% names(.)) get(g2_imp) else 0, na.rm = TRUE) > 0.5 ~ "HIGH",
            pmax(if (g1_imp %in% names(.)) get(g1_imp) else 0,
                 if (g2_imp %in% names(.)) get(g2_imp) else 0, na.rm = TRUE) >= 0.2 ~ "MODERATE",
            TRUE ~ "LOW"
          )
        )

      csv_path <- file.path("data", sprintf("table_%s_expression_%s.csv", stat_data$analyte, c_tag))
      readr::write_csv(result, csv_path)
      cat(sprintf("Updated %s with imputation proportion tracking and imputation_bias flags.\n", csv_path))
      cat("Imputation risk breakdown:\n")
      print(table(result$imputation_bias))
    }
  }
  ```
  *(Visual Tagging: In volcano plots and candidate profiles, candidates tagged with `HIGH` imputation risk should be recognized as detection-rate/missingness driven rather than continuous abundance shifts).*

#### Phase 4.4: Object Persistence & Blackboard Recording
- Persist the analyzed dataset to disk:
  ```r
  saveRDS(stat_data, file = "data/tidyproteomics_data.rds")
  ```
- Record the following directly into `docs/notes.md`:
  - Total quantified features (proteins or peptides).
  - Number of significantly dysregulated features ($|\log_2\text{FC}| \ge 1.0, q \le 0.05$), with counts upregulated and downregulated per contrast.
  - Repeated measures and paired structure audit findings (consensus correlation from `duplicateCorrelation`).
  - Imputation proportion audit (fractions of `HIGH`, `MODERATE`, `LOW` imputation risk features).
  - Leading biomarker candidates with fold changes, adjusted $p$-values, and imputation flags.
  - Investigated target status (fold-change and significance of target gene/protein if specified).
  - Any agent-curated candidate subsets plotted and their biological rationale.
  - Multi-contrast comparative alignment observations (if $\ge 2$ contrasts evaluated).

#### Phase 4.5: Checkpoint Verification & State Recording
- [ ] **Checkpoint 4.5**:
  1. `logs/04_expression/console.log` (or `logs/04_expression.log`) exists on disk with non-zero file size and no errors.
  2. `data/tidyproteomics_data.rds` exists on disk with non-zero file size and contains expression results.
  3. Expression tables (`data/table_*_expression_*.csv`) exist on disk with non-zero file size and contain `imputed_total` and `imputation_bias` columns.
  4. Volcano and candidate expression plots (`data/*_volcano_*.png`, `data/plot_expression_*.png`, and any `data/plot_compexp_*.png`) exist on disk with non-zero file sizes.
  5. `docs/notes.md` contains the differential expression summary, repeated-measures audit, imputation risk summary, target verification, and candidate profiling rationale.
- [ ] **Complete Phase**:
  - Invoke `complete_phase(phaseName = "04_EXPRESSION", summary = "Differential expression analysis/verification completed. Confirmed statistical calculations, generated volcano, target/candidate expression plots (and comparative plots if multi-contrast), exported expression tables, and persisted data/tidyproteomics_data.rds.")`
