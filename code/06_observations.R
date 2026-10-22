suppressPackageStartupMessages({
  library(tidyproteomics)
  library(dplyr)
  library(knitr)
})

input_file <- "data/tidyproteomics_data.rds"
stopifnot(file.exists(input_file))
tp_data <- readRDS(input_file)
cat("=== OBJECT SUMMARY ===\n")
print(tp_data)
analyte_name <- "proteins"
available_terms <- get_annotation_terms(tp_data, format = "vector")
analysis_keys <- get_analyses(tp_data, format = "vector")
cat("\n=== AVAILABLE ANNOTATION TERMS ===\n")
cat(paste(available_terms, collapse = ", "), "\n")
cat("\n=== COMPLETED ANALYSES ===\n")
cat(paste(analysis_keys, collapse = "\n"), "\n")
expression_keys <- analysis_keys[grepl(":expression$", analysis_keys)]
resolve_reactome_ids <- function(ids) {
  if (length(ids) == 0) return(character(0))
  resolved <- as.character(ids)
  reactome_idx <- which(grepl("^R-[A-Z]{3}-[0-9]+", resolved))
  if (length(reactome_idx) == 0) return(resolved)

  unique_reactome <- unique(resolved[reactome_idx])
  name_map <- list()

  tsv_paths <- c(
    "tools/reactome_pathways.tsv",
    "data/reactome_pathways.tsv",
    "extension/templates/shared/tools/reactome_pathways.tsv"
  )
  for (tp in tsv_paths) {
    if (file.exists(tp)) {
      tryCatch({
        df <- read.delim(tp, header = FALSE, stringsAsFactors = FALSE, sep = "\t")
        if (ncol(df) >= 2) {
          sub_df <- df[df[[1]] %in% unique_reactome, ]
          if (nrow(sub_df) > 0) {
            for (i in seq_len(nrow(sub_df))) {
              name_map[[sub_df[i, 1]]] <- sub_df[i, 2]
            }
          }
        }
      }, error = function(e) NULL)
      break
    }
  }

  unresolved <- setdiff(unique_reactome, names(name_map))
  if (length(unresolved) > 0) {
    for (rid in unresolved) {
      suppressWarnings(tryCatch({
        url <- paste0("https://reactome.org/ContentService/data/query/", rid)
        con <- url(url, open = "r")
        raw_txt <- readLines(con, warn = FALSE)
        close(con)
        if (length(raw_txt) > 0) {
          parsed <- jsonlite::fromJSON(paste(raw_txt, collapse = "\n"))
          if (!is.null(parsed$displayName) && nzchar(parsed$displayName)) {
            name_map[[rid]] <- parsed$displayName
          }
        }
      }, error = function(e) NULL))
    }
  }

  for (i in reactome_idx) {
    rid <- resolved[i]
    if (!is.null(name_map[[rid]]) && nzchar(name_map[[rid]])) {
      resolved[i] <- name_map[[rid]]
    }
  }
  return(resolved)
}

format_stats <- function(df) {
  df %>% mutate(across(any_of(c("p_value", "adj_p_value")), ~ ifelse(!is.na(.) & . < 1e-4, sprintf("%.2e", .), sprintf("%.4f", .))))
}

contrast_names <- unique(sub(":expression$", "", expression_keys))
cat(sprintf("\nAvailable expression contrasts: %s\n", paste(contrast_names, collapse = ", ")))

