---
tools: [tpa_health, tpa_load, tpa_inspect, tpa_summary, tpa_subset, tpa_reassign, tpa_expression, tpa_batch_analysis, tpa_plot, tpa_export_table, tpa_operations, tpa_extract, tpa_export_state, tpa_normalization_sensitivity]
---

### Phase 4: Differential Expression Analysis & Candidate Profiling

Execute this phase using live `tpa_*` MCP tools in memory (or execute `code/04_expression.R` if offline). All tool executions and outputs are automatically recorded to `logs/04_expression/console.log`. Upon satisfying all expression checkpoints, invoke `tpa_export_state` to generate `code/04_expression.R` and save `data/tidyproteomics_data.rds`. You must strictly enforce all checkpoints below.

---

#### Phase 4.1: Contrast Formulation, Sample Recoding & Group Verification
- [ ] In-Memory State Continuity: The dataset is active in memory from Phase 3. If reloading is needed, call `tpa_load(source = "data/tidyproteomics_data.rds")`.
- [ ] Inspect raw sample groups in data using `tpa_inspect(what = "sample_names")`.
- [ ] **Parse Sample Group Renaming & Pooling Map (`docs/experiment.md` Section 3)**:
  - If Section 3.B contains a confirmed **Sample Group Renaming & Pooling Map** table proposing clean biological names (e.g. pooling `active_necrotic granuloma_batch5`, `batch6`, `batch9` -> `active necrotic granuloma`, and `healthy_healthy_batch8` -> `healthy`) and `- **Reassign Sample Names According to Pooling Map**: TRUE`:
    - Apply sample renaming in memory using `tpa_reassign(mapping = { "raw_sample_1": "clean_sample_1", ... })`.
    - Run `tpa_inspect(what = "sample_names")` to verify that the active sample groups now reflect the cleaned biological conditions.
- [ ] **Pre-flight Gate & Contrast Confirmation**:
  - Review Section 3.C (`Target Contrasts`) and Section 3.D (`Pre-Flight Gate Decision`) in `docs/experiment.md`.
  - **Evaluation & Confirmation Criteria**:
    - If Section 3.C lists target contrast(s) whose treatment and control match the active sample groups and the stated Section 2 hypothesis:
      - If NO batch confounding exists (single batch, or no batch metadata/imbalance), accept the contrast as confirmed and proceed without halting.
      - If batch confounding is detected between treatment and control cohorts, proceed ONLY if Section 3.D is authorized (`Proceed With Potential Batch Confounding: TRUE` or `Authorize Unadjusted Exploratory Comparison: TRUE`).
    - If target contrasts cannot be determined from Section 3.C / Section 2 hypothesis, or if batch confounding is detected and Section 3.D has NOT been authorized (`FALSE`):
      1. Scaffold Section 3 in `docs/experiment.md` with suggested contrast pairs and clean visual badges if not already present.
      2. Halt execution cleanly via `fail_phase`:
         ```
         fail_phase(
           phaseName = "04_EXPRESSION", 
           reason = "Pre-flight Gate: Batch confounding detected between treatment and control cohorts or contrast confirmation required.",
           actionableInsights = "ACTION REQUIRED: Click '🎯 Confirm Contrast & Proceed' in the sidebar or Live Agent to confirm the target contrast in Section 3.C and authorize batch confounding in Section 3.D simultaneously."
         )
         ```
      3. Do NOT proceed to calculate linear models until Section 3 has been confirmed by the user.

#### Phase 4.2: Repeated Measures, Paired Modeling & Empirical Bayes Differential Expression
- [ ] **Differential Expression Calculation**:
  - Run empirical Bayes moderated $t$-statistics using `tpa_expression(test = "limma", contrast = ["<treatment_group>", "<control_group>"])`.
  - Multiple target contrast pairs may be evaluated sequentially if requested in Section 3.C.
- [ ] **Checkpoint 4.2**: Confirm that `tpa_operations()` records the completed expression analysis.

#### Phase 4.3: Quantitative Significance & Candidate Extraction
- [ ] Export differential expression analysis tables:
  - Invoke `tpa_export_table(type = "analysis", analysis = "expression", comparison = "<contrast>", file_name = "data/table_proteins_expression_<contrast>.tsv")`.
- [ ] **Candidate Reliability Classification & Bias Auditing**:
  - Interrogate exported results using `tpa_extract(what = "expression")`.
  - Classify top candidate biomarkers into reliability tiers:
    1. `ROBUST_QUANTITATIVE`: Detected across replicates in both conditions ($q \le 0.05, |\log_2\text{FC}| \ge 1.0$), low imputation reliance.
    2. `DETECTION_LIMITED_ON_OFF`: Substantial missingness in one group imputed at limit-of-detection minimum. Highly biologically informative (clean presence/absence), but effect size is lower-bounded by detection limit.
    3. `HIGH_UNCERTAINTY`: High variance or low replicate support.
- [ ] Generate publication-grade Volcano Plot:
  - Generate volcano plot using `tpa_plot(type = "volcano", contrast = "<treatment>/<control>")` (automatically saved to `data/`).

#### Phase 4.4: Object Persistence & Blackboard Recording
- [ ] Persist the modeled dataset and generate reproducible R script:
  - Invoke `tpa_export_state(rds_path = "data/tidyproteomics_data.rds", script_path = "code/04_expression.R")`.
- [ ] Record the following directly into `docs/notes.md`:
  - Statistical testing method (`limma` empirical Bayes moderated $t$-test).
  - Target contrast pairs evaluated.
  - Number of significantly regulated proteins ($|\log_2\text{FC}| \ge 1.0, q \le 0.05$), broken down by upregulated and downregulated.
  - Top upregulated and downregulated candidates with gene symbols, $\log_2\text{FC}$, and $q$-values.
  - Candidate reliability tier summary (robust quantitative vs limit-of-detection on/off).

#### Phase 4.5: Checkpoint Verification & State Recording
- [ ] **Checkpoint 4.5**:
  1. `logs/04_expression/console.log` exists on disk with non-zero file size.
  2. `data/tidyproteomics_data.rds` and `code/04_expression.R` exist on disk with non-zero file size.
  3. `data/table_*_expression_*.tsv` (or `.csv`) exists on disk with non-zero file size.
  4. Volcano plot (`data/plot_*_volcano_*.png`) exists in `data/` with non-zero file size.
  5. `docs/notes.md` contains the differential expression summary and candidate table.
- [ ] **Complete Phase**:
  - Invoke `complete_phase(phaseName = "04_EXPRESSION", summary = "Differential expression analysis completed. Computed moderated t-statistics via limma, exported expression tables and volcano plots, verified candidate reliability tiers, and persisted data/tidyproteomics_data.rds.")`
