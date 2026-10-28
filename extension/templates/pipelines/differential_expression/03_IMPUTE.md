---
tools: [tpa_health, tpa_load, tpa_inspect, tpa_summary, tpa_impute, tpa_plot, tpa_operations, tpa_extract, tpa_export_state]
---

### Phase 3: Missingness Assessment & Quantitative Imputation

Execute this phase using live `tpa_*` MCP tools in memory (or execute `code/03_impute.R` if offline). All tool executions and outputs are automatically recorded to `logs/03_impute/console.log`. Upon satisfying all imputation checkpoints, invoke `tpa_export_state` to generate `code/03_impute.R` and save `data/tidyproteomics_data.rds`. You must strictly enforce all checkpoints below.

---

#### Phase 3.1: Missing Value Distribution & Mechanism Audit
- [ ] In-Memory State Continuity: The dataset is active in memory from Phase 2. If reloading is needed, call `tpa_load(source = "data/tidyproteomics_data.rds")`.
- [ ] Quantify missing values overall and per sample/condition:
  - Run `tpa_inspect(what = "overview")` and `tpa_summary(by = "sample")`.
  - ⚠️ **Imputation Slot Notice**: In tidyproteomics, the dataset summary may print `Imputed: Yes` as an artifact of internal accounting slot initialization. Always consult `tpa_operations()` as the single source of truth: if no imputation step is recorded in `tpa_operations()`, the dataset contains raw un-imputed missing values. Do NOT execute redundant exploratory extraction queries to verify missingness; proceed immediately with `tpa_impute()`.
- [ ] **Scientific Imputation Strategy Assessment**:
  Evaluate the biological mechanism of missingness before applying an imputation function:
  1. **Missing Not At Random (MNAR) / Limit of Detection (LOD)**:
     - *Characteristics*: Feature is consistently detected in one condition but undetected in another (e.g. biological dropouts, clean knockouts, or condition-exclusive biomarkers).
     - *Recommended Tool Call*: `tpa_impute(method = "base::min, group_by_sample = TRUE")` (within-condition left-censored minimum).
  2. **Missing At Random (MAR)**:
     - *Characteristics*: Missingness occurs sporadically across replicates at moderate-to-high feature abundances.
  3. **No Imputation / Complete-Case Bypass**:
     - *Characteristics*: Complete-case dataset (e.g. single TMT plex) or 0% missing values detected. Bypass imputation to preserve empirical ground truth.

#### Phase 3.2: Imputation Execution & Complete-Case / Pre-Imputed Safeguard
- [ ] Check for missingness and operations history using `tpa_operations()`:
  - If pre-existing imputation is detected in operations history: preserve upstream imputed values to prevent variance distortion.
  - If total missing is 0: bypass imputation to preserve empirical ground truth.
  - Otherwise: apply within-condition left-censored minimum imputation for limit-of-detection dropouts via `tpa_impute(method = "base::min, group_by_sample = TRUE")`.
- [ ] **Checkpoint 3.2**: Run `tpa_inspect(what = "overview")` to verify that imputation has executed successfully, auditing the number of imputed values and confirming that remaining missing values (if any) correspond to condition-exclusive biological dropouts (features absent across all replicates of a condition). *Note: In tidyproteomics, complete matrix coverage (0% missing) is NOT required when biological condition-exclusive dropouts are present; do NOT halt with fail_phase if residual condition-level dropouts remain.*

#### Phase 3.3: Post-Imputation Distribution & Detection-Rate Sensitivity Audit
- [ ] Verify that the imputed dataset maintains valid dynamic range and variance structure across conditions.
- [ ] Confirm that no `NaN` or `Inf` values were introduced into quantitative matrices.
- [ ] Audit detection and missingness using `tpa_plot(type = "missingness")` or `tpa_summary(by = "sample")`.
- [ ] If extracting quantitative abundances for distribution auditing via `tpa_extract`:
  - Set `values` to the specific normalization layer applied in Phase 2 (e.g. `tpa_extract(values = "loess")`, `"median"`, `"linear"`, `"limma"`, or `"raw"`).
  - *Note: In tidyproteomics, `values` must be the specific normalization method name, not `"normalized"`.*
  - **Directory Hygiene Requirement**: If supplying `save_csv`, always prefix the filepath with `data/` (e.g. `tpa_extract(values = "loess", na_rm = FALSE, save_csv = "data/03_loess_full_matrix.csv")`), NEVER saving CSV files to the project root directory.


#### Phase 3.4: Object Persistence & Blackboard Recording
- [ ] Persist the imputed dataset and generate reproducible R script:
  - Invoke `tpa_export_state(rds_path = "data/tidyproteomics_data.rds", script_path = "code/03_impute.R")`.
- [ ] Record the following directly into `docs/notes.md`:
  - Overall missingness percentage prior to imputation.
  - Condition-specific dropout patterns (e.g., features uniquely absent in one condition vs. another) or complete-case verification.
  - Chosen imputation method and scientific rationale (MAR vs. MNAR vs. complete-case bypass vs. verified pre-existing imputation).
  - Post-imputation data completeness or audited biological dropout confirmation.

#### Phase 3.5: Checkpoint Verification & State Recording
- [ ] **Checkpoint 3.5**:
  1. `logs/03_impute/console.log` exists on disk with non-zero file size.
  2. `data/tidyproteomics_data.rds` and `code/03_impute.R` exist on disk with non-zero file size, and operations history confirms `impute` (or verified complete-case bypass / pre-imputed pass-through).
  3. `docs/notes.md` contains the missingness audit and imputation strategy rationale.
- [ ] **Complete Phase**:
  - Invoke `complete_phase(phaseName = "03_IMPUTE", summary = "Missingness audit and imputation verification completed. Confirmed dynamic range and within-condition imputation, and persisted data/tidyproteomics_data.rds.")`
