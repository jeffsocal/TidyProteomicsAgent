#!/usr/bin/env Rscript
# ==============================================================================
# Script Name: interrogate_unthresholded_proteomics.R
# Purpose:     Skill 2 of Two-Way Interrogation. Queries the full, UNTHRESHOLDED
#              R proteomics dataset (data/tidyproteomics_data.rds) for candidate
#              symbols [X, Y, Z] predicted by the literature knowledge database.
#              Checks for coordinate sub-threshold shifts (e.g. p < 0.05 or
#              concordant log2FC direction even if missing strict volcano cutoffs),
#              and performs custom fast gene-set enrichment (fgsea) against the
#              entire ranked proteome.
#
# Usage:
#   Rscript tools/literature/interrogate_unthresholded_proteomics.R <candidate_symbols> [module_name] [rds_path] [contrast]
#
# Examples:
#   Rscript tools/literature/interrogate_unthresholded_proteomics.R "UFD1,NPLOC4,FAF2,ANKZF1" "ERAD_Cofactors" data/tidyproteomics_data.rds
# ==============================================================================

suppressPackageStartupMessages({
  if (!requireNamespace("tidyproteomics", quietly = TRUE)) stop("R package 'tidyproteomics' is required.")
  if (!requireNamespace("dplyr", quietly = TRUE)) stop("R package 'dplyr' is required.")
  if (!requireNamespace("jsonlite", quietly = TRUE)) stop("R package 'jsonlite' is required.")
})

JSON_MARKER <- "@@LITERATURE_JSON@@"

emit <- function(payload) {
  cat(JSON_MARKER, jsonlite::toJSON(payload, auto_unbox = TRUE, null = "null", na = "null", dataframe = "rows"), "\n", sep = "")
}

fail <- function(msg) {
  emit(list(ok = FALSE, error = as.character(msg)))
  quit(status = 1, save = "no")
}

parse_list <- function(val) {
  if (is.null(val) || !nzchar(trimws(val))) return(character(0))
  trimws(strsplit(val, "[,;\\s]+")[[1]])
}

