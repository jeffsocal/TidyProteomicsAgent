---
tools: [tpa_health, tpa_load, tpa_inspect, tpa_summary, tpa_plot, tpa_export_table, tpa_operations, tpa_extract, tpa_export_state, tpa_export_sdrf, tpa_normalization_sensitivity]
---

### Phase 11: Publication-Grade Scientific Manuscript Synthesis

In this phase, you (the LLM) will author a comprehensive, publication-grade scientific manuscript (`docs/manuscript.md`).

Target execution budget: **1–2 turns max**.

---

#### Zero-Exploration Direct Authoring Policy

- **Do NOT execute exploratory shell commands, R scripts, or directory listings**.
- All empirical data, quantitative statistics, top candidate metrics, and figure paths have already been compiled in:
  - `data/manuscript_digest.json` (compiled statistical digest and discussion figure paths)
  - `docs/observations.md` (primary data-derived observations & biomarker tables)
  - `docs/knowledge.md` (internal knowledge contextualization)
  - `docs/websearch.md` (second-layer web search findings)
  - `docs/literature.md` (third-layer DuckDB literature assertions & citations)
  - `docs/experiment.md` (study design, hypothesis, and sample groups)
- **Author `docs/manuscript.md` directly** using `write_file`.

---

#### Manuscript Structure & Authoring Guidelines

Compose `docs/manuscript.md` formatted in GitHub-flavored markdown adhering strictly to the following structure:

1. **Title & Front Matter**:
   - Informative publication title highlighting the perturbation/condition, biological model, and primary proteomic discoveries.
   - Standard Document Header referencing `docs/llm.md`:
     ```markdown
     # Title

     Created: YYYY-MM-DD HH:MM
     Author: PROVIDER | LLM-MODEL
     Agent: TidyProteomicsAgent vX.X.X
     ```
   - Framework Context: Analysis Framework (`tidyproteomics` R package).

2. **Abstract** (~250–350 words):
   - Background, Objective, Methodology (platform, QC, normalization, imputation, limma, Wilcoxon enrichment), Key Findings (quantified features, DE counts, top candidates, pathway themes), and Conclusions.

3. **Introduction**:
   - Biological Context of the system/model.
   - Known physiological roles and expected downstream cascades.
   - Study Rationale & Working Hypothesis directly from `docs/experiment.md`.

4. **Materials and Methods**:
   - Data Provenance & Experimental Design (sample groups, replication scheme, platform).
   - Quality Filtering (contaminant removal, peptide confidence thresholds).
   - Normalization & Missingness Handling (benchmarking/provenance, imputation rationale).
   - Differential Expression Analysis (limma empirical Bayes, $|\log_2\text{FC}| \ge 1.0$, adjusted $p \le 0.05$).
   - Functional Enrichment (Wilcoxon rank-sum testing across GO and Reactome).
   - Literature Database Interrogation (DuckDB graph-hop methodology and reverse interrogation).

5. **Results** (Narrative with embedded figures, statistics, and tables):
   - **Data Quality & Cohort Diagnostics**: Identification counts (`![Identification Counts](../data/plot_proteins_counts.png)`), feature overlap (`![Feature Overlap](../data/plot_proteins_venn.png)`), variation (`![Coefficient of Variation](../data/plot_variation_cv.png)`), and multivariate clustering (`![PCA](../data/plot_pca.png)` and `![Heatmap](../data/plot_heatmap.png)`).
   - **Global Proteome Remodeling & Differential Expression**: Global shift counts, publication volcano plot (`![Volcano Plot](../data/plot_proteins_volcano_<contrast>.png)` matching the actual contrast in `data/`), formatted markdown tables of Top 10 Upregulated and Top 10 Downregulated Biomarkers (Rank, Identifier, Description, $\log_2\text{FC}$, $p$-value, $q$-value in scientific notation, Imputation Bias, Candidate Reliability, Function). Reflect the populated `imputation_bias` (`HIGH`, `MODERATE`, `LOW`) and `candidate_reliability` (`ROBUST_QUANTITATIVE`, `DETECTION_LIMITED_ON_OFF`, `HIGH_UNCERTAINTY`) tiers from `data/manuscript_digest.json` and `docs/observations.md`. Visual profiles (`![Top Up](../data/plot_expression_up_<contrast>.png)` and `![Top Down](../data/plot_expression_down_<contrast>.png)` if generated).
   - **Functional & Pathway Enrichment Landscape**: Significant enriched biological processes, cellular compartments, and pathways (e.g. `![Reactome Pathway Enrichment](../data/plot_enrichment_reactome_pathway_<contrast>.png)` and `![Biological Process Enrichment](../data/plot_enrichment_biological_process_<contrast>.png)` matching available plots in `data/`), citing specific leading pathway drivers using gene symbols from `member_genes` (falling back to UniProt accessions in `member_proteins` only if gene symbols are unmapped).
   - **Targeted Hypothesis Inquiries**: Follow-up observations from Phases 7–9.

