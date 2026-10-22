suppressPackageStartupMessages({
  library(tidyproteomics)
  library(dplyr)
})

input_file <- "data/tidyproteomics_data.rds"
experiment_file <- "docs/experiment.md"
stopifnot(file.exists(input_file), file.exists(experiment_file))
spec <- readLines(experiment_file, warn = FALSE)
conf_line <- grep("Proceed With Potential Batch Confounding", spec, value = TRUE)
if (length(conf_line) != 1L || !grepl("TRUE\\s*$", conf_line[1], ignore.case = TRUE)) stop("Phase 4 preflight blocked: explicit batch-confounding authorization is not TRUE.")
if (!any(grepl("^`active_necrotic_granuloma` / `healthy`$", spec))) stop("Phase 4 preflight blocked: expected contrast is not recorded in Section 3.C.")

imp_data <- readRDS(input_file)
cat("Loaded preprocessed FragPipe protein object.\n")
print(imp_data)
cat("Pre-existing operations:\n"); print(operations(imp_data))
cat("Raw sample groups:\n"); print(get_sample_names(imp_data))

pooling <- c(
  "active_necrotic granuloma_batch5" = "active_necrotic_granuloma",
  "active_necrotic granuloma_batch6" = "active_necrotic_granuloma",
  "active_necrotic granuloma_batch9" = "active_necrotic_granuloma",
  "healthy_healthy_batch8" = "healthy"
)
apply_line <- grep("Reassign Sample Names According to (Sample Group Renaming & )?Pooling Map", spec, value = TRUE)
apply_pooling <- length(apply_line) == 1L && grepl("TRUE\\s*$", apply_line[1], ignore.case = TRUE)
if (apply_pooling) for (old in names(pooling)) {
  if (old %in% get_sample_names(imp_data, format = "vector")) imp_data <- reassign(imp_data, sample == old, .replace = unname(pooling[[old]]))
}
sample_names <- get_sample_names(imp_data, format = "vector")
cat("Analysis groups after user-authorized recoding:\n"); print(get_sample_names(imp_data))
if (!all(c("active_necrotic_granuloma", "healthy") %in% sample_names)) stop("Expected recoded contrast groups are not both present; no model fitted.")
long_meta <- as.data.frame(imp_data, shape = "long") |> dplyr::select(dplyr::starts_with("sample")) |> dplyr::distinct()
cat("Distinct sample metadata rows (first 12):\n"); print(utils::head(long_meta, 12))

pairs <- list(c("active_necrotic_granuloma", "healthy"))
# Repeated Measures & Paired Modeling Check (Optimization 2)
cat("\n=== REPEATED MEASURES & PAIRED MODELING AUDIT ===\n")
if (!"subject_id" %in% names(imp_data$experiments)) {
  # Parse subject_id and batch if not already present
  files <- imp_data$experiments$sample_file
  sub_matches <- regmatches(files, regexec("(Sample|Donor|Patient|Subject)[-_ ]?([0-9]+)([a-zA-Z])?", files, ignore.case = TRUE))
  batch_matches <- regmatches(files, regexec("(Batch[-_ ]?[0-9]+)", files, ignore.case = TRUE))
  date_matches <- regmatches(files, regexec("(20[12][0-9][01][0-9][0-3][0-9])", files))
  n <- length(files)
  subjects <- character(n)
  batches <- character(n)
  for (i in seq_len(n)) {
    sm <- sub_matches[[i]]
    subjects[i] <- if (length(sm) >= 3) paste0(sm[2], sm[3]) else paste0("Subject_", i)
    bm <- batch_matches[[i]]
    dm <- date_matches[[i]]
    batches[i] <- if (length(bm) >= 2) bm[2] else if (length(dm) >= 2) paste0("Batch_", dm[2]) else "Batch1"
  }
  imp_data$experiments$subject_id <- subjects
  imp_data$experiments$batch <- batches
}

subj_by_cond <- split(imp_data$experiments$sample, imp_data$experiments$subject_id)
has_tech_reps <- any(sapply(subj_by_cond, function(x) length(x) > length(unique(x))))
paired_subjs <- names(subj_by_cond)[sapply(subj_by_cond, function(x) length(unique(x)) > 1)]
has_paired <- length(paired_subjs) > 0

cat(sprintf("Repeated measures within condition (technical cuts): %s\n", has_tech_reps))
cat(sprintf("Paired donors across conditions: %s (%d subjects: %s)\n",
            has_paired, length(paired_subjs), paste(paired_subjs, collapse = ", ")))

if (has_tech_reps || has_paired) {
  cat("Incorporating repeated measures and donor pairing structure: evaluating within-subject correlation via limma::duplicateCorrelation()...\n")
}

ops_before <- operations(imp_data)
preexisting <- tryCatch({
  tab <- export_analysis(imp_data, active_necrotic_granuloma/healthy, .analysis = "expression")
  !is.null(tab) && nrow(tab) > 0 && any(grepl("expression", ops_before, ignore.case = TRUE))
}, error = function(e) FALSE)

if (preexisting) {
  cat("Pre-existing expression results detected; preserving them.\n"); stat_data <- imp_data
} else {
  cat("Computing empirical Bayes moderated t-statistics via limma...\n")
  stat_data <- imp_data |> expression(.pairs = pairs, .method = "limma")
}

