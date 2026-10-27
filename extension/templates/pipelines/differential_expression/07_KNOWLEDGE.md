---
tools: [tpa_health, tpa_load, tpa_inspect, tpa_summary, tpa_plot, tpa_export_table, tpa_operations, tpa_extract, tpa_run_code, tpa_export_state, tpa_protein_map]
---

### Phase 7: Internal Knowledge Contextualization & First-Layer Conclusions

In this phase, you (the LLM) will ingest the primary data-derived observations from `06_OBSERVATIONS` (`docs/observations.md`, `logs/06_observations/console.log`, and experimental design in `docs/experiment.md`). You will apply your internal domain knowledge (molecular biology, biochemistry, cellular physiology, protein complexes, and signaling cascades) to contextualize the observations and develop the **first layer of conclusions** (strictly do not hallucinate facts, citations, or unsupported claims).

If you need to query the data to test new hypotheses or check related protein family members, complex subunits, or candidate interactors:
- Use `tidyproteomics query tools (tpa_extract, tpa_run_code, or Rscript)` API conventions to write and execute targeted R queries against `data/tidyproteomics_data.rds` (e.g. `code/07_knowledge.R` logged to `logs/07_knowledge/console.log`).
- Document any **new** data-derived observations in `docs/knowledge.md`.

You will also develop a curated list of high-yield keyphrases for downstream web search in Phase 08.
Finally, you will construct `docs/knowledge.md` documenting both the **new** observations and **new** first-layer conclusions.

---

#### 1. Pre-Flight Verification & Inputs Ingestion
Before proceeding, verify that:
1. `docs/observations.md` exists and contains verified quantitative data (dimensions, target metrics, top up/down tables, and enrichment summaries).
2. `data/tidyproteomics_data.rds` exists on disk.
3. Review `docs/experiment.md` to ground your interpretation in the researcher's experimental system, perturbation conditions, and biological questions.

---

#### 2. Interactive Data Queries via `tidyproteomics query tools (tpa_extract, tpa_run_code, or Rscript)` (Optional Follow-Up Hypotheses)
If the observed changes in `docs/observations.md` suggest follow-up questions about specific protein complexes, unthresholded co-factors, or pathway partners:
- Write and execute a targeted R script `code/07_knowledge.R` (output is automatically captured to `logs/07_knowledge/console.log`):
  ```bash
  Rscript code/07_knowledge.R
  ```
- **Canonical Expression Table Columns**:
  - `tidyproteomics` exports differential expression tables with the following exact column names:
    - `gene_name`, `protein`, `description`, `log2_foldchange` (⚠️ **CRITICAL**: spelled `log2_foldchange` with *no* underscore between 'fold' and 'change'), `p_value`, `adj_p_value`, `foldchange`.
  - Always reference `log2_foldchange` (or use `any_of(...)` in `dplyr::select`) to prevent runtime column-not-found errors.
- Use canonical `tidyproteomics` functions per `tidyproteomics query tools (tpa_extract, tpa_run_code, or Rscript)` (e.g., `export_analysis(tp_data, "<contrast>", .analysis = "expression")`, filtering candidate gene symbols or UniProt IDs, checking nominal $p$-values and effect sizes without imposing strict FDR cutoffs):
  ```r
  library(tidyproteomics)
  library(dplyr)

  tp_data <- readRDS("data/tidyproteomics_data.rds")
  exp_tbl <- export_analysis(tp_data, "<treatment>/<control>", .analysis = "expression")

  # Query candidate complex members or hypothesized interactors:
  candidate_genes <- c("CAND1", "CAND2", "CAND3") # Replace with specific hypothesis candidates
  hits <- exp_tbl %>% filter(if_any(any_of(c("gene_name", "gene_symbol", "symbol", "protein")), ~ .x %in% candidate_genes))
  print(hits %>% select(any_of(c("gene_name", "protein", "log2_foldchange", "p_value", "adj_p_value", "description"))))
  ```
- Inspect the log using CLI tools (`head -n 30 logs/07_knowledge/console.log`).
- Any newly discovered findings (e.g., coordinate trends among unthresholded complex subunits) must be documented as **new observations** in `docs/knowledge.md`.

---

#### 3. Developing First-Layer Biological Conclusions (Data-First Anchor Rule)
Synthesize your internal biomedical knowledge to explain the observed proteomic remodeling, strictly adhering to the Data-First Anchor Rule:

1. **Mandatory Top-Candidate Coverage**:
   - The biological themes and hypotheses formulated in Phase 7 must directly reflect the dataset's strongest quantitative features.
   - **Every protein in the Top 5 Upregulated and Top 5 Downregulated lists** from `docs/observations.md` **must** be assigned to a biological theme or explicitly investigated. Never omit or skip the primary statistical drivers of the empirical dataset.
