---
tools: [tpa_health, tpa_load, tpa_inspect, tpa_summary, tpa_subset, tpa_reassign, tpa_normalize, tpa_select_normalization, tpa_plot, tpa_operations, tpa_export_state, tpa_normalization_sensitivity]
---

### Phase 2: Contaminant Filtering & Multi-Method Normalization Benchmarking

Execute this phase using live `tpa_*` MCP tools in memory (or execute `code/02_normalize.R` if offline). All tool executions and outputs are automatically recorded to `logs/02_normalize/console.log`. Upon satisfying all normalization checkpoints, invoke `tpa_export_state` to generate `code/02_normalize.R` and save `data/tidyproteomics_data.rds`. You must strictly enforce all checkpoints below.

---

#### Phase 2.1: Contaminant & Confidence Filtering
- [ ] In-Memory State Continuity: The dataset is active in memory from Phase 1. If reloading is needed, call `tpa_load(source = "data/tidyproteomics_data.rds")`.
- [ ] Filter out sample contaminants and low-confidence identifications:
  - Use `tpa_subset(expression = "!protein %like% 'CON__|REV__' & !description %like% 'CRAP|Trypsin'")` to remove search contaminants, decoys, and proteolysis reagents.
  - If analyte is `proteins` and peptide accounting is present, retain high-confidence identifications using `tpa_subset(expression = "num_unique_peptides >= 2")`.
- [ ] **Checkpoint 2.1**: Run `tpa_inspect(what = "overview")` to confirm removed contaminant count and remaining high-confidence IDs in stdout and log.

#### Phase 2.1b: Sample Grouping & Biological Condition Recoding
- [ ] Inspect Section 3.B (`Sample Group Renaming & Pooling Map`) in `docs/experiment.md`:
  - If `- **Reassign Sample Names According to Pooling Map**: TRUE` and a non-empty, unambiguous mapping table exists whose target groups match the biological conditions in Section 2:
    - Apply sample reassignment using `tpa_reassign(mapping = { "raw_sample_1": "clean_group_1", ... })` or regex (e.g. `tpa_reassign(condition = "sample %like% 'surfactin'", replace = "surfactin")`) before normalization benchmarking and variation analysis.
    - Run `tpa_inspect(what = "overview")` to confirm that samples are now assigned to biological condition cohorts with biological replicates ($n \ge 2$) and that no sample group was accidentally collapsed into a single cohort.
    - Generate (or update) condition-level feature overlap plot using `tpa_plot(type = "venn")` (or `tpa_plot(type = "euler")`) so `data/plot_*_venn.png` reflects cleaned biological cohorts and contaminant-filtered proteins.
  - *Why this is critical before normalization*: Grouping technical replicates into biological conditions ensures:
    1. `plot_variation_cv()` computes true replicate coefficient of variation across biological replicates rather than returning NA or single-sample metrics.
    2. `plot_pca()` clusters and colors samples by biological condition rather than disparate raw file names.
    3. Downstream condition-specific imputation (`group_by_sample = TRUE`) has properly populated sample groups.

#### Phase 2.2: Multi-Method Normalization Benchmarking & Pass-Through Audit
- [ ] Check if normalization has already been applied in upstream operations (using the operations history already printed by `tpa_inspect(what = "overview")` above — do NOT make redundant `tpa_operations()` or `tpa_inspect(what = "quants")` calls):
  - If normalization is already present, preserve upstream normalization to prevent double-scaling and variance distortion. Run `tpa_summary(what = "normalization")` to verify.
  - If unnormalized, benchmark multi-method normalization models:
    - Invoke `tpa_normalize(methods = ["median", "linear", "loess", "limma"])`.
    - Select optimal normalization candidate using `tpa_select_normalization()` (or pass `method = "<chosen_method>"`). If top candidate methods show near-tied replicate CV and PC1 separation, optionally invoke `tpa_normalization_sensitivity(comparison = "<treatment>/<control>")` to audit ranking concordance across normalization layers.
    - Run `tpa_summary(what = "normalization")`.
- [ ] **Checkpoint 2.2**: Verify that normalized abundances are confirmed in stdout and log (displaying CV and PC1 metrics for benchmarked candidates or confirming pre-existing normalized state).

#### Phase 2.3: Quantitative Variation Benchmarking & CV Reduction Verification
- [ ] Benchmark quantitative variation across normalization candidates:
  - Generate CV variation plot using `tpa_plot(type = "variation_cv")` (if multiple quantitative layers exist, automatically saved to `data/`).
  - Generate PCA scores plot using `tpa_plot(type = "pca")` (automatically saved to `data/`).
  - Optionally generate unsupervised sample clustering heatmap using `tpa_plot(type = "heatmap")`.
- [ ] **Variation & Clustering Audit Check**:
  - Inspect summary output to confirm that the normalization method successfully minimized quantitative CV across replicates relative to raw abundance.
  - Confirm replicate clustering and condition separation in PCA scores.
  - Interrogate top PCA loadings (identifying key proteins driving separation along PC1 and PC2) and global sample distance trends from the heatmap.

#### Phase 2.4: Object Persistence & Checkpoint Verification
- [ ] Persist the normalized dataset and generate reproducible R script:
  - Invoke `tpa_export_state(rds_path = "data/tidyproteomics_data.rds", script_path = "code/02_normalize.R")`.
- [ ] **Checkpoint 2.4**:
  1. `logs/02_normalize/console.log` exists on disk with non-zero file size.
  2. `data/tidyproteomics_data.rds` and `code/02_normalize.R` exist on disk with non-zero file size and contain normalized abundance layers.
  3. PCA score plot (`data/plot_*_pca_PC1PC2.png`) exists on disk with non-zero file size.
  4. If multiple quantitative layers exist, variation plot (`data/plot_*_normalizated_variation.png`) exists on disk (along with optional `data/plot_*_heatmap.png` if generated).
- [ ] **Complete Phase (Automated Blackboard Recording)**:
  - Do NOT manually edit `docs/notes.md` via file tools; the orchestrator automatically records your `complete_phase` summary into `docs/notes.md`.
  - Invoke `complete_phase` with a comprehensive summary including the selected normalization method (e.g., `loess`, `limma`, `median`), replicate CV statistics demonstrating variance minimization, and PCA clustering observations (PC1/PC2 variance explained and replicate tightness):
    `complete_phase(phaseName = "02_NORMALIZE", summary = "Normalization benchmarking/verification completed (<selected_method> selected; <N> high-confidence proteins retained). Confirmed replicate CV reduction (<raw_cv>% -> <norm_cv>%), verified replicate clustering on PCA (PC1 <X>%, PC2 <Y>%), generated diagnostic plots, and persisted data/tidyproteomics_data.rds.")`
