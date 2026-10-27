---
tools: [tpa_health, tpa_load, tpa_inspect, tpa_summary, tpa_plot, tpa_export_table, tpa_operations, tpa_extract, tpa_run_code, tpa_export_state, tpa_intersection, tpa_export_sdrf, tpa_normalization_sensitivity]
---

### Phase 10: Generation of Hypothesis-Driven Discussion Figures & Statistical Digest

In this focused phase, you will author and execute an R analysis script (`code/10_figures.R`) to extract specific discussion metrics, generate four publication-grade discussion figures, and compile a structured JSON statistical digest (`data/manuscript_digest.json`).

Target execution budget: **2–3 turns max**.

> ⚠️ **CRITICAL DETERMINISTIC EXECUTION MANDATE (DO NOT HALT OR PROBE)**:
> In this phase, do NOT call interactive MCP inspection tools (`tpa_inspect`, `tpa_summary`, `tpa_run_code`, `tpa_export_table`) or burn turns on exploratory queries. Proceed deterministically in **2 concise turns**:
> - **Turn 1**: Author `code/10_figures.R` in a single pass using `write_file` following the canonical script template below.
> - **Turn 2**: Execute via `execute_command("if [ -f tools/lint_tidyproteomics.R ]; then Rscript tools/lint_tidyproteomics.R code/10_figures.R && Rscript code/10_figures.R; else Rscript code/10_figures.R; fi")`, verify outputs, and invoke `complete_phase`.

---

#### Objectives & Tasks

1. **Author and execute `code/10_figures.R`**:
   - Execute via `Rscript code/10_figures.R` (output is automatically captured to `logs/10_figures/console.log` by the harness).
   - Ensure the script runs non-interactively, checks for data existence, and exits with code 0.
   - **Load Expression & Imputation Data Stably**:
     - Locate the expression table dynamically via `expr_files <- list.files("data", pattern = "^table_.*_expression_.*[.](tsv|csv)$", full.names = TRUE)`.
     - Load `tp_data <- readRDS("data/tidyproteomics_data.rds")`.
     - Access `candidate_reliability` (`ROBUST_QUANTITATIVE`, `DETECTION_LIMITED_ON_OFF`, `HIGH_UNCERTAINTY`), `imputation_bias` (`HIGH`, `MODERATE`, `LOW`), and `imputation_delta` directly from the Phase 6-persisted expression table if present.
   - **TidyProteomics Discussion Plotting Rules**:
     - Discussion figures use canonical `tidyproteomics` plotting functions with `tag`, `destination = "png"`, and `path = "data"`.
     - ⚠️ **CRITICAL CONTRAST SYNTAX**: Always pass contrast as a literal string (e.g. `"p97_kd/ctl"`), NOT as an unevaluated R variable name, so `tidyproteomics_quo` evaluates cleanly.
     - Direct S3 list slot access (`tp_data$quantitative`, etc.) remains strictly forbidden.
   - **Locate Volcano & QC Plots**: Check `data/` for the publication volcano plot (`data/plot_proteins_volcano_<contrast>.png`), PCA plot (`data/plot_pca.png`), and heatmap (`data/plot_heatmap.png`) to record their relative paths in `manuscript_digest.json`.

