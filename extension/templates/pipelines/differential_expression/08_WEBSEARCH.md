---
tools: [tpa_health, tpa_load, tpa_inspect, tpa_summary, tpa_plot, tpa_export_table, tpa_operations, tpa_extract, tpa_run_code, tpa_export_state]
---

### Phase 8: Web Search Corroboration & Second-Layer Conclusions

In this phase, you (the LLM) will use the keyphrases curated in `07_KNOWLEDGE` (`docs/knowledge.md`) to conduct targeted web searches and external literature exploration. You will then ingest:
- `06_OBSERVATIONS` (`docs/observations.md`)
- `07_KNOWLEDGE` (`docs/knowledge.md`)
- The findings from the current web search

to further contextualize the observations and develop the **second layer of conclusions**.

If web search findings reveal new candidate interactors, orthologs, pathway regulators, or disease biomarkers that suggest follow-up questions:
- Use `tidyproteomics query tools (tpa_extract, tpa_run_code, or Rscript)` to query the saved dataset (`data/tidyproteomics_data.rds`) directly (e.g. writing `code/08_websearch.R` logged to `logs/08_websearch/console.log`).
- Document any **new** data-derived observations in `docs/websearch.md`.

You will also develop a targeted **Literature Search Strategy** (defining candidate seed gene symbols, functional modules, and context filters) to prepare for the DuckDB Literature Knowledge Database interrogation in Phase 09.

Finally, you will construct `docs/websearch.md` documenting both the **new** observations and **new** second-layer conclusions, with all references documented.

---

#### 1. Pre-Flight Verification & Inputs Ingestion
Before proceeding, verify that:
1. `docs/knowledge.md` exists and contains the curated web-search keyphrases and first-layer conclusions.
2. `docs/observations.md` exists and contains primary quantitative observations.
3. `data/tidyproteomics_data.rds` exists on disk.

---

#### 2. Executing Web Searches
Extract the prioritized keyphrases from `docs/knowledge.md` and execute targeted web inquiries:
- If web search tools are enabled in the agent environment, execute searches for the keyphrase groups.
- If web search is performed via command-line utilities (e.g. `curl` queries to PubMed/UniProt APIs or inline scripting), execute commands via `execute_command` and capture relevant text summaries. If executing Python snippets, explicitly invoke `python3` (as `/usr/bin/python` is unavailable on macOS and modern systems). **Rate Limit / API Discipline**: When invoking NCBI E-utilities (esearch/esummary), unauthenticated API calls are strictly capped at 3 requests per second. Always insert `time.sleep(0.4)` between HTTP requests in scripts to prevent HTTP 429 (Too Many Requests) errors.
- In offline or sandboxed environments without direct internet access, synthesize published literature and database knowledge corresponding to the curated keyphrases, ensuring strict attribution without hallucination.
- Search priorities:
  1. Primary perturbation target in the specific cell line / organism: reported proteomic alterations, direct interactors, and downstream markers.
  2. Functional validation of top upregulated and downregulated proteins in relation to the phenotype.
  3. Mechanistic cross-talk among top enriched pathways.

---

#### 3. Interactive Data Queries via `tidyproteomics query tools (tpa_extract, tpa_run_code, or Rscript)` (Testing New Web-Derived Hypotheses)
If external web findings suggest candidate interactors, co-complex members, or downstream pathway markers that were not initially examined in Phase 6:
- Write and execute `code/08_websearch.R` (output is automatically captured to `logs/08_websearch/console.log`):
  ```bash
  Rscript code/08_websearch.R
  ```
- Use canonical `tidyproteomics` functions per `tidyproteomics query tools (tpa_extract, tpa_run_code, or Rscript)`:
  ```r
  library(tidyproteomics)
  library(dplyr)

  tp_data <- readRDS("data/tidyproteomics_data.rds")
  exp_tbl <- export_analysis(tp_data, "<treatment>/<control>", .analysis = "expression")

  # Query newly identified candidates from web search:
  web_candidates <- c("CAND_A", "CAND_B", "CAND_C")
  matches <- exp_tbl %>% filter(if_any(any_of(c("gene_name", "gene_symbol", "symbol", "protein")), ~ .x %in% web_candidates))
  print(matches %>% select(any_of(c("gene_name", "protein", "log2_foldchange", "p_value", "adj_p_value", "description"))))
  ```
- Inspect output via CLI (`head -n 30 logs/08_websearch/console.log`).
- Any newly tested targets and their quantitative metrics must be documented as **new observations** in `docs/websearch.md`.

---

#### 4. Developing Second-Layer Biological Conclusions (Evidentiary Tiering)
Synthesize findings across the primary data (`docs/observations.md`), internal domain knowledge (`docs/knowledge.md`), and web search evidence:

