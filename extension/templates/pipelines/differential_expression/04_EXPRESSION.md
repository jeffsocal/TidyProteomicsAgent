---
tools: [tpa_health, tpa_load, tpa_inspect, tpa_summary, tpa_reassign, tpa_expression, tpa_plot, tpa_export_table, tpa_operations, tpa_extract, tpa_export_state]
---

### Phase 4: Differential Expression Analysis & Candidate Profiling

Execute this phase using live `tpa_*` MCP tools in memory (or execute `code/04_expression.R` if offline). All tool executions and outputs are automatically recorded to `logs/04_expression/console.log`. Upon satisfying all expression checkpoints, invoke `tpa_export_state` to generate `code/04_expression.R` and save `data/tidyproteomics_data.rds`. You must strictly enforce all checkpoints below.

---

#### Phase 4.1: Contrast Formulation, Sample Recoding & Group Verification
- [ ] In-Memory State Continuity: The dataset is active in memory from Phase 3. If reloading is needed, call `tpa_load(source = "data/tidyproteomics_data.rds")`.
- [ ] **Verify / Apply Sample Group Renaming & Pooling Map (`docs/experiment.md` Section 3)**:
  - Check the Executive Blackboard above (`Active Sample Groups`): if sample groups were already recoded into clean biological cohorts in Phase 2.1b, proceed directly to the Pre-flight Gate without making redundant `tpa_inspect(what = "sample_names")` or `tpa_reassign` calls.
  - Only if sample groups have not yet been recoded and Section 3.B has `- **Reassign Sample Names According to Pooling Map**: TRUE`:
    - Apply sample renaming in batch using `tpa_reassign(mapping = { "raw_sample_1": "clean_sample_1", ... })` or regex (e.g. `tpa_reassign(condition = "sample %like% 'surfactin'", replace = "surfactin")`).
    - Run `tpa_inspect(what = "sample_names")` to verify that active sample groups reflect the cleaned biological conditions.
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
  - *(Note: Full programmatic classification of `candidate_reliability`, `imputation_bias`, `imputation_delta`, and exact `feature_retention` accounting across all rows will be executed automatically by `code/06_observations.R` and `code/10_figures.R`. Do NOT dump the entire expression table into LLM context via `tpa_extract` just to count rows manually).*
- [ ] Generate publication-grade Volcano Plot:
  - Generate volcano plot using `tpa_plot(type = "volcano", contrast = "<treatment>/<control>")` (automatically saved to `data/`).


#### Phase 4.4: Object Persistence & Checkpoint Verification
- [ ] Persist the modeled dataset and generate reproducible R script:
  - Invoke `tpa_export_state(rds_path = "data/tidyproteomics_data.rds", script_path = "code/04_expression.R")`.
- [ ] **Checkpoint 4.4**:
  1. `logs/04_expression/console.log` exists on disk with non-zero file size.
  2. `data/tidyproteomics_data.rds` and `code/04_expression.R` exist on disk with non-zero file size.
  3. `data/table_*_expression_*.tsv` (or `.csv`) exists on disk with non-zero file size.
  4. Volcano plot (`data/plot_*_volcano_*.png`) exists in `data/` with non-zero file size.
- [ ] **Complete Phase (Automated Blackboard Recording)**:
  - Do NOT manually edit `docs/notes.md` via file tools; the orchestrator automatically records your `complete_phase` summary into `docs/notes.md`.
  - Invoke `complete_phase` with a comprehensive summary including the statistical testing method (`limma`), evaluated contrast(s), significant DE counts ($|\log_2\text{FC}| \ge 1.0, q \le 0.05$, broken down into upregulated and downregulated), and leading regulated candidates:
    `complete_phase(phaseName = "04_EXPRESSION", summary = "Differential expression analysis (<contrast>) completed via limma (<N_sig> significant proteins: <N_up> upregulated, <N_down> downregulated at |log2FC| >= 1, q <= 0.05). Exported expression tables and volcano plot, and persisted data/tidyproteomics_data.rds.")`