# No perturbation target is defined by the study specification.
for (c_name in contrast_names) {
  parts <- strsplit(c_name, "/", fixed = TRUE)[[1]]
  treatment_group <- parts[1]
  control_group <- parts[2]
  contrast <- paste0(treatment_group, "/", control_group)
  cat(sprintf("\n=======================================================\nCONTRAST: %s vs %s\n=======================================================\n", treatment_group, control_group))
  exp_tbl <- rlang::inject(export_analysis(tp_data, !!rlang::parse_expr(contrast), .analysis = "expression"))

  clean_desc_word <- if ("description" %in% names(exp_tbl)) sub(" .*$", "", trimws(exp_tbl$description)) else NA_character_
  clean_desc_word[is.na(clean_desc_word) | clean_desc_word == ""] <- NA_character_

  exp_tbl <- exp_tbl %>%
    mutate(
      gene_name = coalesce(
        if ("gene_name" %in% names(.)) ifelse(is.na(gene_name) | !nzchar(trimws(gene_name)), NA_character_, gene_name) else NA_character_,
        clean_desc_word,
        protein
      ),
      gene_name = gsub(";+", "; ", trimws(gene_name)),
      gene_name = gsub("^[; ]+|[; ]+$", "", gene_name)
    )

  # Imputation Risk Flagging (Optimization 3)
  g1_imp <- paste0("imputed_", treatment_group)
  g2_imp <- paste0("imputed_", control_group)
  exp_tbl <- exp_tbl %>%
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

  cat("\n=== TARGET STATUS: Untargeted / Discovery Screen (No single target gene specified) ===\n")
  sig_all <- exp_tbl %>% filter(!is.na(adj_p_value), adj_p_value <= 0.05, abs(log2_foldchange) >= 1)
  sig_up <- sig_all %>% filter(log2_foldchange >= 1)
  sig_down <- sig_all %>% filter(log2_foldchange <= -1)
  cat("\n=== QUANTITATIVE THRESHOLD COUNTS ===\n")
  cat(sprintf("Total Quantified Identifiers (%s): %d\n", analyte_name, nrow(exp_tbl)))
  cat(sprintf("Total Significant (|log2FC| >= 1, q <= 0.05): %d\n", nrow(sig_all)))
  cat(sprintf("Total Upregulated (log2FC >= 1, q <= 0.05): %d\n", nrow(sig_up)))
  cat(sprintf("Total Downregulated (log2FC <= -1, q <= 0.05): %d\n", nrow(sig_down)))
  
  cat("Imputation risk breakdown for all quantified features:\n")
  print(table(exp_tbl$imputation_bias))

  id_cols <- intersect(c("gene_name", "gene_symbol", "symbol", "gene", "protein", "accession", "description", "name"), names(exp_tbl))
  display_columns <- unique(c(id_cols, intersect(c("log2_foldchange", "p_value", "adj_p_value", "imputation_bias"), names(exp_tbl))))
  cat("\n=== TOP 10 UPREGULATED PROTEINS (WITH IMPUTATION BIAS TAG) ===\n")
  top_up <- sig_up %>% arrange(desc(log2_foldchange), adj_p_value) %>% head(10)
  cat(knitr::kable(top_up %>% select(any_of(display_columns)) %>% format_stats(), format = "pipe"), sep = "\n")
  cat("\n=== TOP 10 DOWNREGULATED PROTEINS (WITH IMPUTATION BIAS TAG) ===\n")
  top_down <- sig_down %>% arrange(log2_foldchange, adj_p_value) %>% head(10)
  cat(knitr::kable(top_down %>% select(any_of(display_columns)) %>% format_stats(), format = "pipe"), sep = "\n")
  cat("\n=== TOP 10 BALANCED CANDIDATES (VOLCANO PI-SCORE) ===\n")
  top_pi <- sig_all %>% mutate(pi_score = abs(log2_foldchange) * -log10(pmax(adj_p_value, 1e-10))) %>% arrange(desc(pi_score)) %>% head(10)
  cat(knitr::kable(top_pi %>% select(any_of(c(display_columns, "pi_score"))) %>% format_stats(), format = "pipe"), sep = "\n")

  # Load exported enrichment table with member proteins if available:
  enr_csv <- file.path("data", paste0("table_proteins_enrichment_", gsub("/", "-", contrast), ".csv"))
  if (file.exists(enr_csv)) {
    enr_tbl <- readr::read_csv(enr_csv, show_col_types = FALSE)
  } else {
    enrichment_keys <- analysis_keys[startsWith(analysis_keys, paste0(contrast, ":enrichment:"))]
    enrichment_terms <- sub("^.*:enrichment:", "", enrichment_keys)
    enrichment_list <- lapply(enrichment_terms, function(term_name) {
      tryCatch(rlang::inject(export_analysis(tp_data, !!rlang::parse_expr(contrast), .analysis = "enrichment", .term = term_name)) %>% mutate(term = term_name, .before = 1), error = function(e) {
        cat(sprintf("Enrichment export failed for %s: %s\n", term_name, conditionMessage(e)))
        NULL
      })
    })
    enr_tbl <- bind_rows(enrichment_list)
    if (nrow(enr_tbl) > 0 && "annotation" %in% names(enr_tbl)) {
      enr_tbl <- enr_tbl %>% mutate(annotation = resolve_reactome_ids(annotation))
    }
  }

  if (nrow(enr_tbl) > 0) {
    cat("\n=== ENRICHMENT SUMMARY BY CATEGORY ===\n")
    summary_enr <- enr_tbl %>% group_by(term) %>% summarise(terms_count = n(), sig_terms = sum(!is.na(adj_p_value) & adj_p_value <= 0.05), .groups = "drop")
    cat(knitr::kable(summary_enr, format = "pipe"), sep = "\n")
    cat("\n=== TOP SIGNIFICANT PATHWAYS (WITH LEADING-EDGE DRIVING PROTEINS) ===\n")
    
    # Extract top 3-5 drivers for display:
    if ("member_proteins" %in% names(enr_tbl)) {
      enr_tbl <- enr_tbl %>%
        mutate(top_drivers = sapply(strsplit(as.character(member_proteins), ",\\s*"), function(x) paste(head(x, 4), collapse = ", ")))
    }
    
    enr_cols <- intersect(c("term", "annotation", "enrichment", "size", "p_value", "adj_p_value", "top_drivers", "leading_edge_count"), names(enr_tbl))
    top_enr <- enr_tbl %>% filter(!is.na(adj_p_value), adj_p_value <= 0.05) %>% arrange(adj_p_value) %>% head(30)
    cat(knitr::kable(top_enr %>% select(any_of(enr_cols)) %>% format_stats(), format = "pipe"), sep = "\n")
  } else {
    cat("\nNo enrichment results were available for this contrast.\n")
  }
}

cat("\n=== CHECKPOINTS ===\n")
cat("Artifact tidyproteomics_data.rds exists in data/: ", file.exists(input_file), "\n", sep = "")
expr_tables <- list.files("data", pattern = "^table_.*_expression_.*\\.csv$")
plot_files <- list.files("data", pattern = "\\.png$", full.names = TRUE)
cat("Expression tables found in data/: ", length(expr_tables), "\n", sep = "")
cat("PNG plots found in data/: ", length(plot_files), "\n", sep = "")
stopifnot(length(contrast_names) > 0, length(expr_tables) > 0, length(plot_files) > 0)
cat("PHASE_6_EXTRACTION_CHECKPOINT_PASS\n")