main <- function() {
  args <- commandArgs(trailingOnly = TRUE)
  if (length(args) < 1) {
    fail("Usage: interrogate_unthresholded_proteomics.R <candidate_symbols> [module_name] [rds_path] [contrast]")
  }

  candidate_symbols <- toupper(parse_list(args[1]))
  if (length(candidate_symbols) == 0) fail("No candidate symbols provided.")

  module_name <- if (length(args) >= 2 && nzchar(trimws(args[2]))) trimws(args[2]) else "Literature_Candidates"
  rds_path <- if (length(args) >= 3 && nzchar(trimws(args[3]))) trimws(args[3]) else "data/tidyproteomics_data.rds"

  if (!file.exists(rds_path)) {
    fail(sprintf("Proteomics object not found at '%s'. Ensure Phase 4/5 have completed.", rds_path))
  }

  tp_data <- tryCatch(readRDS(rds_path), error = function(e) fail(sprintf("Could not read RDS file: %s", conditionMessage(e))))

  # Detect available contrasts or use explicit contrast argument if provided
  explicit_contrast <- if (length(args) >= 4 && nzchar(trimws(args[4]))) trimws(args[4]) else NULL

  get_available_contrasts <- function(obj) {
    nm <- names(unclass(obj))
    slot_hits <- nm[grep("^ana", nm)]
    if (length(slot_hits) > 0) {
      names(unclass(obj)[[slot_hits[1]]])
    } else {
      character(0)
    }
  }

  contrast_names <- if (!is.null(explicit_contrast)) {
    c(explicit_contrast)
  } else {
    get_available_contrasts(tp_data)
  }

  if (is.null(contrast_names) || length(contrast_names) == 0) {
    fail("No differential expression analysis found in tidyproteomics object. Run expression analysis first.")
  }

  contrast_results <- list()
  all_tables <- list()

  for (c_name in contrast_names) {
    c_parts <- strsplit(c_name, "/")[[1]]
    t_group <- c_parts[1]
    c_group <- if (length(c_parts) > 1) c_parts[2] else "control"
    contrast_tag <- paste0(t_group, "-", c_group)

    # Export full unthresholded expression analysis
    exp_tbl <- tryCatch(
      tidyproteomics::export_analysis(tp_data, c_name, .analysis = "expression"),
      error = function(e) NULL
    )
    if (is.null(exp_tbl) || nrow(exp_tbl) == 0) next

    # Detect entity/symbol columns
    id_cols <- intersect(
      c("gene_name", "gene_symbol", "symbol", "gene", "protein", "accession"),
      colnames(exp_tbl)
    )
    if (length(id_cols) == 0) id_cols <- colnames(exp_tbl)[1]

    # Filter unthresholded table for candidate symbols
    matched_rows <- exp_tbl %>%
      dplyr::filter(dplyr::if_any(dplyr::all_of(id_cols), ~ toupper(as.character(.x)) %in% candidate_symbols))

    # Evaluate metrics
    num_tested <- length(candidate_symbols)
    num_detected <- nrow(matched_rows)

    matched_display <- matched_rows %>%
      dplyr::select(dplyr::any_of(c(
        id_cols, "log2_foldchange", "p_value", "adj_p_value", "foldchange", "description", "name"
      ))) %>%
      dplyr::mutate(
        subthreshold_sig = (!is.na(p_value) & p_value <= 0.05),
        strict_sig = (!is.na(adj_p_value) & adj_p_value <= 0.05 & abs(log2_foldchange) >= 1.0),
        trend_direction = ifelse(log2_foldchange > 0, "UP", ifelse(log2_foldchange < 0, "DOWN", "FLAT"))
      )

    # Fast GSEA if fgsea is available and we have at least 3 detected genes
    fgsea_res <- NULL
    if (requireNamespace("fgsea", quietly = TRUE) && num_detected >= 3 && "log2_foldchange" %in% colnames(exp_tbl)) {
      ranked_df <- exp_tbl %>%
        dplyr::filter(!is.na(log2_foldchange)) %>%
        dplyr::mutate(
          rank_metric = ifelse(!is.na(p_value) & p_value > 0,
                               sign(log2_foldchange) * -log10(p_value),
                               log2_foldchange),
          gene_id = toupper(as.character(.data[[id_cols[1]]]))
        ) %>%
        dplyr::distinct(gene_id, .keep_all = TRUE) %>%
        dplyr::arrange(dplyr::desc(rank_metric))

      ranks <- stats::setNames(ranked_df$rank_metric, ranked_df$gene_id)
      pathway_list <- list()
      pathway_list[[module_name]] <- candidate_symbols

      fgsea_out <- tryCatch(
        as.data.frame(fgsea::fgsea(pathways = pathway_list, stats = ranks, minSize = 2, maxSize = 500, nPermSimple = 2000)),
        error = function(e) NULL
      )

      if (!is.null(fgsea_out) && nrow(fgsea_out) > 0) {
        fgsea_res <- list(
          pathway = module_name,
          pval = fgsea_out$pval[1],
          padj = fgsea_out$padj[1],
          ES = fgsea_out$ES[1],
          NES = fgsea_out$NES[1],
          size = fgsea_out$size[1],
          leadingEdge = if ("leadingEdge" %in% colnames(fgsea_out)) paste(unlist(fgsea_out$leadingEdge[1]), collapse = ", ") else ""
        )
      }
    }

    # Generate Markdown Table
    md_table <- ""
    if (nrow(matched_display) > 0) {
      cols_to_show <- intersect(
        c(id_cols[1], "log2_foldchange", "p_value", "adj_p_value", "trend_direction", "subthreshold_sig", "strict_sig"),
        colnames(matched_display)
      )
      tbl_clean <- matched_display[, cols_to_show, drop = FALSE]
      md_table <- paste(knitr::kable(tbl_clean, format = "pipe", digits = 3), collapse = "\n")
    }

    contrast_results[[contrast_tag]] <- list(
      contrast = contrast_tag,
      candidates_tested = num_tested,
      candidates_detected = num_detected,
      subthreshold_p05_count = sum(matched_display$subthreshold_sig, na.rm = TRUE),
      strict_sig_count = sum(matched_display$strict_sig, na.rm = TRUE),
      fgsea = fgsea_res,
      matched_rows = matched_display,
      markdown_table = md_table
    )
  }

  emit(list(
    ok = TRUE,
    module_name = module_name,
    candidates = candidate_symbols,
    rds_path = rds_path,
    contrasts = contrast_results
  ))
}

tryCatch(main(), error = function(e) fail(conditionMessage(e)))
