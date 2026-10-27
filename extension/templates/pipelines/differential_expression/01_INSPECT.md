---
tools: [tpa_health, tpa_load, tpa_inspect, tpa_summary, tpa_plot, tpa_operations, tpa_extract, tpa_export_state, tpa_set_workspace, tpa_collapse, tpa_merge, tpa_protein_map, tpa_export_sdrf]
---

### Phase 1: Data Ingestion & Exploratory Quality Inspection

Execute this phase using live `tpa_*` MCP tools in memory (or execute `code/01_inspect.R` if offline). All tool executions and outputs are automatically recorded to `logs/01_inspect/console.log`. Upon satisfying all exploratory checkpoints, invoke `tpa_export_state` to generate `code/01_inspect.R` and save `data/tidyproteomics_data.rds`. You must strictly enforce all checkpoints below.

---

> [!TIP]
> **Consolidated Inspection Workflow (Fast-Path)**:
> Ingest data with `tpa_load` and immediately run `tpa_inspect(what = "overview")`.
> In tidyproteomics, `overview` returns the complete dataset topology in a single call: file count, sample group names, total protein counts, dynamic range, percent missingness, operations history (normalization/imputation status), and all functional annotation terms.
> **DO NOT** make redundant exploratory calls for `operations`, `quant_names`, `sample_names`, or `annotation_terms` — `overview` already supplies all of them.

#### Phase 1.1: Data Ingestion & Consolidated Overview Discovery
- [ ] Ingest the quantitative dataset using `tpa_load`:
  - Provide `source = "{{PATH_TO_DATA_FILE}}"`, `platform = "{{PLATFORM}}"`, and `analyte = "{{ANALYTE}}"` substituting actual values from `docs/experiment.md`.
  - If `source` is a remote URL (starts with `http://` or `https://`), `tpa_load` automatically stages the file to `data/raw/` and imports it.
  - If `source` is an `.rds` file (or `platform` is `"tidyproteomics"` / `"rds"`), `tpa_load` ingests the pre-processed R data object directly into memory.
- [ ] **Consolidated Topology & Operations Discovery**:
  - Run `tpa_inspect(what = "overview")` to verify core object state in stdout and log.
  - Extract all essential topology metrics directly from the `overview` printout:
    - Origin platform and analyte.
    - Composition: raw file count and sample groups (`ctl`, `treatment`, etc.).
    - Quantitation: protein/peptide counts, dynamic range, and percent missingness.
    - Upstream operations: detected normalization (`*normalized`) and imputation (`*imputed`) status.
    - Functional annotations: all active ontology categories.
  - *(Note: Running `overview` fulfills operations audit, quant names, sample group discovery, and annotation terms simultaneously. Do NOT run separate single-property calls).*
- [ ] **Checkpoint 1.1**: Verify that `overview` prints the complete quantitative data object topology to stdout.

#### Phase 1.2: Sample Quality, Replicate QC & Overlap Profiling
- [ ] Profile sample preparation contaminants using `tpa_summary(what = "contamination")`.
- [ ] Run sample-level quality metrics using `tpa_summary(what = "sample")`.
- [ ] Generate identification counts diagnostic plot using `tpa_plot(type = "counts")` (automatically saved to `data/`).
- [ ] **Qualitative Binary Switch Detection & Feature Overlap Profiling**:
  - Inspect condition-unique presence/absence (proteins detected exclusively in one biological group vs another prior to imputation) using `tpa_plot(type = "venn")` or `tpa_plot(type = "euler")` (automatically saved to `data/`).
- [ ] **Checkpoint 1.2**: Verify that replicate counts, quantifiable fractions, replicate CV distributions, missingness metrics, and feature overlap / binary switch profiles are printed to stdout and recorded in `logs/01_inspect/console.log`.

#### Phase 1.3: State Persistence & Phase Gate Verification
- [ ] Persist the imported dataset and generate reproducible R script:
  - Invoke `tpa_export_state(rds_path = "data/tidyproteomics_data.rds", script_path = "code/01_inspect.R")`.
- [ ] **Checkpoint 1.3 (Phase Gate & Log Verification)**:
  1. `logs/01_inspect/console.log` exists on disk with non-zero file size.
  2. `data/tidyproteomics_data.rds` and `code/01_inspect.R` exist on disk with non-zero file size.
  3. `overview` confirms exact sample groups (`ctl`, treatment cohorts) and functional annotation terms.
  4. Count diagnostic plot (`data/plot_proteins_counts.png` or `data/plot_peptides_counts.png`) exists in `data/` with non-zero file size (along with optional `data/plot_*_venn.png` or `data/plot_*_euler.png` if generated).

#### Phase 1.4: Experimental Alignment, Contrast Scaffolding & Hypothesis Verification
- [ ] **Inspect User Hypothesis & Parameters (`docs/experiment.md` Sections 1 & 2)**:
  - Extract the working hypothesis, biological model, and investigated target(s) / discovery scope from Sections 1 and 2.
  - **CRITICAL**: Never overwrite, modify, or delete Sections 1 or 2 of `docs/experiment.md` (reserved strictly for researcher input).
