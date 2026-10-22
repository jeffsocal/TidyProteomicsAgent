---
name: TIDYPROTEOMICS_ENRICHMENT
description: Biological annotation attaching, functional pathway enrichment testing (GSEA, Wilcoxon), automated batch enrichment pipelines, and visualization.
---

# tidyproteomics: Functional Annotation & Pathway Enrichment

This skill module covers attaching Gene Ontology and pathway annotations, computing statistical enrichment across biological terms, automated multi-term batch analysis, and generating enrichment plots.

---

## 1. Attaching & Inspecting Biological Annotations

### Inspecting Available Terms
Before computing enrichment, verify which biological annotation categories are present in the dataset:
```r
library(tidyproteomics)
library(dplyr)

stat_data <- readRDS("data/tidyproteomics_data.rds")

# View available annotation categories
available_terms <- get_annotation_terms(stat_data, format = "vector")
print(available_terms)
```

### Attaching External Annotations via `annotate()`
If annotations are not embedded in the raw mass spectrometry export, attach them from an external table:
```r
# Custom annotation table must contain: identifier (protein or peptide), term, and annotation
# Example columns: protein, term ("biological_process"), annotation ("autophagy")
anno_df <- read.csv("data/annotations.csv")

annotated_data <- stat_data %>%
  annotate(
    annotations = anno_df,
    duplicates = "replace"  # "replace" (default), "merge", or "leave"
  )
```

---

## 2. Functional Pathway Enrichment Testing

### Enrichment Methods
`tidyproteomics` evaluates whether specific biological processes or pathways are disproportionately altered relative to the proteome background:

```r
enriched_data <- stat_data %>%
  enrichment(
    knockdown/control,
    .terms = c("biological_process", "reactome_pathway"),
    .method = "wilcoxon"   # "wilcoxon" (default) or "gsea"
  )
```

- **Supported Methods**:
  - `".method = 'wilcoxon'"` (Recommended): Two-tailed non-parametric rank-sum test comparing the rank distribution of proteins in the term against all other quantified proteins. Fast, robust, and handles both positive and negative enrichment scores.
  - `".method = 'gsea'"`: Classical Gene Set Enrichment Analysis utilizing running-sum Kolmogorov-Smirnov statistics.

---

## 3. Batch Multi-Term Automation Pipeline (`automating.Rmd`)

Batch-process multiple contrasts and annotation categories simultaneously without manual iteration:

```r
# 1. Define contrast pairs and functional annotation terms
pairs <- list(
  c("knockdown", "control"),
  c("rescue", "control")
)

terms <- c(
  "biological_process",
  "cellular_component",
  "molecular_function",
  "reactome_pathway"
)

# 2. Execute multi-contrast, multi-term enrichment
enriched_data <- stat_data %>%
  enrichment(
    .pairs = pairs,
    .terms = terms,
    .method = "wilcoxon",
    .cpu_cores = 4
  )

# 3. Automatically generate composite horizontal bar plots and CSV tables
enriched_data %>%
  analyze_enrichments(
    significance_max = 0.05,  # BH adjusted p-value (FDR) <= 0.05
    top_n = 30                # Limit to top 30 terms per category
  )
```

Auto-generated files written directly to disk:
- `table_proteins_enrichment_<contrast>.csv`: Full tabular enrichment statistics across all tested terms.
- `proteins_enrichment_<contrast>.png`: Multi-panel horizontal bar plot summarizing normalized enrichment scores and significance across all annotation domains.

---

## 4. Targeted Visualizations & Result Exports

```r
# 1. Plot enrichment for a single contrast and term
invisible(enriched_data %>% plot_enrichment(
  knockdown/control,
  .term = "biological_process",
  destination = "png"
))

# 2. Export enrichment table as a tidy tibble (pass .term = "<category>" and use rlang::inject for variables)
enr_tbl <- rlang::inject(export_analysis(enriched_data, !!rlang::parse_expr("knockdown/control"), .analysis = "enrichment", .term = "biological_process"))

# Inspect columns: term, annotation, score, p_value, adj_p_value
head(enr_tbl)

# Filter top significant pathways
sig_pathways <- enr_tbl %>%
  filter(!is.na(adj_p_value), adj_p_value <= 0.05) %>%
  arrange(adj_p_value)

# Save to disk
readr::write_csv(enr_tbl, "data/table_proteins_enrichment_knockdown-control.csv")
```