6. **Discussion** (In-depth biological interpretation):
   - **The 70/30 Evidentiary Rule**: At least 70% empirical data interpretation; at most 30% external literature contextualization.
   - **Mandatory Top-Candidate Accounting**: Address and mechanistically evaluate every candidate in the Top 5 Upregulated and Top 5 Downregulated tables.
   - **Mandatory Discussion Figure Embedding**: Embed and discuss the 4 pre-generated discussion figures from Phase 10 (using the exact relative paths recorded in `data/manuscript_digest.json$discussion_figures`):
     - `![Focused Biological Module](../data/plot_proteins_<quant>_heatmap_module_<name>.png)` (or `../data/plot_discussion_module_*.png`)
     - `![Opposing Biological Programs](../data/plot_proteins_<quant>_programs_<contrast>_dichotomy_<name>.png)` (or `../data/plot_discussion_dichotomy_*.png`)
     - `![Literature Validation Forest Plot](../data/plot_proteins_<quant>_forest_<contrast>_literature.png)` (or `../data/plot_discussion_literature_forest.png`)
     - `![Imputation Diagnostic Strip Plot](../data/plot_proteins_<quant>_expression_<contrast>_imputation_diagnostic.png)` (or `../data/plot_discussion_imputation_diagnostic.png`)
   - **Literature Integration & Sub-Threshold Dynamics**: Integrate study IDs, DOIs, and verbatim quotes from `docs/literature.md`.
   - **Reconciliation with Experimental Hypothesis**: Point-by-point evaluation against `docs/experiment.md`.
   - **Limitations & Future Directions**: Orthogonal validation proposals (PRM, western blot).

7. **Conclusions**:
   - Concise summary of primary proteomic hallmark and biological implications.

8. **Documented References**:
   - Bibliography compiling all literature citations and study IDs across `docs/*`.

9. **Data & Artifact Availability**:
   - Explicit relative markdown links to all executable scripts in `code/`, phase logs in `logs/`, documentation in `docs/`, data tables in `data/`, and generated figures (`../data/*.png`, `../data/plot_discussion_*.png`).

---

#### Critical Constraints

- **Absolute Data Grounding**: Every numerical value ($\log_2\text{FC}$, $p$-value, $q$-value, counts) MUST strictly match `data/manuscript_digest.json` and `docs/observations.md`.
- **Candidate Reliability & LOD Accounting**: Candidate tables and narrative discussion MUST reflect the populated `imputation_bias` and `candidate_reliability` tiers (e.g. `ROBUST_QUANTITATIVE` vs `DETECTION_LIMITED_ON_OFF`), ensuring detection-limited on/off markers are transparently differentiated from robust quantitative shifts.
- **Pathway Driver Gene Symbols**: Always report leading pathway driver members as gene symbols (`member_genes`, e.g. `VCP, HERPUD1`) rather than bare UniProt accessions, falling back to accessions only when gene symbols are unmapped.
- **Direct Authoring**: Do not call bash tools or list directories; compose and save `docs/manuscript.md` via `write_file`.

---

#### Checkpoint Gate & Phase Completion

- [ ] `docs/manuscript.md` exists on disk with non-zero file size, contains complete Abstract, Methods, Results, Discussion, Conclusions, References, and embeds both primary Results figures and Discussion figures.
- [ ] Invoke `complete_phase(phaseName = "11_SYNTHESIS", summary = "Authored publication-grade manuscript in docs/manuscript.md synthesizing all analytical layers, embedded diagnostic and discussion figures, and literature concordance.")`.