- [ ] **Sample Group & Batch Pattern Audit (`sample_names`)**:
  - Inspect the discovered `sample_names` output from Phase 1.3.
  - Check whether `sample_names` contain technical batch suffixes (e.g. `_batch\d+`, `_plate\d+`, `_run\d+`, `_rep\d+`), multiple technical replicates, or compound delimiters.
- [ ] **Proactive Section 3 Scaffolding in `docs/experiment.md`**:
  - Inspect Section 3 (`## 3. Sample Grouping, Recoding & Contrast Designations`) in `docs/experiment.md`.
  - If Section 3 contains `*(Pending Phase 1 data ingestion)*`, is missing, or contains unconfigured tables:
    - *Targeting Edits*: Target concise unique anchor lines (e.g. replacing `- *(Pending Phase 1 data ingestion)*` in Section 3.A) rather than replacing large multi-paragraph comment blocks, ensuring `replace_file_content` succeeds reliably without whitespace mismatches.
    - **Scaffold Section 3**: Update Section 3 of `docs/experiment.md` directly using standardized visual badges:
      1. Section 3.A: Label with `ℹ️ [AUTO-GENERATED REFERENCE - READ ONLY]:` and list:
         - Discovered biological subjects vs raw files count (`<N>` unique subjects across `<M>` raw files).
         - Paired donor detection (flagging subjects detected in multiple condition groups).
         - Cross-batch bridge samples (flagging subjects acquired across multiple batches).
         - Technical replicates / cuts (flagging subjects with duplicate injections/cuts within group).
         - Discovered sample groups table with raw file counts and unique subject counts.
      2. Section 3.B: Label with `👉 [USER REVIEW & EDIT TABLE]:`. If technical batch suffixes are detected (e.g. `active_necrotic granuloma_batch5`, `batch6`, `batch9` and `healthy_healthy_batch8`), provide a suggested **Sample Group Renaming & Pooling Map** table proposing clean biological names (e.g. stripping `_batch\d+` to pool into `active necrotic granuloma` and `healthy`), and add `👉 [USER TOGGLE]:` with `- **Reassign Sample Names According to Pooling Map**: TRUE`.
      3. Section 3.C: Label with `👉 [USER ACTION REQUIRED - DEFINE TARGET CONTRASTS]:` and suggest logical **Target Contrasts** based on the cleaned groups (e.g. `active necrotic granuloma` vs `healthy`).
      4. Section 3.D: Label with `⚠️ [PRE-FLIGHT GATE DECISION]:`. If disease condition is confounded with batch across cohorts (e.g. healthy only in batch 8, disease in batches 5/6/9), explicitly document the confounding in the template comments and set `- **Proceed With Potential Batch Confounding**: FALSE` as the scaffolded default awaiting researcher review. Setting this default does NOT fail or halt Phase 1 (confounding authorization gating belongs strictly in Phase 4).
  - If Section 3 already contains user-customized renaming or contrast definitions, preserve them exactly!
  - **Enforce Clean Boolean Values & Badge Preservation**: Preserve visual badges (`ℹ️ [AUTO-GENERATED REFERENCE]`, `👉 [USER ACTION REQUIRED]`, `⚠️ [PRE-FLIGHT GATE DECISION]`) and keep all boolean configuration toggles (`- **Reassign Sample Names According to Pooling Map**: TRUE` and `- **Proceed With Potential Batch Confounding**: FALSE`) strictly as clean booleans without appending conversational notes or explanations. Any notes must be placed in markdown comments `<!-- ... -->` or recorded in `docs/notes.md`.
- [ ] **Blackboard Recording**:
  - Record the experimental alignment verification, discovered sample inventory, proposed or confirmed contrast groups, discovered target metadata (or untargeted scope), baseline quality stats, and detected upstream operations (normalization and imputation status) directly into `docs/notes.md`. If pre-existing normalization or imputation is detected, explicitly record that Phase 2 (Normalization) and/or Phase 3 (Imputation) will execute in verification and metric-extraction pass-through mode to preserve upstream data transformations without double-scaling.
- [ ] **Checkpoint 1.4 (Design Alignment Gate)**: 
  - Verify that `sample_names` are confirmed, alignment with `docs/experiment.md` is verified, Section 3 is scaffolded with discovered sample groups, and the summary is recorded in `docs/notes.md`.
  - Setting `- **Proceed With Potential Batch Confounding**: FALSE` is the scaffolded default awaiting researcher review and does NOT fail or halt Phase 1. Phase 1 must NEVER invoke `fail_phase` for discovered groups, batch suffixes, or confounding.
- [ ] **Complete Phase**:
  - Once `docs/experiment.md` Section 3 is scaffolded, QC plots are generated, and `docs/notes.md` is updated, Phase 1 MUST invoke `complete_phase(phaseName = "01_INSPECT", ...)` to preserve all QC artifacts and allow baseline inspection:
    `complete_phase(phaseName = "01_INSPECT", summary = "Data ingestion complete. Ingested dataset, audited operations history, verified sample groups in sample_names, scaffolded sample grouping and contrast template in docs/experiment.md Section 3, generated count diagnostic plot, and persisted data/tidyproteomics_data.rds.")`