1. **Strict Evidentiary Distance Tiering**:
   When evaluating external studies and literature findings, explicitly classify each reference by its biological and assay proximity to the current experiment:
   - **Tier 1 (Direct Match):** Same species, same tissue/cell type, same condition (e.g., human lung granuloma tissue proteomics or spatial transcriptomics). Represents direct molecular validation.
   - **Tier 2 (Surrogate Matrix / Proximal Model):** Human peripheral biofluids (plasma, serum) or in vitro human primary cell models. Must be explicitly labeled as **surrogate context**, not tissue validation.
   - **Tier 3 (Distal Context):** Animal models (e.g., mouse, rabbit) or transformed cell line screens.
2. **Handling Non-Replicated Literature Candidates**:
   - Candidates nominated by external literature or surrogate panels that show no statistically significant change in the empirical dataset ($p > 0.05$ or $|\log_2\text{FC}| < 0.5$) must be classified as **"Non-Replicated / Concordance: NONE"**.
   - **Prohibition on Speculative Hijacking**: Do NOT construct extensive narrative hypotheses or speculation around non-replicated external genes. State the lack of replication concisely (1–2 sentences) as empirical divergence between the primary tissue pathology and surrogate matrices (e.g., tissue lesions vs. circulating plasma).
3. **Corroboration of Primary Remodeling**:
   - Do external studies support the directionality and magnitude of the primary empirical changes?
   - Focus corroboration on the dataset's actual drivers (Top Upregulated, Top Downregulated, enriched pathways).
4. **Identification of Novel vs. Canonical Responses**:
   - Differentiate canonical markers (commonly observed across similar perturbation studies) from potential study-specific or novel tissue discoveries.
5. **Cross-Study & Model Comparison**:
   - How do the findings compare with published datasets across Tier 1, 2, and 3 contexts?

---

#### 5. Developing a Literature Search Strategy for Phase 09
Formulate a concrete search strategy to interrogate the DuckDB Literature Knowledge Database in Phase 09:
- **Seed Gene Symbols** (`seed_symbols`): Comma-separated list of 3–8 primary altered genes and verified candidate interactors (e.g. `"VCP,FAF2,DERL1,UFD1"`), anchored in top empirical hits.
- **Pathway Terms** (`pathway_terms`): Comma-separated functional terms and molecular complexes (e.g. `"ERAD,proteasome,unfolded protein response"`).
- **Interrogation Targets**: Specific candidate complexes or functional modules hypothesized to show sub-threshold coordinated regulation.

---

#### 6. Direct Construction of `docs/websearch.md`
Write `docs/websearch.md` directly, referencing `docs/llm.md` for active model details. Ensure it begins with the standard document header immediately below the title:

```markdown
# Web Search Corroboration & Second-Layer Conclusions

Created: YYYY-MM-DD HH:MM
Author: PROVIDER | LLM-MODEL
Agent: TidyProteomicsAgent vX.X.X
```

Organize the document strictly into the following structured sections:

1. **Executed Search Strategy & Queries**:
   - Summary of keyphrases searched, information sources consulted, and search objectives.
2. **Follow-Up Data Inquiries & New Observations**:
   - If follow-up data queries were executed via `code/08_websearch.R`, document hypotheses tested, candidate proteins queried, and **new data-derived observations** (with exact $\log_2\text{FC}$ and $p$-values). If no additional queries were required, state that the current dataset was verified.
3. **Second-Layer Biological Conclusions (with Evidentiary Tiering)**:
   - Synthesized biological interpretation combining primary observations, internal knowledge, and external web findings.
   - Explicit classification of cited studies into **Tier 1 (Direct Match)**, **Tier 2 (Surrogate Context)**, or **Tier 3 (Distal Context)**.
   - **Accounting for Non-Replicated Literature Candidates**: Summary table or concise audit documenting external candidates that failed to replicate ($p > 0.05$ or $|\log_2\text{FC}| < 0.5$) labeled as **"Non-Replicated / Concordance: NONE"**, without speculative narrative expansion.
4. **Cross-Study Parallels & Phenotypic Significance**:
   - Comparisons with published perturbation datasets, disease models, or drug response profiles.
   - Distinguishing expected canonical responses from novel, unexpected remodeling.
5. **Literature Search Strategy for Phase 09**:
   - Defined seed symbols (`seed_symbols`), pathway terms (`pathway_terms`), and prioritized candidate complexes for querying the DuckDB Literature Knowledge Database.
6. **Documented References**:
   - Complete bibliography of all external sources referenced: Title, Authors/Venue, Year, Evidentiary Tier (Tier 1/2/3), and valid URL or DOI/PMID. Never fabricate identifiers.

---

#### 7. Phase Completion Gate
- [ ] **Checkpoint Gate**:
  1. `docs/knowledge.md` and `docs/observations.md` successfully ingested.
  2. If follow-up data queries were executed, `code/08_websearch.R` exited with code 0 and output was logged to `logs/08_websearch/console.log` (or `logs/08_websearch.log`).
  3. `docs/websearch.md` exists on disk with non-zero size, containing second-layer conclusions, new observations, a literature search strategy for Phase 09, and documented references.
- [ ] **Complete Phase**:
  - Invoke `complete_phase(phaseName = "08_WEBSEARCH", summary = "Web search corroboration complete in docs/websearch.md with second-layer conclusions, hypothesis data queries, literature search strategy, and documented references.")`
