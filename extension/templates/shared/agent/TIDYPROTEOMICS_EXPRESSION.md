---
name: TIDYPROTEOMICS_EXPRESSION
description: Two-sample differential expression analysis, batch pairwise contrasts, automated volcano and expression visualizations, and statistical table exports.
---

# tidyproteomics: Differential Expression Analysis

This skill module covers two-sample statistical testing, batch contrast matrices, automated volcano plot generation, expression profiling, and exporting differential expression tables.

---

## 1. Two-Sample Differential Expression Testing

### Contrast Syntax & Methods
Statistical comparisons are declared using unquoted ratio notation `treatment/control`:
```r
library(tidyproteomics)
library(dplyr)

imp_data <- readRDS("data/tidyproteomics_data.rds")

# Two-sample differential expression using empirical Bayes linear modeling (limma)
stat_data <- imp_data %>%
  expression(knockdown/control, .method = "limma")
```

- **Ratio Convention**: In `expression(A/B)`, `A` is the numerator (treatment) and `B` is the denominator (control). The resulting `log2_foldchange` equals $\log_2(\text{abundance}_A) - \log_2(\text{abundance}_B)$. Positive values indicate higher abundance in `A`.
- **Supported Methods**:
  - `".method = 'limma'"` (Default & Recommended): Moderated t-test borrowing variance across all proteins via empirical Bayes. Handles low replicate numbers ($n \ge 3$) robustly.
  - `".method = 't.test'"`: Standard Welch's two-sample t-test.
  - `".method = 'wilcoxon'"`: Non-parametric rank-sum test.

---

## 2. Batch Automating Architecture (`automating.Rmd`)

For multi-group experiments, timepoints, or multi-arm screens, do not write manual `for` loops. Use the native batch automation framework:

```r
# 1. Define contrast pairs
pairs <- list(
  c("dose_high", "vehicle"),
  c("dose_low", "vehicle"),
  c("dose_high", "dose_low")
)

# 2. Execute batch differential testing across all pairs
stat_data <- imp_data %>%
  expression(.pairs = pairs, .method = "limma")

# 3. Automatically generate styled volcano plots and CSV tables for all pairs directly to disk
stat_data %>%
  analyze_expressions(
    labels_column = "gene_name",   # or "protein" if gene names are absent
    log2fc_min = 1.0,              # |log2FC| >= 1.0
    significance_max = 0.05        # Adjusted p-value (FDR) <= 0.05
  )
```

Auto-generated files written directly to disk:
- `table_proteins_expression_<contrast>.csv`: Full statistical result tables including fold change, $p$-values, and FDR.
- `plot_volcano.png`: Styled volcano plots with secondary linear fold-change axes and labeled significance thresholds.

---

## 3. Targeted Visualizations

All visualization functions save images directly to disk when `destination = "png"` is specified. Always wrap in `invisible(...)` or assign:

```r
# 1. Volcano plot for a specific contrast
invisible(stat_data %>% plot_volcano(
  knockdown/control,
  destination = "png",
  log2fc_min = 1.0,
  significance_max = 0.05
))

# 2. Expression profiles for top altered candidates (bar/boxplots across replicates)
invisible(stat_data %>% plot_expression(
  knockdown/control,
  destination = "png"
))

# 3. Comparative expression plot (scatter plot of fold changes between two contrasts)
invisible(stat_data %>% plot_compexp(
  c("knockdown", "control"),
  c("rescue", "control"),
  destination = "png"
))
```

---

## 4. Exporting Analysis Tables

Extract tidy data frames of differential expression statistics for downstream filtering and inspection:

```r
# Export expression analysis results as a tibble
exp_tbl <- export_analysis(stat_data, "knockdown/control", .analysis = "expression")

# Inspect columns: log2_foldchange, p_value, adj_p_value, protein, gene_name
head(exp_tbl)

# Filter significant biomarkers
sig_up <- exp_tbl %>%
  filter(!is.na(adj_p_value), adj_p_value <= 0.05, log2_foldchange >= 1.0) %>%
  arrange(desc(log2_foldchange))

sig_down <- exp_tbl %>%
  filter(!is.na(adj_p_value), adj_p_value <= 0.05, log2_foldchange <= -1.0) %>%
  arrange(log2_foldchange)

# Save to disk
readr::write_csv(exp_tbl, "data/table_proteins_expression_knockdown-control.csv")
```
