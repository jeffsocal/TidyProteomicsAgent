suppressPackageStartupMessages({
  library(tidyproteomics)
  library(dplyr)
  library(limma)
})
data <- readRDS("data/tidyproteomics_data.rds")
files <- data$experiments$sample_file
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
data$experiments$subject_id <- subjects
data$experiments$batch <- batches

# Extract quantitative matrix as in expression_limma:
data_quant <- data %>% tidyproteomics::extract(data$quantitative_source) %>% 
  dplyr::select(!dplyr::matches("^origin$")) %>% 
  tidyproteomics:::transform_log2()

# data_quant already contains identifier

l_comp_pro <- data_quant %>% dplyr::filter(sample %in% c("active_necrotic_granuloma", "healthy")) %>% 
  dplyr::group_by(identifier, sample) %>% 
  dplyr::summarise(n = dplyr::n(), .groups = "drop") %>% 
  dplyr::group_by(identifier) %>% dplyr::summarise(min_group = min(n), n = dplyr::n(), .groups = "drop") %>% 
  dplyr::filter(n > 1, min_group > 0) %>% dplyr::select(identifier) %>% unlist()

data_quant_wide <- data_quant %>% 
  dplyr::filter(sample %in% c("active_necrotic_granuloma", "healthy")) %>% 
  dplyr::filter(identifier %in% l_comp_pro) %>% 
  tidyr::pivot_wider(names_from = c("sample", "replicate"), names_sep = "___", values_from = "abundance_log2")

data_lmfit <- data_quant_wide %>% tibble::column_to_rownames("identifier") %>% as.data.frame()
cat("data_lmfit dimensions:", nrow(data_lmfit), "x", ncol(data_lmfit), "\n")
cat("data_lmfit class:", class(data_lmfit[1,1]), "\n")

cols_samples <- colnames(data_lmfit)
col_df <- data.frame(colname = cols_samples, stringsAsFactors = FALSE) %>%
  tidyr::separate(colname, into = c("sample", "replicate"), sep = "___", remove = FALSE) %>%
  mutate(replicate = as.character(replicate)) %>%
  left_join(data$experiments %>% mutate(replicate = as.character(replicate)), by = c("sample", "replicate"))

condition <- factor(col_df$sample, levels = c("healthy", "active_necrotic_granuloma"))
design <- model.matrix(~ condition)

corfit <- limma::duplicateCorrelation(data_lmfit, design, block = col_df$subject_id)
cat("Consensus correlation between repeated measures/pairs:", corfit$consensus.correlation, "\n")
fit <- limma::lmFit(data_lmfit, design, block = col_df$subject_id, correlation = corfit$consensus.correlation)
fit <- limma::eBayes(fit)
top <- limma::topTable(fit, coef = 2, number = 5)
print(top)
