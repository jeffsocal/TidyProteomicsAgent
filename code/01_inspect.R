suppressPackageStartupMessages({
  library(tidyproteomics)
  library(dplyr)
})

input_file <- "data/tidyproteomics_data.rds"
platform <- "FragPipe"
analyte <- "proteins"
if (!file.exists(input_file)) stop("Input dataset not found: ", input_file)
cat("=== PHASE 01 INSPECT ===\n")
cat(sprintf("Input: %s | platform: %s | analyte: %s\n", input_file, platform, analyte))
data <- readRDS(input_file)
cat("=== CORE OBJECT STATE ===\n")
print(data)
cat("=== UPSTREAM OPERATIONS AUDIT TRAIL ===\n")
ops <- operations(data)
print(ops)
quants <- get_quant_names(data, format = "vector")
cat(sprintf("Available quantitative assays: %s\n", paste(quants, collapse = ", ")))
long <- as.data.frame(data, shape = "long")
quant_cols <- grep("^abundance", names(long), value = TRUE)
missing_fraction <- if (length(quant_cols)) mean(is.na(long[[quant_cols[1]]])) else NA_real_
normalized <- any(quants != "raw") || any(grepl("normaliz", ops, ignore.case = TRUE))
imputed <- any(grepl("imput", ops, ignore.case = TRUE)) ||
  ("imputed" %in% names(long) && any(long$imputed > 0, na.rm = TRUE)) ||
  (is.finite(missing_fraction) && missing_fraction == 0)
cat(sprintf("Pre-existing Normalization Detected: %s\n", normalized))
cat(sprintf("Pre-existing Imputation Detected: %s (active abundance missing fraction: %s)\n", imputed,
            ifelse(is.finite(missing_fraction), sprintf("%.4f", missing_fraction), "not measurable")))
cat("=== CONTAMINATION SUMMARY (CRAP) ===\n")
print(summary(data, contamination = "CRAP"))
cat("=== SAMPLE-LEVEL QUALITY SUMMARY ===\n")
print(summary(data, "sample"))
cat("=== IDENTIFICATION COUNTS PLOT ===\n")
invisible(tryCatch(data %>% plot_counts(destination = "png"), error = function(e) {
  cat("plot_counts error:", conditionMessage(e), "\n")
  NULL
}))
for (f in list.files(pattern = "^plot_.*_counts\\.png$")) {
  file.rename(f, file.path("data", basename(f)))
}
cat("=== FEATURE OVERLAP PLOT ===\n")
invisible(tryCatch(data %>% plot_venn(destination = "png"), error = function(e) {
  cat("plot_venn unavailable; trying Euler: ", conditionMessage(e), "\n")
  tryCatch(data %>% plot_euler(destination = "png"), error = function(e2) {
    cat("plot_euler error:", conditionMessage(e2), "\n")
    NULL
  })
}))
for (f in list.files(pattern = "^plot_.*_(venn|euler)\\.png$")) {
  file.rename(f, file.path("data", basename(f)))
}
cat("=== DISCOVERED SAMPLE GROUPS ===\n")
sample_names <- get_sample_names(data)
print(sample_names)

