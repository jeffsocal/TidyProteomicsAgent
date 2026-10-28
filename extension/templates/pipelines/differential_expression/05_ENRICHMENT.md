---
tools: [tpa_health, tpa_load, tpa_inspect, tpa_enrichment, tpa_plot, tpa_export_table, tpa_operations, tpa_export_state]
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
    1. **CRITICAL AUTONOMOUS CONTINUATION MANDATE (DO NOT HALT)**:
       - **NEVER halt execution, stop calling tools, or invoke fail_phase asking the user for instructions.** The agent loop must run completely autonomously.
       - Do NOT manually edit `docs/notes.md` via file tools; the orchestrator automatically records your `complete_phase` summary into `docs/notes.md`.
       - Invoke `tpa_export_state(rds_path = "data/tidyproteomics_data.rds", script_path = "code/05_enrichment.R")`.
       - **Immediately invoke `complete_phase(phaseName = "05_ENRICHMENT", summary = "Pathway enrichment bypassed due to absence of biological ontology annotations (GO/Reactome/KEGG); data preserved for Phase 6 observations and Phase 7 de novo functional module testing.")`** so the pipeline autonomously advances.

#### Phase 5.2: Multi-Category Pathway Enrichment Testing
- [ ] If functional terms are available:
  - Run multi-category pathway enrichment using `tpa_enrichment(comparison = "<contrast>", terms = "<term_1>,<term_2>,...", method = "wilcoxon")` (multiple terms can be supplied comma-separated to process in a single pass, or run sequentially before table exports).
- [ ] **Enrichment Score & Sign Convention**:
  - In tidyproteomics, the Wilcoxon rank-sum enrichment score represents the median/rank shift of member log2FC values relative to background proteins. For a contrast structured as `<treatment>/<control>` (e.g. `p97_kd/ctl` where $\log_2\text{FC} > 0$ means higher abundance in treatment):
    - **Positive (+) score**: The pathway/term is shifted toward upregulated proteins (accumulated/induced in treatment).
    - **Negative (-) score**: The pathway/term is shifted toward downregulated proteins (depleted/repressed in treatment).
  - Explicitly use this definitive direction in `docs/notes.md` and downstream reports rather than treating direction as unverified or provisional.
- [ ] **Checkpoint 5.2**: Confirm that enrichment operations are recorded in `tpa_operations()` (or if bypassed, that differential expression operations are confirmed).


#### Phase 5.3: Automated Pathway Visualization & Exports
- [ ] If pathway enrichment was computed:
  - Export composite enrichment tables for each tested term using `tpa_export_table`:
    - For each tested term (e.g. `biological_process`, `cellular_component`, `molecular_function`, `reactome_pathway`, `wiki_pathway`):
      `tpa_export_table(type = "analysis", analysis = "enrichment", comparison = "<contrast>", term = "<term>", append = "gene_name", file_name = "data/table_proteins_enrichment_<term>_<contrast>.tsv")`
      *(Note: In tidyproteomics, `.term` is mandatory when exporting enrichment tables. Supplying `append = "gene_name"` automatically attaches member gene symbols as a `gene_names` column for downstream leading-driver gene resolution).*
  - Generate pathway enrichment diagnostic plots using `tpa_plot(type = "enrichment")` (automatically saved to `data/`).

#### Phase 5.4: Object Persistence & Checkpoint Verification
- [ ] Persist the enriched (or preserved) dataset and generate reproducible R script:
  - Invoke `tpa_export_state(rds_path = "data/tidyproteomics_data.rds", script_path = "code/05_enrichment.R")`.
- [ ] **Checkpoint 5.4**:
  1. `logs/05_enrichment/console.log` exists on disk with non-zero file size.
  2. `data/tidyproteomics_data.rds` and `code/05_enrichment.R` exist on disk with non-zero file size.
  3. If functional terms were analyzed: enrichment tables (`data/table_*_enrichment_*.tsv` or `.csv`) and enrichment plots (`data/*_enrichment_*.png`) exist in `data/` with non-zero file sizes.
- [ ] **Complete Phase (Automated Blackboard Recording)**:
  - Do NOT manually edit `docs/notes.md` via file tools; the orchestrator automatically records your `complete_phase` summary into `docs/notes.md`.
  - Invoke `complete_phase` with a comprehensive summary including the functional ontology categories tested (or bypass notice), top significant pathways ($p \le 0.05$) with direction (+ induced / − repressed), and key driving member genes:
    `complete_phase(phaseName = "05_ENRICHMENT", summary = "Functional annotation assessment and pathway enrichment completed across <terms>. Exported enrichment tables (with member gene_names) and plots, and persisted data/tidyproteomics_data.rds.")` (or summary documenting bypass if annotations were unavailable).
  - **CRITICAL AUTONOMY MANDATE**: You MUST invoke `complete_phase` to advance the pipeline to Phase 6. Under no circumstances should you halt execution, stop calling tools, or wait for user instructions.
