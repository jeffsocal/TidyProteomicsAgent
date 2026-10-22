suppressPackageStartupMessages({
  library(tidyproteomics)
  library(dplyr)
  library(tidyr)
})

data <- readRDS("data/tidyproteomics_data.rds")
c_str <- "active_necrotic_granuloma/healthy"

# Expression fold change and p-values
exp_tbl <- rlang::inject(tidyproteomics::export_analysis(data, !!rlang::parse_expr(c_str), .analysis = "expression"))
prot_fc <- setNames(exp_tbl$log2_foldchange, exp_tbl$protein)
prot_pval <- setNames(exp_tbl$adj_p_value, exp_tbl$protein)

# Gene symbol lookup
gene_annos <- data$annotations[data$annotations$term == "gene_name", ]
gene_map <- setNames(sub(";.*", "", gene_annos$annotation), gene_annos$protein)
get_symbol <- function(prot) {
  sym <- gene_map[prot]
  ifelse(!is.na(sym) & nzchar(sym), sym, prot)
}

# Pre-extract all annotations as unnested table:
anno_df <- data$annotations %>%
  filter(!is.na(annotation), nzchar(annotation)) %>%
  separate_rows(annotation, sep = ";") %>%
  mutate(annotation = trimws(annotation)) %>%
  filter(nzchar(annotation)) %>%
  distinct(term, annotation, protein)

cat("Total unnested annotation mappings:", nrow(anno_df), "\n")

# Read current enrichment table
enr_file <- "data/table_proteins_enrichment_active_necrotic_granuloma-healthy.csv"
enr_tbl <- read.csv(enr_file, stringsAsFactors = FALSE)
cat("Enrichment table rows:", nrow(enr_tbl), "\n")

# For each row, find member proteins:
# Note that in enr_tbl, "annotation" might have been resolved to a name (like "Regulation of Complement cascade")
# or be the original ID. Let us also map original Reactome IDs if available.
# Let us test matching for a few terms:
sample_terms <- head(enr_tbl %>% filter(term == "reactome", adj_p_value <= 0.05), 10)
for (i in seq_len(nrow(sample_terms))) {
  term_cat <- sample_terms$term[i]
  term_anno <- sample_terms$annotation[i]
  
  # Find matching proteins in anno_df:
  # Check direct match:
  matched_prots <- anno_df %>% filter(term == term_cat, annotation == term_anno) %>% pull(protein)
  
  # If 0 matches, maybe term_anno was resolved from Reactome ID or vice versa:
  if (length(matched_prots) == 0 && term_cat == "reactome") {
    # Check if there is an original ID or if we can find it via reverse lookup
    tsv_paths <- c("tools/reactome_pathways.tsv", "extension/templates/shared/tools/reactome_pathways.tsv")
    for (tp in tsv_paths) {
      if (file.exists(tp)) {
        lut <- read.delim(tp, header = FALSE, stringsAsFactors = FALSE)
        orig_id <- lut[[1]][lut[[2]] == term_anno]
        if (length(orig_id) > 0) {
          matched_prots <- anno_df %>% filter(term == term_cat, annotation %in% orig_id) %>% pull(protein)
        }
        break
      }
    }
  }
  
  # Order member proteins by |log2FC| descending
  if (length(matched_prots) > 0) {
    fc_vals <- prot_fc[matched_prots]
    p_vals <- prot_pval[matched_prots]
    # Leading edge: significant (adj_p <= 0.05) and ranked by |log2FC|
    ord <- order(-abs(fc_vals))
    ordered_prots <- matched_prots[ord]
    ordered_syms <- sapply(ordered_prots, get_symbol)
    
    sig_count <- sum(!is.na(p_vals) & p_vals <= 0.05)
    top_syms <- head(unique(ordered_syms), 5)
    cat(sprintf("[%s] %s (n=%d, sig=%d): Top drivers: %s\n",
                term_cat, term_anno, length(matched_prots), sig_count, paste(top_syms, collapse = ", ")))
  } else {
    cat(sprintf("[%s] %s: No direct protein match found in anno_df\n", term_cat, term_anno))
  }
}