2. **Generate the 4 Multi-Panel Publication-Grade Discussion Figures in `data/`**:
   - **Biological Module Heatmap**:
     - Native Call: `tp_data |> plot_heatmap(row_names = "gene_name", tag = "module_<name>", destination = "png", path = "data")`
     - File Output: `data/plot_proteins_<quant>_heatmap_module_<name>.png` (copy or alias to `data/plot_discussion_module_<name>.png`).
   - **Opposing Program Dichotomy**:
     - Native Call: `tp_data |> plot_programs("<contrast>", programs = list("<Program A>" = c(...), "<Program B>" = c(...)), labels_column = "gene_name", tag = "dichotomy_<name>", destination = "png", path = "data")`
     - File Output: `data/plot_proteins_<quant>_programs_<contrast>_dichotomy_<name>.png` (copy or alias to `data/plot_discussion_dichotomy_<name>.png`).
   - **Literature Validation Forest Plot**:
     - Native Call: `tp_data |> plot_forest("<contrast>", proteins = forest_genes, status = status_map, labels_column = "gene_name", tag = "literature", destination = "png", path = "data")`
     - File Output: `data/plot_proteins_<quant>_forest_<contrast>_literature.png` (copy or alias to `data/plot_discussion_literature_forest.png`).
   - **Imputation Diagnostic Plot**:
     - Native Call: `tp_data |> plot_expression("<contrast>", labels_column = "gene_name", tag = "imputation_diagnostic", destination = "png", path = "data", top_n = length(diag_genes))`
     - File Output: `data/plot_proteins_<quant>_expression_<contrast>_imputation_diagnostic.png` (copy or alias to `data/plot_discussion_imputation_diagnostic.png`).

