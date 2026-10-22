suppressPackageStartupMessages({
  library(tidyproteomics)
  library(dplyr)
})

cat("Phase 3: missingness audit and imputation-state verification\n")
input_file <- "data/tidyproteomics_data.rds"
if (!file.exists(input_file)) stop("Required input is missing: ", input_file)
norm_data <- readRDS(input_file)
cat("\n=== LOADED OBJECT ===\n")
print(norm_data)

cat("\n=== MISSING VALUE AUDIT ===\n")
ops_text <- paste(capture.output(print(norm_data)), collapse = " ")
ops_audit <- capture.output(operations(norm_data))
ops_text <- paste(ops_text, ops_audit, collapse = " ")
cat("Quantitative layers: ", paste(get_quant_names(norm_data, format = "vector"), collapse = ", "), "\n", sep = "")
cat("Sample groups: ", paste(get_sample_names(norm_data, format = "vector"), collapse = " | "), "\n", sep = "")
pre_summary <- tryCatch(summary(norm_data, "sample"), error = function(e) {
  cat("Per-sample quality summary unavailable: ", conditionMessage(e), "\n", sep = "")
  NULL
})
if (!is.null(pre_summary)) print(pre_summary)

quant_before <- extract(norm_data)
if (!("abundance" %in% names(quant_before))) {
  stop("extract() did not return the expected active 'abundance' column; cannot audit missingness safely.")
}
missing_before <- sum(is.na(quant_before$abundance))
nonfinite_before <- sum(!is.na(quant_before$abundance) & !is.finite(quant_before$abundance))
total_before <- length(quant_before$abundance)
cat(sprintf("Active quantitative observations: %d\n", total_before))
cat(sprintf("Missing values before decision: %d (%.4f%%)\n", missing_before, 100 * missing_before / max(1, total_before)))
cat(sprintf("Non-finite, non-missing values before decision: %d\n", nonfinite_before))
if (missing_before > 0) {
  by_sample <- quant_before %>%
    group_by(sample) %>%
    summarise(observations = n(), missing = sum(is.na(abundance)),
              missing_percent = 100 * mean(is.na(abundance)), .groups = "drop")
  cat("Missingness by current sample label:\n")
  print(by_sample)
} else {
  cat("No active-layer missing values: complete-case status verified.\n")
}

already_imputed <- grepl("imput", ops_text, ignore.case = TRUE)
cat("Pre-existing imputation in operation history: ", already_imputed, "\n", sep = "")
if (already_imputed) {
  cat("Preserving verified upstream imputation; no second imputation applied.\n")
  imp_data <- norm_data
} else if (missing_before == 0) {
  cat("Complete-case active matrix; bypassing imputation to preserve empirical observations.\n")
  imp_data <- norm_data
} else {
  cat("Unimputed missingness present. Applying within-sample left-censored minimum imputation as a conservative LOD-oriented strategy.\n")
  imp_data <- norm_data %>% impute(.function = base::min, method = "column", group_by_sample = TRUE)
}

cat("\n=== POST-DECISION OBJECT ===\n")
print(imp_data)
cat("\n=== OPERATION HISTORY ===\n")
ops_after_text <- paste(capture.output(print(imp_data)), capture.output(operations(imp_data)), collapse = " ")
quant_after <- extract(imp_data)
missing_after <- sum(is.na(quant_after$abundance))
nonfinite_after <- sum(!is.na(quant_after$abundance) & !is.finite(quant_after$abundance))
cat(sprintf("Missing values after decision: %d (%.4f%%)\n", missing_after, 100 * missing_after / max(1, length(quant_after$abundance))))
cat(sprintf("Non-finite, non-missing values after decision: %d\n", nonfinite_after))
cat(sprintf("Finite positive abundance range: %.6g to %.6g\n",
            min(quant_after$abundance[is.finite(quant_after$abundance) & quant_after$abundance > 0], na.rm = TRUE),
            max(quant_after$abundance[is.finite(quant_after$abundance) & quant_after$abundance > 0], na.rm = TRUE)))
if (missing_after > 0 || nonfinite_after > 0) stop("Post-imputation matrix contains missing or non-finite quantitative values.")
if (!any(is.finite(quant_after$abundance) & quant_after$abundance > 0)) stop("No finite positive abundance values remain.")
if (already_imputed && !grepl("imput", ops_after_text, ignore.case = TRUE)) stop("Expected pre-existing imputation is absent from operation history.")

cat("\n=== POST-IMPUTATION QUALITY SUMMARY ===\n")
post_summary <- tryCatch(summary(imp_data, "sample"), error = function(e) {
  cat("Per-sample summary unavailable: ", conditionMessage(e), "\n", sep = "")
  NULL
})
# Imputation Proportion & Accounting Audit
cat("\n=== IMPUTATION PROPORTION & DETECTION-RATE SENSITIVITY AUDIT ===\n")
if ("imputed" %in% names(imp_data$accounting)) {
  acc_imputed <- imp_data$accounting %>%
    left_join(imp_data$experiments %>% select(sample_id, sample), by = "sample_id")
  
  prop_summary <- acc_imputed %>%
    group_by(sample) %>%
    summarise(
      total_measurements = n(),
      imputed_count = sum(imputed > 0, na.rm = TRUE),
      imputed_fraction = mean(imputed > 0, na.rm = TRUE),
      .groups = "drop"
    )
  print(prop_summary)
} else {
  cat("Note: accounting slot does not contain binary imputed column.\n")
}

saveRDS(imp_data, file = input_file)
cat("\nPersisted verified object to ", input_file, "\n", sep = "")
cat("Imputation audit result: ", if (already_imputed) "pre-imputed pass-through" else if (missing_before == 0) "complete-case pass-through" else "new imputation applied", "\n", sep = "")
