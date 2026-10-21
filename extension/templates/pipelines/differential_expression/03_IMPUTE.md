### Phase 3: Missingness Assessment & Quantitative Imputation

Construct and execute `code/03_impute.R`, capturing full execution output to `logs/03_impute/console.log` (e.g. `mkdir -p logs/03_impute && Rscript code/03_impute.R 2>&1 | tee logs/03_impute/console.log`). You must strictly enforce all checkpoints below.

---

#### Phase 3.1: Missing Value Distribution & Mechanism Audit
- Load the normalized dataset from Phase 2:
  ```r
  norm_data <- readRDS("data/tidyproteomics_data.rds")
  ```
- Quantify missing values overall and per sample/condition:
  ```r
  cat("=== MISSING VALUE AUDIT ===\n")
  print(norm_data)
  summary(norm_data, "sample")
  ```
- **Scientific Imputation Strategy Assessment**:
  Evaluate the biological mechanism of missingness before applying an imputation function:
  1. **Missing Not At Random (MNAR) / Limit of Detection (LOD)**:
     - *Characteristics*: Feature is consistently detected in one condition but undetected in another (e.g. biological dropouts, clean knockouts, or condition-exclusive biomarkers).
     - *Pros of Left-Censored Minimum (`base::min`)*: Captures true biological dropouts and preserves large effect sizes for genuine biological absences.
     - *Cons of Left-Censored Minimum*: Artificially truncates the lower-tail variance if missingness is due to technical stochasticity.
     - *Recommended Code*:
       ```r
       imp_data <- norm_data %>%
         impute(.function = base::min, method = "column", group_by_sample = TRUE)
       ```
  2. **Missing At Random (MAR)**:
     - *Characteristics*: Missingness occurs sporadically across replicates at moderate-to-high feature abundances.
     - *Pros of Correlation / Neighbor Imputation*: Preserves replicate covariance structure.
     - *Cons*: May inappropriately infer signal for features that are biologically non-expressed.
  3. **No Imputation / Pairwise Deletion**:
     - *Pros*: Preserves empirical ground truth without synthetic data injection; `limma` natively handles missing values in linear modeling.
     - *Cons*: Cannot compute finite fold changes or $p$-values for features completely absent in one condition (they drop out of volcano plots).

#### Phase 3.2: Imputation Execution & Complete-Case / Pre-Imputed Safeguard
- Check for missingness and operations history, applying the appropriate imputation method based on experimental design:
  ```r
  # Check if missing values exist in the quantitative matrix or if imputation was pre-applied:
  ops <- operations(norm_data)
  already_imputed <- any(grepl("impute", ops))
  total_missing <- sum(is.na(as.data.frame(norm_data)$abundance_normalized %||% as.data.frame(norm_data)$abundance_raw))
  cat(sprintf("Total missing quantitative values: %d\n", total_missing))
  cat(sprintf("Pre-existing imputation in operations history: %s\n", already_imputed))

  if (already_imputed) {
    cat("Pre-existing imputation detected in tidyproteomics object history. Preserving upstream imputed values to prevent variance distortion.\n")
    imp_data <- norm_data
  } else if (total_missing == 0) {
    cat("Zero missing values detected (complete-case dataset / single TMT plex). Bypassing imputation to preserve empirical ground truth.\n")
    imp_data <- norm_data
  } else {
    # Standard default for biological dropouts / limit-of-detection missingness is within-condition left-censored minimum:
    cat("Applying within-condition left-censored minimum imputation for limit-of-detection dropouts...\n")
    imp_data <- norm_data %>%
      impute(.function = base::min, method = "column", group_by_sample = TRUE)
  }
  ```
- **Checkpoint 3.2**: Print `print(imp_data)` and inspect operations history via `operations(imp_data)` to confirm imputation status (or verified complete-case / pre-imputed pass-through) and confirm that residual missingness has been resolved.

#### Phase 3.3: Post-Imputation Distribution Verification
- Verify that the imputed dataset maintains valid dynamic range and variance structure across conditions.
- Confirm that no `NaN` or `Inf` values were introduced into quantitative matrices.

#### Phase 3.4: Object Persistence & Blackboard Recording
- Persist the imputed dataset to disk for downstream statistical modeling:
  ```r
  saveRDS(imp_data, file = "data/tidyproteomics_data.rds")
  ```
- Record the following directly into `docs/notes.md`:
  - Overall missingness percentage prior to imputation.
  - Condition-specific dropout patterns (e.g., features uniquely absent in one condition vs. another) or complete-case verification.
  - Chosen imputation method and scientific rationale (MAR vs. MNAR vs. complete-case bypass vs. verified pre-existing imputation).
  - Post-imputation data completeness confirmation.

#### Phase 3.5: Checkpoint Verification & State Recording
- [ ] **Checkpoint 3.5**:
  1. `logs/03_impute/console.log` (or `logs/03_impute.log`) exists on disk with non-zero file size.
  2. `data/tidyproteomics_data.rds` exists on disk with non-zero file size, and either operations log contains `impute`, zero missingness complete-case bypass is verified, or pre-imputed pass-through is confirmed.
  3. `docs/notes.md` contains the missingness audit and imputation strategy rationale.
- [ ] **Complete Phase**:
  - Invoke `complete_phase(phaseName = "03_IMPUTE", summary = "Missingness audit and imputation verification completed. Confirmed matrix completeness and dynamic range, and persisted data/tidyproteomics_data.rds.")`