3. **Canonical Script Template for `code/10_figures.R`**:
   ```r
   #!/usr/bin/env Rscript
   suppressPackageStartupMessages({
     library(tidyproteomics)
     library(jsonlite)
   })

   # 1. Load Data Objects
   stopifnot(file.exists("data/tidyproteomics_data.rds"))
   tp_data <- readRDS("data/tidyproteomics_data.rds")

   expr_files <- list.files("data", pattern = "^table_.*_expression_.*[.](tsv|csv)$", full.names = TRUE)
   stopifnot(length(expr_files) > 0)
   expr <- if (grepl("\\.csv$", expr_files[1])) read.csv(expr_files[1], check.names = FALSE) else read.delim(expr_files[1], check.names = FALSE)

   # Extract contrast from data or filename
   analyses <- get_analyses(tp_data)
   contrast_str <- if (nrow(analyses) > 0) analyses$comparison[1] else "p97_kd/ctl"

   # 2. Derive Candidate Sets
   valid <- !is.na(expr$gene_name) & !is.na(expr$adj_p_value) & !is.na(expr$log2_foldchange)
   up <- expr[valid & expr$adj_p_value < 0.05 & expr$log2_foldchange >= 1, , drop = FALSE]
   down <- expr[valid & expr$adj_p_value < 0.05 & expr$log2_foldchange <= -1, , drop = FALSE]
   up <- up[order(up$adj_p_value, -up$log2_foldchange), , drop = FALSE]
   down <- down[order(down$adj_p_value, down$log2_foldchange), , drop = FALSE]

   module_genes <- head(unique(na.omit(c(up$gene_name, down$gene_name))), 12)
   prog_a <- head(unique(na.omit(up$gene_name)), 8)
   prog_b <- head(unique(na.omit(down$gene_name)), 8)
   if (!length(prog_b)) prog_b <- head(expr$gene_name[!is.na(expr$gene_name)], 5)

   # 3. Generate Discussion Figures
   # Heatmap
   tp_data |> plot_heatmap(row_names = "gene_name", tag = "module_discussion", destination = "png", path = "data")

   # Programs Dichotomy
   plot_programs(data = tp_data, contrast_str,
     programs = list("Upregulated Program" = prog_a, "Downregulated Program" = prog_b),
     labels_column = "gene_name", tag = "dichotomy_discussion", destination = "png", path = "data")

   # Literature Forest Plot
   forest_genes <- head(unique(na.omit(c(head(up$gene_name, 3), head(down$gene_name, 3)))), 6)
   status_map <- setNames(rep(c("Upregulated", "Downregulated"), length.out = length(forest_genes)), forest_genes)
   plot_forest(data = tp_data, contrast_str, proteins = forest_genes, status = status_map,
     labels_column = "gene_name", tag = "literature", destination = "png", path = "data")

   # Imputation Diagnostic
   diag_genes <- if ("imputed" %in% names(expr)) {
     head(unique(na.omit(expr$gene_name[replace(expr$imputed, is.na(expr$imputed), 0) > 0])), 10)
   } else character()
   if (length(diag_genes) < 2) diag_genes <- head(module_genes, 8)
   plot_expression(data = tp_data, contrast_str, labels_column = "gene_name", tag = "imputation_diagnostic",
     destination = "png", path = "data", top_n = length(diag_genes))

   # 4. Standardize Discussion Figure Paths
   find_plot <- function(pattern) {
     f <- list.files("data", pattern = pattern, full.names = TRUE, ignore.case = TRUE)
     f <- f[file.info(f)$size > 0]
     if (length(f)) f[which.max(file.info(f)$mtime)] else NA_character_
   }
   plot_specs <- list(
     module = c("module_.*[.]png$", "plot_discussion_module.png"),
     dichotomy = c("(dichotomy|programs).*[.]png$", "plot_discussion_dichotomy.png"),
     forest = c("forest.*literature.*[.]png$|literature.*[.]png$", "plot_discussion_literature_forest.png"),
     imputation = c("imputation_diagnostic.*[.]png$", "plot_discussion_imputation_diagnostic.png")
   )
   discussion_figures <- list()
   for (nm in names(plot_specs)) {
     src <- find_plot(plot_specs[[nm]][1])
     if (!is.na(src)) {
       dst <- file.path("data", plot_specs[[nm]][2])
       if (normalizePath(src, mustWork = FALSE) != normalizePath(dst, mustWork = FALSE)) {
         file.copy(src, dst, overwrite = TRUE)
       }
       discussion_figures[[nm]] <- dst
     }
   }

   # 5. Extract Candidate Records
   format_candidate <- function(r) {
     risk <- if (!is.na(r$candidate_reliability) && nzchar(r$candidate_reliability)) {
       paste(r$candidate_reliability, if (!is.na(r$imputation_bias) && nzchar(r$imputation_bias)) paste0("; bias ", r$imputation_bias) else "")
     } else "Not reported in expression table"
     list(
       gene = as.character(r$gene_name),
       accession = as.character(r$protein),
       log2fc = unname(as.numeric(r$log2_foldchange)),
       p_value = format(as.numeric(r$p_value), scientific = TRUE, digits = 3),
       q_value = format(as.numeric(r$adj_p_value), scientific = TRUE, digits = 3),
       imputation_risk = risk,
       candidate_reliability = if (is.null(r$candidate_reliability) || is.na(r$candidate_reliability)) NULL else as.character(r$candidate_reliability),
       imputation_bias = if (is.null(r$imputation_bias) || is.na(r$imputation_bias)) NULL else as.character(r$imputation_bias),
       `function` = as.character(r$description)
     )
   }

   # 6. Extract Top Pathways
   pathway_files <- list.files("data", pattern = "^(table_.*_enrichment_.*|enrichment_.*)[.](tsv|csv)$", full.names = TRUE)
   pathways <- list()
   for (f in pathway_files) {
     tab <- tryCatch(if (grepl("\\.csv$", f)) read.csv(f, check.names = FALSE) else read.delim(f, check.names = FALSE), error = function(e) NULL)
     if (is.null(tab) || !any(c("adj_p_value", "p_value") %in% names(tab))) next
     sig_col <- if ("adj_p_value" %in% names(tab)) "adj_p_value" else "p_value"
     term_col <- if ("term" %in% names(tab)) "term" else if ("annotation" %in% names(tab)) "annotation" else names(tab)[1]
     score_col <- if ("enrichment" %in% names(tab)) "enrichment" else if ("enrichment_score" %in% names(tab)) "enrichment_score" else NA_character_
     domain <- sub("^[a-z_]*enrichment_", "", sub("[.](tsv|csv)$", "", basename(f)))
     tab <- tab[!is.na(tab[[sig_col]]) & tab[[sig_col]] < 0.05, , drop = FALSE]
     if (!nrow(tab)) next
     tab <- tab[order(tab[[sig_col]]), , drop = FALSE]
     for (i in seq_len(min(5, nrow(tab)))) {
       score_val <- if (!is.na(score_col) && score_col %in% names(tab)) as.numeric(tab[[score_col]][i]) else 0
       pathways[[length(pathways) + 1L]] <- list(
         domain = domain, term = as.character(tab[[term_col]][i]),
         direction = if (score_val >= 0) "UP" else "DOWN",
         q_value = format(tab[[sig_col]][i], scientific = TRUE, digits = 3),
         enrichment_score = score_val, driver_proteins = character()
       )
     }
   }

   # 7. Compile Digest
   all_png <- list.files("data", pattern = "[.]png$", full.names = TRUE)
   existing_path <- function(pattern) {
     x <- all_png[grepl(pattern, basename(all_png), ignore.case = TRUE)]
     if (length(x)) x[1] else NA_character_
   }
   total_quant <- get_unique_variables(tp_data, "protein", format = "vector")
   active_assay <- get_quant_names(tp_data, format = "vector")
   digest <- list(
     study_title = "Differential Proteomics Analysis",
     contrast = contrast_str, analyte = tp_data$analyte,
     total_quantified = length(total_quant),
     expression_table_rows = nrow(expr),
     active_assay = if (length(active_assay)) active_assay[1] else "normalized",
     imputation_status = if (any(grepl("impute", tp_data$operations))) "imputed" else "unimputed",
     de_counts = list(
       total_significant = sum(valid & expr$adj_p_value < 0.05 & abs(expr$log2_foldchange) >= 1),
       upregulated = nrow(up), downregulated = nrow(down),
       threshold_log2fc = 1.0, threshold_qvalue = 0.05
     ),
     top_candidates_up = lapply(seq_len(min(10, nrow(up))), function(i) format_candidate(up[i, ])),
     top_candidates_down = lapply(seq_len(min(10, nrow(down))), function(i) format_candidate(down[i, ])),
     top_pathways = pathways,
     figures = list(volcano = existing_path("volcano"), pca = existing_path("pca"), heatmap = existing_path("heatmap")),
     discussion_figures = discussion_figures
   )
   write_json(digest, "data/manuscript_digest.json", auto_unbox = TRUE, pretty = TRUE, null = "null")
   cat("Wrote data/manuscript_digest.json successfully.\n")
   ```

