### Phase 7: Internal Knowledge Contextualization & First-Layer Conclusions

In this phase, you (the LLM) will ingest the primary data-derived observations from `06_OBSERVATIONS` (`docs/observations.md`, `logs/06_observations.log`, and experimental design in `docs/experiment.md`). You will apply your internal domain knowledge (molecular biology, biochemistry, cellular physiology, protein complexes, and signaling cascades) to contextualize the observations and develop the **first layer of conclusions** (strictly do not hallucinate facts, citations, or unsupported claims).

If you need to query the data to test new hypotheses or check related protein family members, complex subunits, or candidate interactors:
- Use `agent/SKILL.md` API conventions to write and execute targeted R queries against `data/tidyproteomics_data.rds` (e.g. `code/07_knowledge.R` logged to `logs/07_knowledge.log`).
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

#### 2. Interactive Data Queries via `agent/SKILL.md` (Optional Follow-Up Hypotheses)
If the observed changes in `docs/observations.md` suggest follow-up questions about specific protein complexes, unthresholded co-factors, or pathway partners:
- Write and execute a targeted R script `code/07_knowledge.R` (capturing output to `logs/07_knowledge.log`):
  ```bash
  Rscript code/07_knowledge.R 2>&1 | tee logs/07_knowledge.log
  ```
- Use canonical `tidyproteomics` functions per `agent/SKILL.md` (e.g., `export_analysis(tp_data, "<contrast>", .analysis = "expression")`, filtering candidate gene symbols or UniProt IDs, checking nominal $p$-values and effect sizes without imposing strict FDR cutoffs):
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
- Inspect the log using CLI tools (`head -n 30 logs/07_knowledge.log`).
- Any newly discovered findings (e.g., coordinate trends among unthresholded complex subunits) must be documented as **new observations** in `docs/knowledge.md`.

---

#### 3. Developing First-Layer Biological Conclusions
Synthesize your internal biomedical knowledge to explain the observed proteomic remodeling:
1. **Primary vs. Secondary Perturbations**:
   - Differentiate direct mechanistic consequences of the target perturbation from secondary cellular stress adaptations.
2. **Protein Complex & Pathway Contextualization**:
   - Identify multi-protein complexes, stoichiometric shifts, or functional modules represented among top altered features.
   - Explain biological roles of significantly enriched pathways (e.g., proteostasis, metabolic shifts, organelle stress, cytoskeletal remodeling).
3. **Hypothesis Evaluation**:
   - Compare the observed remodeling directly against the expectations described in `docs/experiment.md`.
4. **Anti-Hallucination Directives**:
   - Strictly ground your conclusions in established biological mechanisms.
   - Do NOT fabricate specific literature citations, author names, DOIs, or PMIDs.
   - Clearly distinguish between established molecular mechanisms and working hypotheses.

---

#### 4. Formulating Downstream Web-Search Keyphrases
Develop a structured set of targeted keyphrases to guide Phase 08 (`08_WEBSEARCH.md`):
- **Entity Pairs**: Specific pairs or clusters of altered proteins (e.g. `"[Target Gene] [Top Dysregulated Gene] proteomics interaction"`).
- **Phenotypic / Pathway Themes**: Disease states, cell stress modalities, or functional cascades (e.g. `"ER-phagy ubiquitin ligase remodeling under proteotoxic stress"`).
- **Model-Specific Queries**: Queries combining the model organism/cell line and observed hallmarks (e.g. `"[Cell Line / Model] [Perturbation] quantitative mass spectrometry hallmarks"`).

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
3. **First-Layer Biological Conclusions**:
   - Mechanistic interpretation of observed alterations based on internal biochemical and physiological knowledge.
   - Discussion of known functional complexes, enzymatic cascades, and cellular pathways implicated.
4. **Cellular Remodeling & Physiological Themes**:
   - Detailed analysis of cellular programs altered (e.g., organellar stress, proteasomal degradation, mitochondrial dynamics, translational control).
5. **Emerging Hypotheses & Open Questions**:
   - Biological questions raised by the data that warrant external literature corroboration.
6. **Curated Keyphrases for Downstream Web Search**:
   - Structured, ranked list of specific keyphrases and search queries to be executed in Phase 08.

---

#### 6. Phase Completion Gate
- [ ] **Checkpoint Gate**:
  1. `docs/observations.md` successfully ingested.
  2. If follow-up data queries were executed, `code/07_knowledge.R` exited with code 0 and output was logged to `logs/07_knowledge.log`.
  3. `docs/knowledge.md` exists on disk with non-zero size, containing first-layer conclusions, new observations, and curated web search keyphrases.
- [ ] **Complete Phase**:
  - Invoke `complete_phase(phaseName = "07_KNOWLEDGE", summary = "Internal knowledge contextualization complete in docs/knowledge.md with first-layer conclusions, follow-up data queries, and curated web search keyphrases.")`
