suppressPackageStartupMessages({
  library(tidyproteomics)
  library(dplyr)
})

cat("Phase 2: contaminant filtering and normalization-state audit\n")
input_file <- "data/tidyproteomics_data.rds"
if (!file.exists(input_file)) stop("Required input is missing: ", input_file)
data <- readRDS(input_file)
cat("\n--- Loaded object ---\n")
print(data)

annotation_terms <- get_annotation_terms(data, format = "vector")
accounting_terms <- get_accountings(data, format = "vector")
data_filtered <- data
if ("description" %in% annotation_terms) {
  data_filtered <- data_filtered %>% subset(!description %like% "CRAP|Trypsin")
  cat("Applied description contaminant filter (CRAP|Trypsin).\n")
} else {
  cat("No description annotation available; contaminant filter skipped.\n")
}
if ("num_unique_peptides" %in% accounting_terms) {
  data_filtered <- data_filtered %>% subset(num_unique_peptides >= 2)
  cat("Applied protein confidence filter: num_unique_peptides >= 2.\n")
} else {
  cat("Protein unique-peptide accounting unavailable; confidence filter skipped.\n")
}
cat("\n--- Filtered object state ---\n")
print(data_filtered)

ops <- operations(data_filtered)
quants <- get_quant_names(data_filtered, format = "vector")
# Preprocessed objects may expose only their selected abundance source; a
# non-raw sole layer also denotes an already normalized quantitative state.
already_normalized <- length(quants) > 1 ||
  (length(quants) == 1 && !identical(quants, "raw")) ||
  any(grepl("normaliz", ops, ignore.case = TRUE), na.rm = TRUE)
if (already_normalized) {
  cat("\nPre-existing normalization detected (quantitative source/history). Preserving upstream normalization to prevent double-scaling and variance distortion.\n")
  norm_data <- data_filtered
  print(norm_data)
  norm_summary <- tryCatch(summary(norm_data, "normalization"), error = function(e) {
    cat("Normalization comparison summary unavailable: ", conditionMessage(e), "\n", sep = "")
    NULL
  })
} else {
  cat("\nNo prior normalization detected; benchmarking median, linear, loess, and limma.\n")
  norm_candidates <- data_filtered %>% normalize(.method = c("median", "linear", "loess", "limma"))
  norm_data <- norm_candidates %>% select_normalization()
  print(norm_data)
  norm_summary <- summary(norm_data, "normalization")
}
if (!is.null(norm_summary)) {
  cat("\n--- Normalization/CV and PCA summary ---\n")
  print(norm_summary)
}

cat("\n--- Per-sample quality and PCA scores ---\n")
sample_summary <- tryCatch(summary(norm_data, "sample"), error = function(e) {
  cat("Per-sample summary unavailable: ", conditionMessage(e), "\n", sep = "")
  NULL
})
if (!is.null(sample_summary)) print(sample_summary)

if (length(get_quant_names(norm_data, format = "vector")) > 1) {
  tryCatch(invisible(norm_data %>% plot_variation_cv(destination = "png")),
           error = function(e) cat("Variation plot failed: ", conditionMessage(e), "\n", sep = ""))
}
tryCatch(invisible(norm_data %>% plot_pca(destination = "png")),
         error = function(e) cat("PCA plot failed: ", conditionMessage(e), "\n", sep = ""))
tryCatch(invisible(norm_data %>% plot_heatmap(destination = "png")),
         error = function(e) cat("Optional heatmap unavailable: ", conditionMessage(e), "\n", sep = ""))

plot_files <- list.files(pattern = "^plot_.*(variation|pca|heatmap).*\\.png$", full.names = TRUE)
for (plot_file in plot_files) {
  destination <- file.path("data", basename(plot_file))
  if (normalizePath(plot_file, mustWork = FALSE) != normalizePath(destination, mustWork = FALSE)) {
    if (!file.rename(plot_file, destination)) warning("Could not move plot: ", plot_file)
  }
}

saveRDS(norm_data, file = input_file)
cat("\nPersisted final object to ", input_file, "\n", sep = "")
cat("Quantitative layers: ", paste(get_quant_names(norm_data, format = "vector"), collapse = ", "), "\n", sep = "")
cat("Available sample groups: ", paste(get_sample_names(norm_data, format = "vector"), collapse = " | "), "\n", sep = "")
cat("Diagnostic plot files in data/:\n")
print(list.files("data", pattern = "^plot_.*(variation|pca|heatmap).*\\.png$"))
