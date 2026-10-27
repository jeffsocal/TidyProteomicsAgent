---
tools: [tpa_health, tpa_load, tpa_inspect, tpa_summary, tpa_subset, tpa_reassign, tpa_rm_mbr, tpa_normalize, tpa_select_normalization, tpa_plot, tpa_operations, tpa_extract, tpa_export_state, tpa_collapse, tpa_merge, tpa_normalization_sensitivity]
---

### Phase 2: Contaminant Filtering & Multi-Method Normalization Benchmarking

Execute this phase using live `tpa_*` MCP tools in memory (or execute `code/02_normalize.R` if offline). All tool executions and outputs are automatically recorded to `logs/02_normalize/console.log`. Upon satisfying all normalization checkpoints, invoke `tpa_export_state` to generate `code/02_normalize.R` and save `data/tidyproteomics_data.rds`. You must strictly enforce all checkpoints below.

---

#### Phase 2.1: Contaminant & Confidence Filtering
- [ ] In-Memory State Continuity: The dataset is active in memory from Phase 1. If reloading is needed, call `tpa_load(source = "data/tidyproteomics_data.rds")`.
- [ ] Filter out sample contaminants and low-confidence identifications:
  - Use `tpa_subset(expression = "!description %like% 'CRAP|Trypsin'")` to remove contaminants.
  - If analyte is `proteins` and peptide accounting is present, retain high-confidence identifications using `tpa_subset(expression = "num_unique_peptides >= 2")`.
- [ ] **Checkpoint 2.1**: Run `tpa_inspect(what = "overview")` to confirm removed contaminant count and remaining high-confidence IDs in stdout and log.

#### Phase 2.2: Multi-Method Normalization Benchmarking & Pass-Through Audit
- [ ] Check if normalization has already been applied in upstream operations:
  - Run `tpa_operations()` and `tpa_inspect(what = "quants")`.
  - If normalization is already present, preserve upstream normalization to prevent double-scaling and variance distortion. Run `tpa_summary(what = "normalization")` to verify.
  - If unnormalized, benchmark multi-method normalization models:
    - Invoke `tpa_normalize(methods = ["median", "linear", "loess", "limma"])`.
    - Select optimal normalization candidate using `tpa_select_normalization()` (or pass `method = "<chosen_method>"`).
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

#### Phase 2.4: Object Persistence & Blackboard Recording
- [ ] Persist the normalized dataset and generate reproducible R script:
  - Invoke `tpa_export_state(rds_path = "data/tidyproteomics_data.rds", script_path = "code/02_normalize.R")`.
- [ ] Record the following directly into `docs/notes.md`:
  - Normalization method (e.g. `loess`, `limma`, `median`, or verified pre-existing model).
  - Replicate CV statistics demonstrating variance minimization or replicate concordance.
  - PCA clustering observations (e.g. replicate tightness, PC1/PC2 variance explained, and leading proteins driving PC separation).
  - Unsupervised heatmap clustering trends (if generated).

#### Phase 2.5: Checkpoint Verification & State Recording
- [ ] **Checkpoint 2.5**:
  1. `logs/02_normalize/console.log` exists on disk with non-zero file size.
  2. `data/tidyproteomics_data.rds` and `code/02_normalize.R` exist on disk with non-zero file size and contain normalized abundance layers.
  3. PCA score plot (`data/plot_*_pca_PC1PC2.png`) exists on disk with non-zero file size.
  4. If multiple quantitative layers exist, variation plot (`data/plot_*_normalizated_variation.png`) exists on disk (along with optional `data/plot_*_heatmap.png` if generated).
  5. `docs/notes.md` contains the normalization benchmark or verification summary.
- [ ] **Complete Phase**:
  - Invoke `complete_phase(phaseName = "02_NORMALIZE", summary = "Normalization benchmarking/verification completed. Confirmed normalized abundance state, verified replicate clustering on PCA (and sample heatmap if generated), generated diagnostic plots, and persisted data/tidyproteomics_data.rds.")`
