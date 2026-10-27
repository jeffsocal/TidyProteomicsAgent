---
tools: [tpa_health, tpa_load, tpa_inspect, tpa_summary, tpa_subset, tpa_enrichment, tpa_batch_analysis, tpa_plot, tpa_export_table, tpa_operations, tpa_extract, tpa_export_state]
---

### Phase 5: Functional Annotation Assessment & Pathway Enrichment

Execute this phase using live `tpa_*` MCP tools in memory (or execute `code/05_enrichment.R` if offline). All tool executions and outputs are automatically recorded to `logs/05_enrichment/console.log`. Upon satisfying all enrichment checkpoints, invoke `tpa_export_state` to generate `code/05_enrichment.R` and save `data/tidyproteomics_data.rds`. You must strictly enforce all checkpoints below.

---

#### Phase 5.1: Functional Annotation Assessment Gate & Remediation Guidance
- [ ] In-Memory State Continuity: The dataset is active in memory from Phase 4. If reloading is needed, call `tpa_load(source = "data/tidyproteomics_data.rds")`.
- [ ] Extract and audit available functional annotation categories:
  - Run `tpa_inspect(what = "annotation_terms")`.
- [ ] **Robust Dynamic Term Discovery**:
  - Identify biological ontology terms (e.g., `biological_process`, `cellular_component`, `molecular_function`, `reactome`, `kegg`, `pathway`, `wiki_pathway`, `gene_ontology`, `subcellular`).
- [ ] **Annotation Adequacy & Autonomous Continuation Mandate**:
  - If NO biological ontology categories or candidate annotations exist:
    1. Log an explicit alert in stdout and `docs/notes.md`:
       > "⚠️ **Annotation Notice**: Dataset lacks functional ontologies (GO terms / Reactome / KEGG). Pathway enrichment bypassed; data preserved."
    2. **CRITICAL AUTONOMOUS CONTINUATION MANDATE (DO NOT HALT)**:
       - **NEVER halt execution, stop calling tools, or invoke fail_phase asking the user for instructions.** The agent loop must run completely autonomously.
       - Record in `docs/notes.md` that pathway enrichment was bypassed due to missing ontology terms.
       - Invoke `tpa_export_state(rds_path = "data/tidyproteomics_data.rds", script_path = "code/05_enrichment.R")`.
       - **Always invoke `complete_phase(phaseName = "05_ENRICHMENT", summary = "Pathway enrichment bypassed due to absence of biological ontology annotations; data preserved.")`** so the pipeline autonomously advances to Phase 6 through Phase 10 based on primary biomarker observations.

#### Phase 5.2: Multi-Category Pathway Enrichment Testing
- [ ] If functional terms are available:
  - Run multi-category pathway enrichment using `tpa_enrichment(comparison = "<contrast>", terms = "<term_1>,<term_2>,...", method = "wilcoxon")` (multiple terms can be supplied comma-separated to process in a single pass, or run sequentially before table exports).
- [ ] **Checkpoint 5.2**: Confirm that enrichment operations are recorded in `tpa_operations()` (or if bypassed, that differential expression operations are confirmed).

#### Phase 5.3: Automated Pathway Visualization & Exports
- [ ] If pathway enrichment was computed:
  - Export composite enrichment tables for each tested term using `tpa_export_table`:
    - For each tested term (e.g. `biological_process`, `cellular_component`, `molecular_function`, `reactome_pathway`, `wiki_pathway`):
      `tpa_export_table(type = "analysis", analysis = "enrichment", comparison = "<contrast>", term = "<term>", file_name = "data/table_proteins_enrichment_<term>_<contrast>.tsv")`
      *(Note: In tidyproteomics, `.term` is mandatory when exporting enrichment tables).*
  - Generate pathway enrichment diagnostic plots using `tpa_plot(type = "enrichment")` (automatically saved to `data/`).

#### Phase 5.4: Object Persistence & Blackboard Recording
- [ ] Persist the enriched (or preserved) dataset and generate reproducible R script:
  - Invoke `tpa_export_state(rds_path = "data/tidyproteomics_data.rds", script_path = "code/05_enrichment.R")`.
- [ ] Record the following directly into `docs/notes.md`:
  - Functional annotation categories tested (or explicit notice documenting bypass if annotations were unavailable).
  - Top significant biological pathways and processes ($p \le 0.05$) across tested ontologies.
  - Key driving member proteins/genes contributing to enriched pathway signatures.

#### Phase 5.5: Checkpoint Verification & State Recording
- [ ] **Checkpoint 5.5**:
  1. `logs/05_enrichment/console.log` exists on disk with non-zero file size.
  2. `data/tidyproteomics_data.rds` and `code/05_enrichment.R` exist on disk with non-zero file size.
  3. If functional terms were analyzed: enrichment tables (`data/table_*_enrichment_*.tsv` or `.csv`) exist in `data/` with non-zero file size. Enrichment plots (`data/*_enrichment_*.png`) exist in `data/` with non-zero file sizes. If bypassed, `docs/notes.md` explicitly documents the bypass.
- [ ] **Complete Phase**:
  - Invoke `complete_phase(phaseName = "05_ENRICHMENT", summary = "Functional annotation assessment and pathway enrichment completed. Tested targeted categories, exported enrichment tables and plots, and persisted data/tidyproteomics_data.rds.")` (or summary documenting bypass if annotations were unavailable).
  - **CRITICAL AUTONOMY MANDATE**: You MUST invoke `complete_phase` to advance the pipeline to Phase 6. Under no circumstances should you halt execution, stop calling tools, or wait for user instructions.