4. **Emit Pre-Compiled Statistical Digest (`data/manuscript_digest.json`)**:
   - The script must write a clean JSON file compiling all primary statistics, sample counts, differential expression tallies, top candidates, pathway enrichments, and figure paths so Phase 11 can author the manuscript directly without running exploratory bash or R commands.
   > ⚠️ **R Syntax Note for Reserved Keyword `function`**:
   > In R, `function` is a reserved language keyword. When constructing named list elements for JSON serialization, always quote or backtick it (e.g. `list(gene = ..., \`function\` = as.character(r$description))` or `"function" = ...`) to prevent critical parser syntax errors (`unexpected '=' in "..., function="`).

---

#### Checkpoint Gate & Phase Completion

- [ ] **Checkpoint Gate**:
  1. `code/10_figures.R` executed with status code 0 and output logged to `logs/10_figures/console.log`.
  2. Four discussion figures exist in `data/` with non-zero file sizes (`*module*.png`, `*programs*.png` or `*dichotomy*.png`, `*forest*.png`, `*expression*imputation*.png` or `*imputation*.png`).
  3. `data/manuscript_digest.json` exists on disk with non-zero file size, and `discussion_figures` lists the 4 generated figure paths.
  4. (Optional validation command): Verify digest schema cleanly:
     ```bash
     Rscript -e 'x <- jsonlite::fromJSON("data/manuscript_digest.json", simplifyVector = FALSE); stopifnot(length(x$top_candidates_up) > 0, length(x$discussion_figures) == 4); cat("Digest validation PASS\n")'
     ```
- [ ] **Complete Phase**:
  - Invoke `complete_phase(phaseName = "10_FIGURES", summary = "Generated 4 hypothesis-driven discussion figures in data/ and compiled statistical digest in data/manuscript_digest.json.")`.
