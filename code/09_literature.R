suppressPackageStartupMessages({
  library(tidyproteomics)
  library(dplyr)
  library(readr)
})

rds_path <- "data/tidyproteomics_data.rds"
expr_path <- "data/table_proteins_expression_active_necrotic_granuloma-healthy.csv"
candidates <- c("MZB1", "IGLC3", "DEFA1", "ALOX5AP", "PCOLCE", "MFAP2", "CAV1", "AGER", "S100A8", "S100A9", "MMP2", "COL15A1", "LTA4H", "CRP", "CD14", "FCGR3B")
if (!file.exists(rds_path) || !file.exists(expr_path)) stop("Missing saved object or exported expression table")
data <- readRDS(rds_path)
cat("Available analyses:\n")
print(get_analyses(data))
expr <- readr::read_csv(expr_path, show_col_types = FALSE)
ann <- get_annotations(data, term = "gene_name")
if (!all(c("protein", "annotation") %in% names(ann))) stop("Unexpected gene_name annotation schema")
joined <- expr |>
  left_join(ann, by = "protein") |>
  filter(!is.na(annotation)) |>
  mutate(symbols = strsplit(as.character(annotation), ";\\s*")) |>
  tidyr::unnest(symbols) |>
  filter(toupper(symbols) %in% candidates) |>
  transmute(candidate = toupper(symbols), protein, log2_foldchange, p_value, adj_p_value,
            imputed, trend = if_else(log2_foldchange > 0, "UP", if_else(log2_foldchange < 0, "DOWN", "FLAT"))) |>
  arrange(candidate, p_value)
readr::write_csv(joined, "data/literature_candidate_expression.csv")
cat("Candidate protein rows found:", nrow(joined), "\n")
print(joined, n = 40)
if (requireNamespace("fgsea", quietly = TRUE) && nrow(joined) >= 2) {
  ranks <- expr |>
    left_join(ann, by = "protein") |>
    filter(!is.na(annotation), !is.na(p_value), p_value > 0) |>
    mutate(symbol = toupper(sub(";.*$", "", annotation)),
           rank_metric = sign(log2_foldchange) * -log10(p_value)) |>
    distinct(symbol, .keep_all = TRUE)
  stats <- setNames(ranks$rank_metric, ranks$symbol)
  sets <- list(TB_immune_matrix_candidates = intersect(candidates, names(stats)))
  if (length(sets[[1]]) >= 2) {
    fg <- as.data.frame(fgsea::fgsea(pathways = sets, stats = stats, minSize = 2, maxSize = 500, nPermSimple = 2000))
    readr::write_csv(fg, "data/literature_candidate_fgsea.csv")
    print(fg[, c("pathway", "NES", "pval", "padj", "size")])
  } else cat("fgsea skipped: fewer than two candidate symbols mapped to ranked proteins.\n")
} else cat("fgsea skipped: package unavailable or too few candidate rows.\n")
cat("PHASE_9_REVERSE_QUERY_COMPLETE\n")