cat("=== METADATA HEURISTICS & REPLICATE DETECTION ===\n")
parse_sample_metadata <- function(files) {
  sub_matches <- regmatches(files, regexec("(Sample|Donor|Patient|Subject)[-_ ]?([0-9]+)([a-zA-Z])?", files, ignore.case = TRUE))
  batch_matches <- regmatches(files, regexec("(Batch[-_ ]?[0-9]+)", files, ignore.case = TRUE))
  date_matches <- regmatches(files, regexec("(20[12][0-9][01][0-9][0-3][0-9])", files))
  rep_matches <- regmatches(files, regexec("[-_ ](rep|run|tech|cut)[-_ ]?([0-9]+|[a-zA-Z])", files, ignore.case = TRUE))
  
  n <- length(files)
  subjects <- character(n)
  replicates <- character(n)
  batches <- character(n)
  
  for (i in seq_len(n)) {
    sm <- sub_matches[[i]]
    if (length(sm) >= 3) {
      subjects[i] <- paste0(sm[2], sm[3])
      replicates[i] <- if (length(sm) >= 4 && nzchar(sm[4])) sm[4] else "rep1"
    } else {
      subjects[i] <- paste0("Subject_", i)
      replicates[i] <- "rep1"
    }
    
    rm <- rep_matches[[i]]
    if (length(rm) >= 3 && replicates[i] == "rep1") {
      replicates[i] <- paste0(rm[2], rm[3])
    }
    
    bm <- batch_matches[[i]]
    dm <- date_matches[[i]]
    if (length(bm) >= 2 && nzchar(bm[2])) {
      batches[i] <- bm[2]
    } else if (length(dm) >= 2 && nzchar(dm[2])) {
      batches[i] <- paste0("Batch_", dm[2])
    } else {
      batches[i] <- "Batch1"
    }
  }
  
  data.frame(
    sample_file = files,
    subject_id = subjects,
    replicate_id = replicates,
    batch = batches,
    stringsAsFactors = FALSE
  )
}

parsed_meta <- parse_sample_metadata(data$experiments$sample_file)
data$experiments$subject_id <- parsed_meta$subject_id
data$experiments$replicate_id <- parsed_meta$replicate_id
data$experiments$batch <- parsed_meta$batch

n_files <- nrow(data$experiments)
n_subjects <- length(unique(data$experiments$subject_id))
n_batches <- length(unique(data$experiments$batch))
cat(sprintf("Discovered Study Structure: %d raw files mapping to %d unique biological subjects across %d batches.\n",
            n_files, n_subjects, n_batches))

# 1. Paired samples (same subject in multiple conditions)
subj_by_cond <- split(data$experiments$sample, data$experiments$subject_id)
paired_subjs <- names(subj_by_cond)[sapply(subj_by_cond, function(x) length(unique(x)) > 1)]
if (length(paired_subjs) > 0) {
  cat(sprintf("PAIRED SAMPLES DETECTED (%d subjects): %s\n",
              length(paired_subjs), paste(paired_subjs, collapse = ", ")))
} else {
  cat("No paired subjects detected across condition groups.\n")
}

# 2. Bridge samples (same subject across multiple acquisition batches)
subj_by_batch <- split(data$experiments$batch, data$experiments$subject_id)
bridge_subjs <- names(subj_by_batch)[sapply(subj_by_batch, function(x) length(unique(x)) > 1)]
if (length(bridge_subjs) > 0) {
  cat(sprintf("CROSS-BATCH BRIDGE SAMPLES DETECTED (%d subjects): %s\n",
              length(bridge_subjs), paste(bridge_subjs, collapse = ", ")))
} else {
  cat("No bridge samples detected across batches.\n")
}

# 3. Technical replicates / cuts within condition
tech_subjs <- names(which(sapply(subj_by_cond, function(x) length(x) > length(unique(x)))))
if (length(tech_subjs) > 0) {
  cat(sprintf("TECHNICAL REPLICATES / CUTS DETECTED (%d subjects): %s\n",
              length(tech_subjs), paste(tech_subjs, collapse = ", ")))
} else {
  cat("No technical cuts or duplicate injections detected.\n")
}

cat("=== SAMPLE METADATA INVENTORY ===\n")
print(as.data.frame(data$experiments[, c("sample_file", "sample", "subject_id", "replicate_id", "batch")]))

cat("=== FUNCTIONAL ANNOTATION TERMS ===\n")
annot_terms <- get_annotation_terms(data)
print(annot_terms)
saveRDS(data, file = "data/tidyproteomics_data.rds")
cat("Persisted data/tidyproteomics_data.rds with structured metadata.\n")
cat("=== PHASE 01 INSPECT COMPLETE ===\n")