2. **No Dismissal of Unexpected Hits**:
   - If a leading hit appears biologically unexpected, atypical, or uncharacterized in the studied tissue (e.g., neuronal markers like `SYN1`, epidermal markers like `S100A7`, or unexpected erythroid/membrane markers like `EPB42` or `HBG2` in lung lesions):
     - **NEVER dismiss them** with a cursory single-sentence dismissal (e.g., "likely artifact" or "irrelevant to studied tissue biology").
     - **Formulate testable biological hypotheses** explaining their altered detection: e.g., neuroendocrine differentiation, epithelial-to-mesenchymal transition or squamous metaplasia, ectopic expression, immune/stromal cell-lineage infiltration, or altered proteolysis/shedding.
     - Pair biological hypotheses with technical and detection-rate audits (checking unique peptide evidence, spectral count support, and the Phase 4/6 imputation risk tag).
3. **Primary vs. Secondary Perturbations**:
   - Differentiate direct mechanistic consequences of the target perturbation from secondary cellular stress adaptations.
4. **Protein Complex & Pathway Contextualization**:
   - Identify multi-protein complexes, stoichiometric shifts, or functional modules represented among top altered features.
   - Explain biological roles of significantly enriched pathways (e.g., humoral immunity/complement cascade, proteostasis, metabolic shifts, extracellular matrix remodeling).
5. **Hypothesis Evaluation**:
   - Compare the observed remodeling directly against the expectations described in `docs/experiment.md`.
6. **Anti-Hallucination Directives**:
   - Strictly ground your conclusions in established biological mechanisms.
   - Do NOT fabricate specific literature citations, author names, DOIs, or PMIDs.
   - Clearly distinguish between established molecular mechanisms and working hypotheses.

---

#### 4. Formulating Downstream Web-Search Keyphrases
Develop a structured set of targeted keyphrases to guide Phase 08 (`08_WEBSEARCH.md`):
- **Entity Pairs**: Specific pairs or clusters of altered proteins, prioritizing top empirical drivers (e.g. `"[Target Gene] [Top Dysregulated Gene] proteomics interaction"`).
- **Phenotypic / Pathway Themes**: Disease states, cell stress modalities, or functional cascades (e.g. `"extracellular matrix remodeling and basement membrane loss"`).
- **Model-Specific Queries**: Queries combining the model organism/cell line, tissue context, and observed hallmarks (e.g. `"[Tissue / Model] [Perturbation] quantitative mass spectrometry hallmarks"`).
- **Hypothesis-Testing Queries for Unexpected Hits**: Targeted queries investigating unexpected top candidates in the biological context (e.g. `"Synapsin 1 neuroendocrine differentiation lung"` or `"S100A7 squamous metaplasia granuloma"`).

---

#### 5. Direct Construction of `docs/knowledge.md`
Write `docs/knowledge.md` directly, referencing `docs/llm.md` for active model details. Ensure it begins with the standard document header immediately below the title:

```markdown
# Biological Knowledge Contextualization & First-Layer Conclusions

Created: YYYY-MM-DD HH:MM
Author: PROVIDER | LLM-MODEL
Agent: TidyProteomicsAgent vX.X.X
```

Organize the document strictly into the following structured sections:

1. **Primary Observations Synthesis**:
   - Concise summary of primary findings from `docs/observations.md` (quantified counts, target status, top altered proteins, and key enriched pathways).
2. **Follow-Up Data Inquiries & New Observations**:
   - If targeted queries were run via `code/07_knowledge.R`, document the specific hypotheses tested, candidate proteins queried, and **new data-derived observations** (with exact $\log_2\text{FC}$ and $p$-values). If no additional queries were required, note that primary data sufficed.
3. **First-Layer Biological Conclusions (Data-First Anchor Rule)**:
   - Mechanistic interpretation of observed alterations based on internal biochemical and physiological knowledge.
   - **Explicit Top-Candidate Accounting**: Dedicated paragraphs or subsections explicitly evaluating **every candidate in the Top 5 Upregulated and Top 5 Downregulated lists**.
   - **Formulated Hypotheses for Unexpected Hits**: Concrete biological hypotheses (e.g. neuroendocrine differentiation, metaplasia, infiltration) addressing unexpected leading candidates rather than dismissing them.
   - Discussion of known functional complexes, enzymatic cascades, and cellular pathways implicated.
4. **Cellular Remodeling & Physiological Themes**:
   - Detailed analysis of cellular programs altered (e.g., organellar stress, proteasomal degradation, mitochondrial dynamics, translational control, ECM remodeling).
5. **Emerging Hypotheses & Open Questions**:
   - Biological questions raised by the empirical data that warrant external literature corroboration.
6. **Curated Keyphrases for Downstream Web Search**:
   - Structured, ranked list of specific keyphrases and search queries to be executed in Phase 08.

---

#### 6. Phase Completion Gate
- [ ] **Checkpoint Gate**:
  1. `docs/observations.md` successfully ingested.
  2. If follow-up data queries were executed, `code/07_knowledge.R` exited with code 0 and output was logged to `logs/07_knowledge/console.log` (or `logs/07_knowledge.log`).
  3. `docs/knowledge.md` exists on disk with non-zero size, containing first-layer conclusions, new observations, and curated web search keyphrases.
- [ ] **Complete Phase**:
  - Invoke `complete_phase(phaseName = "07_KNOWLEDGE", summary = "Internal knowledge contextualization complete in docs/knowledge.md with first-layer conclusions, follow-up data queries, and curated web search keyphrases.")`
