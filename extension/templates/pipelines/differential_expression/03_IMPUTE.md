---
tools: [tpa_health, tpa_load, tpa_inspect, tpa_summary, tpa_impute, tpa_plot, tpa_operations, tpa_extract, tpa_export_state]
---

### Phase 3: Missingness Assessment & Quantitative Imputation

Execute this phase using live `tpa_*` MCP tools in memory (or execute `code/03_impute.R` if offline). All tool executions and outputs are automatically recorded to `logs/03_impute/console.log`. Upon satisfying all imputation checkpoints, invoke `tpa_export_state` to generate `code/03_impute.R` and save `data/tidyproteomics_data.rds`. You must strictly enforce all checkpoints below.

---

#### Phase 3.1: Missing Value Distribution, Mechanism Audit & Human-in-the-Loop Gate
- [ ] In-Memory State Continuity: The dataset is active in memory from Phase 2. If reloading is needed, call `tpa_load(source = "data/tidyproteomics_data.rds")`.
- [ ] Quantify missing values overall and per sample/condition:
  - Run `tpa_inspect(what = "overview")` and `tpa_summary(by = "sample")`.
  - ⚠️ **Imputation Slot Notice**: In tidyproteomics, the dataset summary may print `Imputed: Yes` as an artifact of internal accounting slot initialization. Always consult the operations history printed by `overview` (or `tpa_operations()`) as the single source of truth: if no `impute` step is recorded in operations history, the dataset contains raw un-imputed missing values. Do NOT execute redundant exploratory extraction queries to verify missingness.
- [ ] **Scientific Imputation Strategy Assessment (Karpievitch et al., *BMC Bioinformatics* 2012)**:
  Evaluate the biological mechanism of missingness from `docs/experiment.md` Section 2 and the sample missingness distribution:
  1. **Default — Random Forest Within Sample Groups (`randomforest_grouped` / MAR)**:
     - *Literature Rationale*: As demonstrated by Karpievitch, Dabney & Smith (*BMC Bioinformatics* 13 Suppl 16, S5, 2012), Random Forest imputation excels across general label-free LC-MS missingness (MAR), predicting sporadic replicate dropouts from observed replicate correlation structure without artificially collapsing variance or dragging partial observations down to the noise floor.
     - *When to Use*: Default choice for general physiological comparisons, clinical cohorts, and steady-state perturbations where missingness is primarily sporadic across replicates.
     - *Note on Condition-Exclusive Rows*: In `tidyproteomics`, `impute(impute.randomforest, method = 'matrix', group_by_sample = TRUE)` imputes partial replicate missingness within each condition while leaving 100%-missing condition-exclusive rows as `NA` so absent proteins are never falsely imputed with the condition mean.
     - *Recommended Tool Call*: `tpa_impute(method = "impute.randomforest, method = 'matrix', group_by_sample = TRUE")`.
  2. **Intentional Knockout, Gene Suppression, or Binary Switch Override — Column-Wise Minimum (`min_column` / MNAR)**:
     - *Literature Rationale*: Random Forest is not designed to extrapolate left-censored Missing Not At Random (MNAR) dropouts when a protein is completely absent across all replicates of a condition. When an experiment involves an **intentional gene knockout/knockdown (CRISPR KO, siRNA, shRNA, degrader/PROTAC), targeted suppression of a gene or pathway, affinity pull-down (IP-MS), or strong binary on/off induction**, column-wise minimum imputation (`method = 'column'`) is unbiased with respect to condition labels and fills every missing value—including 100% condition-exclusive dropouts—with that MS replicate's empirical Limit of Detection (LOD), retaining condition-exclusive proteins in `limma` differential expression modeling.
     - *Recommended Tool Call*: `tpa_impute(method = "base::min, method = 'column'")`.
  3. **No Imputation / Complete-Case Bypass (`none`)**:
     - *Characteristics*: Complete-case dataset (e.g. single TMT plex), 0% missing values detected, or pre-existing imputation already recorded in operations history. Bypass imputation to preserve empirical ground truth.
