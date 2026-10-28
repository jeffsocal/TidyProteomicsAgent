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
   - **Biological Signatures (Program Dichotomy)**:
     - Native Call: `tp_data |> plot_signatures("<contrast>", signatures = list("<Signature A>" = c(...), "<Signature B>" = c(...)), labels_column = "gene_name", tag = "dichotomy_<name>", destination = "png", path = "data")`
     - File Output: `data/plot_proteins_<quant>_signatures_<contrast>_dichotomy_<name>.png` (copy or alias to `data/plot_discussion_dichotomy_<name>.png`).
   - **Candidate Targets / Effect Sizes**:
     - Native Call: `tp_data |> plot_candidates("<contrast>", candidates = candidate_genes, status = status_map, labels_column = "gene_name", tag = "literature", destination = "png", path = "data")`
     - File Output: `data/plot_proteins_<quant>_candidates_<contrast>_literature.png` (copy or alias to `data/plot_discussion_literature_forest.png`).
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
   # Exclude quantitative extract abundance matrices (which lack log2_foldchange and test statistics)
   expr_files <- expr_files[!grepl("_extract", expr_files)]
   stopifnot(length(expr_files) > 0)
   read_de_table <- function(f) {
     if (grepl("\\.csv$", f)) read.csv(f, check.names = FALSE) else read.delim(f, check.names = FALSE)
   }
   de_file <- expr_files[1]
   for (f in expr_files) {
     hdr <- names(read_de_table(f)[0, , drop = FALSE])
     if ("log2_foldchange" %in% hdr) { de_file <- f; break }
   }
   expr <- read_de_table(de_file)

   # Extract contrast from data or filename
   analyses <- get_analyses(tp_data)
   contrast_str <- if (nrow(analyses) > 0) analyses$comparison[1] else "p97_kd/ctl"

   # 2. Derive Candidate Sets & Biological Program Signatures
   valid <- !is.na(expr$gene_name) & !is.na(expr$adj_p_value) & !is.na(expr$log2_foldchange)
   up <- expr[valid & expr$adj_p_value < 0.05 & expr$log2_foldchange >= 1, , drop = FALSE]
   down <- expr[valid & expr$adj_p_value < 0.05 & expr$log2_foldchange <= -1, , drop = FALSE]
   up <- up[order(-up$log2_foldchange, up$adj_p_value), , drop = FALSE]
   down <- down[order(down$log2_foldchange, down$adj_p_value), , drop = FALSE]

   module_genes <- head(unique(na.omit(c(up$gene_name, down$gene_name))), 12)

   # Biological Program Signatures:
   # Dynamically derive coherent opposing programs from enrichment analysis (e.g. top UP pathway vs top DOWN pathway)
   prog_a <- character(0); prog_a_name <- "Upregulated Program"
   prog_b <- character(0); prog_b_name <- "Downregulated Program"

   pathway_files <- list.files("data", pattern = "^(table_.*_enrichment_.*|enrichment_.*)[.](tsv|csv)$", full.names = TRUE)
   enr_all <- list()
   for (pf in pathway_files) {
     ptab <- tryCatch(if (grepl("\\.csv$", pf)) read.csv(pf, check.names = FALSE) else read.delim(pf, check.names = FALSE), error = function(e) NULL)
     if (!is.null(ptab) && all(c("annotation", "adj_p_value", "enrichment") %in% names(ptab))) {
       enr_all[[length(enr_all) + 1L]] <- ptab
     }
   }
   if (length(enr_all) > 0) {
     enr_combined <- dplyr::bind_rows(enr_all)
     sig_enr <- enr_combined %>% filter(!is.na(adj_p_value), adj_p_value <= 0.05)
     up_pathways <- sig_enr %>% filter(enrichment > 0) %>% arrange(adj_p_value)
     down_pathways <- sig_enr %>% filter(enrichment < 0) %>% arrange(adj_p_value)

     get_program_members <- function(ann, pathways_df, target_dir) {
       for (col_cand in c("gene_names", "member_genes")) {
         if (col_cand %in% names(pathways_df)) {
           row <- pathways_df %>% filter(annotation == ann)
           if (nrow(row) > 0 && !is.na(row[[col_cand]][1]) && nzchar(as.character(row[[col_cand]][1]))) {
             m <- trimws(unlist(strsplit(as.character(row[[col_cand]][1]), ",")))
             m_sub <- expr %>% filter(gene_name %in% m)
             if (target_dir == "UP") m_sub <- m_sub %>% filter(log2_foldchange > 0) else m_sub <- m_sub %>% filter(log2_foldchange < 0)
             m_sub <- m_sub %>% arrange(adj_p_value, desc(abs(log2_foldchange)))
             if (nrow(m_sub) >= 2) return(head(unique(na.omit(m_sub$gene_name)), 8))
           }
         }
       }
       m_expr <- expr %>%
         filter(if_any(any_of(c("biological_process", "cellular_component", "molecular_function", "reactome_pathway", "wiki_pathway")), ~ grepl(ann, .x, fixed = TRUE)))
       if (target_dir == "UP") m_expr <- m_expr %>% filter(log2_foldchange > 0) else m_expr <- m_expr %>% filter(log2_foldchange < 0)
       m_expr <- m_expr %>% arrange(adj_p_value, desc(abs(log2_foldchange)))
       head(unique(na.omit(m_expr$gene_name)), 8)
     }

     if (nrow(up_pathways) > 0) {
       best_up_ann <- up_pathways$annotation[1]
       m_up <- get_program_members(best_up_ann, up_pathways, "UP")
       if (length(m_up) >= 2) {
         prog_a <- m_up
         prog_a_name <- paste0("Induced: ", substr(best_up_ann, 1, 35))
       }
     }
     if (nrow(down_pathways) > 0) {
       best_down_ann <- down_pathways$annotation[1]
       m_down <- get_program_members(best_down_ann, down_pathways, "DOWN")
       if (length(m_down) >= 2) {
         prog_b <- m_down
         prog_b_name <- paste0("Repressed: ", substr(best_down_ann, 1, 35))
       }
     }
   }

   if (length(prog_a) < 2) { prog_a <- head(unique(na.omit(up$gene_name)), 8); prog_a_name <- "Top Upregulated Candidates" }
   if (length(prog_b) < 2) { prog_b <- head(unique(na.omit(down$gene_name)), 8); prog_b_name <- "Top Downregulated Candidates" }
   if (!length(prog_b)) prog_b <- head(expr$gene_name[!is.na(expr$gene_name)], 5)

   sig_list <- list()
   sig_list[[prog_a_name]] <- prog_a
   sig_list[[prog_b_name]] <- prog_b

   # 3. Generate Discussion Figures
   # Heatmap
   tp_data |> plot_heatmap(row_names = "gene_name", tag = "module_discussion", destination = "png", path = "data")

   # Signatures Dichotomy
   plot_signatures(data = tp_data, contrast_str,
     signatures = sig_list,
     labels_column = "gene_name", tag = "dichotomy_discussion", destination = "png", path = "data")

   # Candidate Targets
   candidate_genes <- head(unique(na.omit(c(head(up$gene_name, 3), head(down$gene_name, 3)))), 6)
   status_map <- setNames(ifelse(candidate_genes %in% up$gene_name, "Upregulated", "Downregulated"), candidate_genes)
   plot_candidates(data = tp_data, contrast_str, candidates = candidate_genes, status = status_map,
     labels_column = "gene_name", tag = "literature", destination = "png", path = "data")


   # Imputation Diagnostic
   tp_data |> plot_imputation_diagnostic(contrast_str, labels_column = "gene_name",
     destination = "png", path = "data", top_n = 10)

   # 4. Standardize Discussion Figure Paths
   find_plot <- function(pattern) {
     f <- list.files("data", pattern = pattern, full.names = TRUE, ignore.case = TRUE)
     f <- f[file.info(f)$size > 0]
     if (length(f)) f[which.max(file.info(f)$mtime)] else NA_character_
   }
   plot_specs <- list(
     module = c("module_.*[.]png$", "plot_discussion_module.png"),
     dichotomy = c("(dichotomy|signatures|programs).*[.]png$", "plot_discussion_dichotomy.png"),
     forest = c("(candidates|forest).*literature.*[.]png$|literature.*[.]png$", "plot_discussion_literature_forest.png"),
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
     rel <- if ("candidate_reliability" %in% names(r) && !is.na(r$candidate_reliability)) as.character(r$candidate_reliability) else NA_character_
     bias <- if ("imputation_bias" %in% names(r) && !is.na(r$imputation_bias)) as.character(r$imputation_bias) else NA_character_
     risk <- if (!is.na(rel) && nzchar(rel)) {
       paste(rel, if (!is.na(bias) && nzchar(bias)) paste0("; bias ", bias) else "")
     } else "Not reported in expression table"
     list(
       gene = as.character(r$gene_name),
       accession = as.character(r$protein),
       log2fc = unname(as.numeric(r$log2_foldchange)),
       p_value = format(as.numeric(r$p_value), scientific = TRUE, digits = 3),
       q_value = format(as.numeric(r$adj_p_value), scientific = TRUE, digits = 3),
       imputation_risk = risk,
       candidate_reliability = if (is.na(rel)) NULL else rel,
       imputation_bias = if (is.na(bias)) NULL else bias,
       `function` = if ("description" %in% names(r) && !is.na(r$description)) as.character(r$description) else NA_character_
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
   qn <- get_quant_names(tp_data)
   active_sel <- if (is.data.frame(qn) && "selected" %in% names(qn)) qn$quant_name[qn$selected] else character(0)
   active_assay <- if (length(active_sel) > 0) active_sel[1] else tail(get_quant_names(tp_data, format = "vector"), 1)
   ops_txt <- paste(capture.output(operations(tp_data), type = "message"), collapse = " ")
   imputation_status <- if (grepl("impute", ops_txt, ignore.case = TRUE)) "imputed" else "unimputed"

   # Automated Accounting for Unmodeled Features
   id_col <- if (!is.null(tp_data[["identifier"]])) tp_data[["identifier"]][1] else "protein"
   unmodeled_prots <- setdiff(total_quant, expr[[id_col]])
   quant_col <- paste0("abundance_", active_assay)
   df_long <- as.data.frame(tp_data, shape = "long")
   long_unmod <- df_long[df_long[[id_col]] %in% unmodeled_prots, ]

   zero_quant <- 0
   condition_dropout <- 0
   dropout_detail <- list()

   if (nrow(long_unmod) > 0 && quant_col %in% names(long_unmod)) {
     obs_per_prot <- tapply(!is.na(long_unmod[[quant_col]]), long_unmod[[id_col]], sum)
     zero_quant <- sum(obs_per_prot == 0)
     condition_dropout <- sum(obs_per_prot > 0)

     if (condition_dropout > 0 && "sample" %in% names(long_unmod)) {
       sub_dropout <- long_unmod[long_unmod[[id_col]] %in% names(which(obs_per_prot > 0)), ]
       sample_groups <- unique(sub_dropout$sample)
       by_cond <- lapply(sample_groups, function(grp) {
         sub_g <- sub_dropout[sub_dropout$sample == grp, ]
         tapply(!is.na(sub_g[[quant_col]]), sub_g[[id_col]], sum)
       })
       names(by_cond) <- sample_groups
       for (grp in sample_groups) {
         other_grps <- setdiff(sample_groups, grp)
         grp_detected <- by_cond[[grp]] > 0
         others_missing <- if (length(other_grps) > 0) {
           Reduce(`&`, lapply(other_grps, function(og) by_cond[[og]] == 0))
         } else rep(TRUE, length(grp_detected))
         dropout_detail[[paste0(grp, "_exclusive")]] <- sum(grp_detected & others_missing)
       }
     }
   }

   feature_retention <- list(
     total_quantified = length(total_quant),
     modeled_in_expression = nrow(expr),
     unmodeled_total = length(unmodeled_prots),
     unmodeled_zero_quant = zero_quant,
     unmodeled_condition_exclusive = condition_dropout,
     unmodeled_condition_exclusive_breakdown = dropout_detail
   )

   digest <- list(
     study_title = paste0("Differential Proteomics Analysis: ", contrast_str),
     contrast = contrast_str, analyte = if (!is.null(tp_data[["analyte"]])) tp_data[["analyte"]] else "proteins",
     total_quantified = length(total_quant),
     expression_table_rows = nrow(expr),
     feature_retention = feature_retention,
     active_assay = if (length(active_assay)) active_assay else "normalized",
     imputation_status = imputation_status,

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
   - The script must write a clean JSON file compiling all primary statistics, sample counts, differential expression tallies, feature retention breakdown (`feature_retention`: modeled vs unmodeled entities, accounting for zero-quantification background vs condition-exclusive dropouts), top candidates, pathway enrichments, and figure paths so Phase 11 can author the manuscript directly without running exploratory bash or R commands.
   > ⚠️ **R Syntax Note for Reserved Keyword `function`**:
   > In R, `function` is a reserved language keyword. When constructing named list elements for JSON serialization, always quote or backtick it (e.g. `list(gene = ..., \`function\` = as.character(r$description))` or `"function" = ...`) to prevent critical parser syntax errors (`unexpected '=' in "..., function="`).

---

#### Checkpoint Gate & Phase Completion

- [ ] **Checkpoint Gate**:
  1. `code/10_figures.R` executed with status code 0 and output logged to `logs/10_figures/console.log`.
  2. Four discussion figures exist in `data/` with non-zero file sizes (`*module*.png`, `*signatures*.png` or `*programs*.png` or `*dichotomy*.png`, `*candidates*.png` or `*forest*.png`, `*expression*imputation*.png` or `*imputation*.png`).
  3. `data/manuscript_digest.json` exists on disk with non-zero file size, `discussion_figures` lists the 4 generated figure paths, and `feature_retention` details unmodeled feature statistics.
  4. (Optional validation command): Verify digest schema cleanly:
     ```bash
     Rscript -e 'x <- jsonlite::fromJSON("data/manuscript_digest.json", simplifyVector = FALSE); stopifnot(length(x$top_candidates_up) > 0, length(x$discussion_figures) == 4, !is.null(x$feature_retention)); cat("Digest validation PASS\n")'
     ```
- [ ] **Complete Phase**:
  - Invoke `complete_phase(phaseName = "10_FIGURES", summary = "Generated 4 hypothesis-driven discussion figures in data/ and compiled statistical digest with feature retention accounting in data/manuscript_digest.json.")`.