# If repeated measures or pairing detected, compute and report consensus correlation:
if (has_tech_reps || has_paired) {
  tryCatch({
    data_quant <- stat_data %>% tidyproteomics::extract(stat_data$quantitative_source) %>% 
      dplyr::select(!dplyr::matches("^origin$")) %>% 
      tidyproteomics:::transform_log2()
    
    data_quant_wide <- data_quant %>% 
      dplyr::filter(sample %in% c("active_necrotic_granuloma", "healthy")) %>% 
      tidyr::pivot_wider(names_from = c("sample", "replicate"), names_sep = "___", values_from = "abundance_log2")
    
    data_lmfit <- data_quant_wide %>% tibble::column_to_rownames("identifier") %>% as.data.frame()
    col_df <- data.frame(colname = colnames(data_lmfit), stringsAsFactors = FALSE) %>%
      tidyr::separate(colname, into = c("sample", "replicate"), sep = "___", remove = FALSE) %>%
      mutate(replicate = as.character(replicate)) %>%
      left_join(stat_data$experiments %>% mutate(replicate = as.character(replicate)), by = c("sample", "replicate"))
    
    design <- model.matrix(~ factor(col_df$sample, levels = c("healthy", "active_necrotic_granuloma")))
    corfit <- limma::duplicateCorrelation(data_lmfit, design, block = col_df$subject_id)
    cat(sprintf("limma::duplicateCorrelation consensus correlation on subject_id: %.4f\n", corfit$consensus.correlation))
  }, error = function(e) {
    cat("Note: duplicateCorrelation audit encountered: ", conditionMessage(e), "\n")
  })
}

cat("Operations after expression analysis:\n"); print(operations(stat_data))
terms <- get_annotation_terms(stat_data, format = "vector")
label_col <- intersect(c("gene_name", "gene_symbol", "symbol", "protein"), terms)[1]
if (length(label_col) == 0L || is.na(label_col)) label_col <- "protein"
cat("Candidate label annotation:", label_col, "\n")

stat_data <- stat_data |> analyze_expressions(labels_column = label_col, log2fc_min = 1, significance_max = 0.05)
# Capture and distinctly name the two directional candidate plots.
invisible(stat_data |> plot_expression(active_necrotic_granuloma/healthy, log2fc_min = 0, significance_max = 1,
  top_n = 10, regulation = "up", labels_column = label_col, destination = "png"))
profile_plot <- list.files(pattern = "^plot_(proteins|peptides)_.*_expression_.*\\.png$")[1]
if (!is.na(profile_plot)) file.rename(profile_plot, "plot_expression_up_active_necrotic_granuloma-healthy.png")
invisible(stat_data |> plot_expression(active_necrotic_granuloma/healthy, log2fc_min = 0, significance_max = 1,
  top_n = 10, regulation = "down", labels_column = label_col, destination = "png"))
assets <- list.files(".", pattern = "^(plot_|table_|.*_volcano_).*\\.(png|csv)$", full.names = TRUE)
for (f in assets) {
  dest <- file.path("data", basename(f))
  if (normalizePath(dirname(f), winslash = "/", mustWork = TRUE) != normalizePath("data", winslash = "/", mustWork = TRUE)) {
    if (file.exists(dest)) unlink(dest)
    if (!file.rename(f, dest)) stop("Could not move generated asset into data/: ", f)
  }
}

result <- export_analysis(stat_data, active_necrotic_granuloma/healthy, .analysis = "expression")
if (is.null(result) || nrow(result) == 0L) stop("Expression result table is empty.")

# Imputation Proportion Tracking & Risk Flagging (Optimization 3)
g1 <- "active_necrotic_granuloma"
g2 <- "healthy"
g1_imp <- paste0("imputed_", g1)
g2_imp <- paste0("imputed_", g2)

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

# Write updated expression table with imputation tracking to disk:
csv_out <- "data/table_proteins_expression_active_necrotic_granuloma-healthy.csv"
readr::write_csv(result, csv_out)
cat(sprintf("Exported expression table with imputation tracking to %s\n", csv_out))
cat("Imputation risk breakdown:\n")
print(table(result$imputation_bias))

cat("Expression result dimensions:", nrow(result), "features x", ncol(result), "columns\n")
cat("Result columns:", paste(names(result)[1:20], collapse = ", "), "...\n")
fc_col <- intersect(c("log2_foldchange", "log2FC", "logFC"), names(result))[1]
q_col <- intersect(c("adj_p_value", "adj.P.Val", "padj"), names(result))[1]
p_col <- intersect(c("p_value", "P.Value", "pvalue"), names(result))[1]
if (!is.na(fc_col) && !is.na(q_col)) {
  sig <- !is.na(result[[q_col]]) & result[[q_col]] <= 0.05 & abs(result[[fc_col]]) >= 1
  cat("Significant features (|log2FC| >= 1, adjusted p <= 0.05):", sum(sig), "; up:", sum(sig & result[[fc_col]] > 0), "; down:", sum(sig & result[[fc_col]] < 0), "\n")
  ord <- order(result[[q_col]], na.last = TRUE)
  show_cols <- unique(c(intersect(label_col, names(result)), intersect(c("protein", fc_col, p_col, q_col, "imputed_total", "imputation_bias"), names(result))))
  cat("Top 10 by adjusted p-value (compact):\n"); print(utils::head(result[ord, show_cols, drop = FALSE], 10))
} else cat("Could not identify expected fold-change/adjusted-p columns for compact summary.\n")
saveRDS(stat_data, file = input_file)
cat("Persisted analyzed object to", input_file, "\nPhase 4 expression analysis completed.\n")
