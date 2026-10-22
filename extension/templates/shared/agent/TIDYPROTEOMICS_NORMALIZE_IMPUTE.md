---
name: TIDYPROTEOMICS_NORMALIZE_IMPUTE
description: Contaminant filtering, multi-method normalization benchmarking, quantitative variation audits, and missing value evaluation and imputation.
---

# tidyproteomics: Normalization & Missing Value Imputation

This skill module covers contaminant filtering, benchmarking multiple normalization algorithms, evaluating replicate CV reduction, and imputing missing quantitative values.

---

## 1. Contaminant & Confidence Filtering

Filter common contaminants and retain high-confidence protein identifications before quantitative transformations:

```r
library(tidyproteomics)
library(dplyr)

data <- readRDS("data/tidyproteomics_data.rds")

# 1. Remove common mass spectrometry contaminants using %like%
if ("description" %in% get_annotation_terms(data, format = "vector")) {
  data_filtered <- data %>% subset(!description %like% "CRAP|Trypsin|Keratin")
} else {
  data_filtered <- data
}

# 2. Retain high-confidence proteins (at least 2 unique peptides if accounting exists)
accounting_terms <- get_accountings(data_filtered, format = "vector")
if ("num_unique_peptides" %in% accounting_terms) {
  data_filtered <- data_filtered %>% subset(num_unique_peptides >= 2)
}

# Print filtered summary to verify removed count
print(data_filtered)
```

---

## 2. Multi-Method Normalization Benchmarking

### Benchmarking Multiple Candidate Methods
`tidyproteomics` can compute multiple candidate normalizations concurrently in a single operation:
```r
norm_candidates <- data_filtered %>%
  normalize(.method = c("median", "linear", "loess", "limma"))
```

Available normalization methods:
- `"median"`: Global median centering (preserves shape, adjusts for total load).
- `"linear"`: Linear regression alignment against reference.
- `"loess"`: Local non-linear regression (corrects non-linear intensity-dependent bias).
- `"limma"`: Cyclic loess normalization adapted from `limma`.
- `"randomforest"`: Non-parametric imputation/normalization tree model.

### Automatic Selection of the Optimal Model
`select_normalization()` chooses the optimal normalization based on objective quantitative criteria (minimizing replicate coefficient of variation and maximizing PCA group concordance):
```r
norm_data <- norm_candidates %>% select_normalization()

# Verify the active quantitative layer in print()
print(norm_data)
```

---

## 3. Normalization Quality Audits & Diagnostic Visualizations

### Normalization Metric Summary
```r
summary(norm_data, "normalization")
```
This prints a comparative table showing total IDs, quantifiable fraction, median replicate CV (variance reduction), and variance explained by PC1 and PC2 across all tested methods relative to raw data.

### Diagnostic Benchmarking Plots
```r
# Replicate CV reduction plot comparing all candidate normalizations
if (length(get_quant_names(norm_data, format = "vector")) > 1) {
  invisible(norm_data %>% plot_variation_cv(destination = "png"))
}

# Unsupervised multivariate PCA to evaluate replicate clustering and condition separation
invisible(norm_data %>% plot_pca(destination = "png"))

# Sample correlation heatmap
invisible(norm_data %>% plot_heatmap(destination = "png"))
```

---

## 4. Missing Value Distribution & Quantitative Imputation

### Assessing Missingness Mechanisms
Before applying an imputation function, evaluate the biological and technical mechanism of missingness:
1. **Missing Not At Random (MNAR) / Limit of Detection (LOD)**:
   - *Characteristics*: Protein is consistently detected in one condition but undetected in another (e.g., biological dropout upon gene knockout or drug inhibition).
   - *Recommended Approach*: Left-censored minimum imputation within sample condition.
2. **Missing Completely At Random (MCAR)**:
   - *Characteristics*: Stochastic missingness uniformly distributed across all replicates and conditions.
   - *Recommended Approach*: Random forest (`randomforest`) or k-nearest neighbors (`impute_knn`).

### Imputation Execution & Complete-Case Safeguard
```r
# Extract abundance column to check missing count
long_df <- as.data.frame(norm_data)
active_quant <- intersect(c("abundance_normalized", "abundance_raw", "abundance"), colnames(long_df))[1]
total_missing <- sum(is.na(long_df[[active_quant]]))

cat(sprintf("Total missing quantitative values: %d\n", total_missing))

if (total_missing == 0) {
  cat("Zero missing values detected (complete-case dataset / single TMT plex). Bypassing imputation to preserve empirical ground truth.\n")
  imp_data <- norm_data
} else {
  cat("Applying within-condition left-censored minimum imputation for limit-of-detection dropouts...\n")
  imp_data <- norm_data %>%
    impute(.function = base::min, method = "column", group_by_sample = TRUE)
}

# Verify that imputed values were recorded in operations history
print(imp_data)
operations(imp_data)
```

### Post-Imputation Integrity Verification
- Confirm that no `NaN` or `Inf` values were introduced.
- Verify that finite positive abundances span a valid dynamic range across conditions.