- [ ] **Human-in-the-Loop Imputation Confirmation Gate (`docs/experiment.md` Section 3.E)**:
  - If pre-existing imputation is detected in `overview` operations history OR total missingness is `0%`, proceed autonomously (pass-through / bypass) without halting.
  - Otherwise, inspect Section 3.E (`### E. Missing Value Imputation Strategy`) in `docs/experiment.md`:
    - If Section 3.E is missing, unconfigured, or has `- **Confirm Imputation Strategy**: FALSE`:
      1. Ensure Section 3.E in `docs/experiment.md` is populated with your recommended `- **Imputation Method**: <randomforest_grouped|min_column>` and a concise markdown comment `<!-- Agent Imputation Rationale: ... -->` explaining whether the experiment is general MAR profiling (`randomforest_grouped` default) or an intentional knockout/suppression/MNAR switch design (`min_column`).
      2. Halt execution cleanly via `fail_phase` to engage human-in-the-loop confirmation:
         ```
         fail_phase(
           phaseName = "03_IMPUTE",
           reason = "Pre-flight Imputation Gate: Human-in-the-loop confirmation required for Missing Value Imputation Strategy in Section 3.E of docs/experiment.md.",
           actionableInsights = "ACTION REQUIRED: Review the recommended Imputation Method ('randomforest_grouped' default vs 'min_column' for knockouts/MNAR) in Section 3.E of docs/experiment.md and click '🎯 Confirm Imputation & Proceed' in the sidebar or Live Agent to confirm and resume Phase 3."
         )
         ```
      3. Do NOT execute `tpa_impute` until `- **Confirm Imputation Strategy**: TRUE` is confirmed by the researcher.

#### Phase 3.2: Imputation Execution & Complete-Case / Pre-Imputed Safeguard
- [ ] Once confirmed (or when bypassing due to 0% missing / pre-imputed state), execute the selected strategy:
  - If pre-existing imputation is detected in operations history: preserve upstream imputed values to prevent variance distortion.
  - If total missing is 0 or `- **Imputation Method**: none`: bypass imputation to preserve empirical ground truth.
  - If `- **Imputation Method**: randomforest_grouped` (default): apply within-condition Random Forest matrix imputation via `tpa_impute(method = "impute.randomforest, method = 'matrix', group_by_sample = TRUE")`.
  - If `- **Imputation Method**: min_column`: apply unbiased column-wise minimum LOD imputation via `tpa_impute(method = "base::min, method = 'column'")`.
  - If `- **Imputation Method**: min_row_grouped`: apply within-condition row minimum imputation via `tpa_impute(method = "base::min, method = 'row', group_by_sample = TRUE")`.
- [ ] **Checkpoint 3.2**: Run `tpa_inspect(what = "overview")` to verify that imputation has executed successfully, auditing the number of imputed values. *Note: When `randomforest_grouped` or `min_row_grouped` is used, residual missing values correspond to condition-exclusive biological dropouts (features absent across all replicates of a condition) and do NOT require 0% missingness; when `min_column` is used, all missing values (including condition-exclusive dropouts) are imputed at each replicate's column LOD.*

#### Phase 3.3: Post-Imputation Distribution & Detection-Rate Sensitivity Audit
- [ ] Verify from `overview` that the imputed dataset maintains valid dynamic range and variance structure across conditions (optionally generating `tpa_plot(type = "missingness")` if visual missingness auditing is needed).
- [ ] If extracting quantitative abundances for distribution auditing via `tpa_extract`:
  - Set `values` to the specific normalization layer applied in Phase 2 (e.g. `tpa_extract(values = "loess")`, `"median"`, `"linear"`, `"limma"`, or `"raw"`).
  - *Note: In tidyproteomics, `values` must be the specific normalization method name, not `"normalized"`.*
  - **Directory Hygiene Requirement**: If supplying `save_csv`, always prefix the filepath with `data/` (e.g. `tpa_extract(values = "loess", na_rm = FALSE, save_csv = "data/03_loess_full_matrix.csv")`), NEVER saving CSV files to the project root directory.

#### Phase 3.4: Object Persistence & Checkpoint Verification
- [ ] Persist the imputed dataset and generate reproducible R script:
  - Invoke `tpa_export_state(rds_path = "data/tidyproteomics_data.rds", script_path = "code/03_impute.R")`.
- [ ] **Checkpoint 3.4**:
  1. `logs/03_impute/console.log` exists on disk with non-zero file size.
  2. `data/tidyproteomics_data.rds` and `code/03_impute.R` exist on disk with non-zero file size, and operations history confirms `impute` (or verified complete-case bypass / pre-imputed pass-through).
- [ ] **Complete Phase (Automated Blackboard Recording)**:
  - Do NOT manually edit `docs/notes.md` via file tools; the orchestrator automatically records your `complete_phase` summary into `docs/notes.md`.
  - Invoke `complete_phase` with a comprehensive summary including pre-imputation missingness percentage, confirmed imputation method and rationale (`impute.randomforest` MAR default vs. `base::min` column LOD for knockouts/MNAR vs. complete-case bypass per Karpievitch et al. 2012), and post-imputation completeness / residual condition-exclusive dropout counts:
    `complete_phase(phaseName = "03_IMPUTE", summary = "Missingness audit (<pre_missing>% pre-imputation missing) and confirmed imputation (<selected_imputation_method>) completed. Confirmed post-imputation dynamic range (<post_missing>% residual missing) and persisted data/tidyproteomics_data.rds.")`
