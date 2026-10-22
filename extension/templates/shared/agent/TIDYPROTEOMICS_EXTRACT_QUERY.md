---
name: TIDYPROTEOMICS_EXTRACT_QUERY
description: Read-only data extraction, quantitative matrix access, Venn/Euler diagram segment extraction, targeted follow-up hypothesis queries, and unthresholded proteomics exploration.
---

# tidyproteomics: Data Extraction, Hypothesis Queries & Segment Isolation

This skill module is optimized for downstream phases (`06_OBSERVATIONS`, `07_KNOWLEDGE`, `08_WEBSEARCH`, `09_LITERATURE`). It provides read-only extraction of statistical results, targeted candidate inquiries, Venn/Euler diagram segment extraction, and unthresholded complex exploration.

---

## 1. Loading & Introspecting Analyzed Objects

Always load the persisted dataset and inspect available analyses:
```r
library(tidyproteomics)
library(dplyr)

# Load persisted dataset
data <- readRDS("data/tidyproteomics_data.rds")

# Print concise object summary
print(data)

# Catalog completed statistical analyses and available contrasts
analyses <- get_analyses(data)
print(analyses) # Columns: comparison, analysis ("expression" or "enrichment")

# Extract unique contrast names (e.g. "knockdown/control")
contrast_names <- unique(analyses$comparison)
```

---

## 2. Exporting Tabular Analysis Results

Use `export_analysis()` to pull statistical tables directly without re-running linear models:

```r
# 1. Extract differential expression table
exp_tbl <- export_analysis(data, "knockdown/control", .analysis = "expression")

# Inspect top upregulated proteins (|log2FC| >= 1.0, adj_p_value <= 0.05)
top_up <- exp_tbl %>%
  filter(!is.na(adj_p_value), adj_p_value <= 0.05, log2_foldchange >= 1.0) %>%
  arrange(desc(log2_foldchange))

# Inspect top downregulated proteins
top_down <- exp_tbl %>%
  filter(!is.na(adj_p_value), adj_p_value <= 0.05, log2_foldchange <= -1.0) %>%
  arrange(log2_foldchange)

# 2. Extract pathway enrichment table (requires .term = "<category>")
enr_tbl <- rlang::inject(export_analysis(data, !!rlang::parse_expr("knockdown/control"), .analysis = "enrichment", .term = "biological_process"))

top_pathways <- enr_tbl %>%
  filter(!is.na(adj_p_value), adj_p_value <= 0.05) %>%
  arrange(adj_p_value)
```

---

## 3. Targeted Hypothesis Queries & Unthresholded Exploration

When pursuing specific biological hypotheses, candidate co-factors, or literature-derived interactors in Phases 07, 08, and 09:

```r
# Query specific candidate proteins or complex subunits across the entire quantified proteome:
candidate_genes <- c("VCP", "FAF2", "DERL1", "UFD1")

candidate_results <- exp_tbl %>%
  filter(if_any(any_of(c("gene_name", "gene_symbol", "symbol", "protein")), ~ .x %in% candidate_genes))

# Inspect effect sizes, nominal p-values, and adjusted p-values:
candidate_results %>%
  select(any_of(c("gene_name", "protein", "log2_foldchange", "p_value", "adj_p_value", "description"))) %>%
  print()
```

> [!TIP]
> **Sub-Threshold Coordinated Regulation**:
> In literature-guided exploration, individual complex subunits may miss strict genome-wide FDR thresholds (e.g. $q > 0.05$), yet display consistent nominal shifts ($p < 0.05$) in the same biological direction. Always check unthresholded $\log_2\text{FC}$ and nominal $p$-values when evaluating multi-protein complexes.

---

## 4. Extracting Quantitative Matrices & Long Data

Convert `tidyproteomics` objects into tidy data frames for custom visualization or summary tables:

```r
# Extract long-format tidy data frame of active quantitative abundances
tidy_long <- extract(data, na.rm = TRUE)
head(tidy_long)

# Convert to wide-format matrix (proteins as rows, samples as columns)
wide_df <- as.data.frame(data, shape = "wide")
```

---

## 5. Venn/Euler Diagram Segment Isolation (`extracting.Rmd`)

When isolating proteins uniquely detected in or absent from specific conditions:

```r
# 1. Filter for non-imputed proteins to evaluate true mass spectrometry detections
true_detections <- data %>% subset(imputed == 0)

# 2. Extract condition-exclusive proteins (e.g., present in control, lost upon knockout)
# intersection() automatically synchronizes $quantitative, $accounting, $annotations, and $experiments:
knockout_lost <- true_detections %>%
  intersection(.include = c("control"), .exclude = c("knockdown"))

print(knockout_lost) # Retains only the isolated subset of proteins!

# 3. Convert extracted segment into a clean tibble
tbl_exclusive <- knockout_lost %>%
  extract(na.rm = TRUE)

# Export segment table to CSV
readr::write_csv(tbl_exclusive, "data/proteins_exclusive_control.csv")

# 4. Extract shared core proteome (proteins present in both conditions)
shared_core <- true_detections %>%
  intersection(.include = c("control", "knockdown"))
```
