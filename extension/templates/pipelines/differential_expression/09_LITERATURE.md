---
skills:
  - TIDYPROTEOMICS_CORE
  - TIDYPROTEOMICS_EXTRACT_QUERY
---

### Phase 9: Literature Knowledge Database Interrogation & Third-Layer Conclusions

In this phase, you (the LLM) will use the literature search strategy formulated in `08_WEBSEARCH` (`docs/websearch.md`) to interrogate the "Literature Knowledge Database" (the active DuckDB literature database). 

You will synthesize evidence across:
- `06_OBSERVATIONS` (`docs/observations.md`)
- `07_KNOWLEDGE` (`docs/knowledge.md`)
- `08_WEBSEARCH` (`docs/websearch.md`)
- The retrieved molecular assertions, graph-hop evidence, and reverse-interrogation results

to further contextualize the observations and develop the **third layer of conclusions**.

If new hypotheses or candidate networks emerge from the literature assertions:
- Use `agent/TIDYPROTEOMICS_EXTRACT_QUERY.md` to query the saved dataset (`data/tidyproteomics_data.rds`) directly (e.g. running `tools/literature/interrogate_unthresholded_proteomics.R` or custom scripts in `code/09_literature.R` logged to `logs/09_literature/console.log`).
- Document any **new** data-derived observations in `docs/literature.md`.

Finally, you will construct `docs/literature.md` documenting both the **new** observations and **new** third-layer conclusions, with all references documented.

---

#### 1. Pre-Flight Verification & Inputs Ingestion
Before proceeding, verify that:
1. `docs/websearch.md` exists and contains the literature search strategy (`seed_symbols`, `pathway_terms`).
2. `docs/knowledge.md` and `docs/observations.md` exist and are populated.
3. `data/tidyproteomics_data.rds` exists on disk.
4. Check the runtime blackboard above for `### ACTIVE LITERATURE DATABASE`.

---

#### 2. Interrogating the Literature Knowledge Database

##### Strategy A: When DuckDB Literature Database is ENABLED (Two-Way R Interrogation Loop)
Execute the iterative graph interrogation loop:
`R_proteomic_data + user_insight >> query_literature >> llm_rationalize_candidates >> interrogate_unthresholded_proteomics >> compile_observations`

1. **Step 2A: Query Literature via `tools/literature/query_literature.R`**:
   - Extract the `seed_symbols` and `pathway_terms` defined in `docs/websearch.md`.
   - Execute the graph-hop query skill:
     ```bash
     Rscript tools/literature/query_literature.R <literature_db_path> "<seed_symbols>" "<pathway_terms>" 20
     ```
   - This hops across `context_id` and `functional_module` to return candidate co-factors, physical interactors, and direct substrates `[X, Y, Z]` reported in the literature that may have missed strict volcano plot thresholds.

2. **Step 2B: LLM Rationalization of Retrieved Candidates & Evidentiary Distance Tiering**:
   - Review the retrieved assertions, supporting `study_id` references, and `evidence_quote` notes.
   - **Assign Evidentiary Tiers**:
     - **Tier 1 (Direct Match):** Same species, same tissue/cell type, same condition (e.g., human lung granuloma tissue proteomics or spatial transcriptomics).
     - **Tier 2 (Surrogate Matrix / Proximal Model):** Human peripheral biofluids (plasma, serum) or in vitro human primary cell models. Must be explicitly labeled as *surrogate context*, not tissue validation.
     - **Tier 3 (Distal Context):** Animal models (e.g., mouse, rabbit) or transformed cell lines.
   - Select the most biologically compelling candidate genes or functional modules hypothesized to exhibit coordinate sub-threshold regulation in the empirical tissue.

3. **Step 2C: Reverse-Interrogate Unthresholded Proteomics Data**:
   - Execute the reverse-interrogation skill against `data/tidyproteomics_data.rds`:
     ```bash
     mkdir -p logs/09_literature && Rscript tools/literature/interrogate_unthresholded_proteomics.R "<candidate_symbols>" "<module_name>" data/tidyproteomics_data.rds 2>&1 | tee logs/09_literature/console.log
     ```
   - Review the output table and custom `fgsea` enrichment metrics (`NES`, `pval`, `leadingEdge`).
   - **Audit Concordance & Non-Replicated Literature Candidates**:
     - Candidates showing coordinated nominal shifts ($p < 0.05$) or concordant directional drift are flagged as **"Corroborated / Concordance: WEAK/MODERATE/STRONG"**.
     - Candidates showing no change ($p > 0.05$ or $|\log_2\text{FC}| < 0.5$, such as `COL15A1` or `MMP2` in tissue when nominated from plasma) must be explicitly classified as **"Non-Replicated / Concordance: NONE"**.
     - **Prohibition on Speculative Hijacking**: Do NOT generate multi-paragraph speculative hypotheses explaining away non-replicated literature genes. Document their lack of replication concisely (1–2 sentences) as empirical divergence between local tissue pathology and surrogate matrices.
   - Any identified sub-threshold shifts must be recorded as **new observations** in `docs/literature.md`.

##### Strategy B: When Literature Database is DISABLED (Standard Literature Fallback)
If no active DuckDB literature database is configured:
- Target & Biomarker Corroboration: Query or synthesize documented scientific literature for the target's molecular role, known phenotypes, and compensatory stress mechanisms.
- Explicitly apply Evidentiary Distance Tiering (Tier 1 vs. Tier 2 vs. Tier 3) to all cited external studies.
- Classify external candidates as Corroborated or Non-Replicated based on the empirical dataset.
- Cite standard literature by Author (Year). Never invent or hallucinate numerical PMIDs or DOIs.

---

#### 3. Interactive Data Queries via `agent/TIDYPROTEOMICS_EXTRACT_QUERY.md` (Pursuing Literature Hypotheses)
If the literature database assertions point to additional protein families, isoform differences, or pathway branches:
- Write and execute `code/09_literature.R` (capturing output to `logs/09_literature/console.log`):
  ```bash
  mkdir -p logs/09_literature && Rscript code/09_literature.R 2>&1 | tee logs/09_literature/console.log
  ```
- Use canonical `tidyproteomics` methods per `agent/TIDYPROTEOMICS_EXTRACT_QUERY.md` to extract unthresholded metrics or verify target-interactor relationships.
- Document any **new** data-derived findings in `docs/literature.md`.

---

#### 4. Developing Third-Layer Biological Conclusions (Data-First Literature Calibration)
Synthesize all prior layers into a deep mechanistic framework, ensuring the primary empirical data remains the driving narrative:
1. **Calibration by Evidentiary Distance**:
   - Give primary interpretive weight to Tier 1 (direct tissue) evidence.
   - Treat Tier 2 (surrogate plasma/biofluid) studies strictly as comparative contrasts, not surrogate truth.
2. **Integration of Literature Assertions & Experimental Shifts**:
   - Reconcile the primary data with molecular assertions from the literature database.
   - Ground functional interpretations with verbatim quotes (`evidence_quote`) and verified study IDs.
3. **Sub-Threshold Coordinated Regulation vs. Non-Replication**:
   - Differentiate genuine sub-threshold complexes (concordant directional drift among multiple subunits) from isolated non-replicated literature candidates (`Concordance: NONE`).
4. **Reconciliation with Experimental Hypothesis**:
   - Point-by-point reconciliation with `docs/experiment.md`:
     - Which hypothesized effects are definitively supported by the integrated evidence?
     - What compensatory or secondary pathways are newly revealed?
     - What unexpected proteomic hallmarks emerge from the synthesis?

---

#### 5. Direct Construction of `docs/literature.md`
Write `docs/literature.md` directly, referencing `docs/llm.md` for active model details. Ensure it begins with the standard document header immediately below the title:

```markdown
# Literature Knowledge Database Interrogation & Third-Layer Conclusions

Created: YYYY-MM-DD HH:MM
Author: PROVIDER | LLM-MODEL
Agent: TidyProteomicsAgent vX.X.X
```

Organize the document strictly into the following structured sections:

1. **Literature Database Interrogation Status & Search Parameters**:
   - Status (ENABLED / DISABLED), database path, query seed symbols (`seed_symbols`), and pathway terms (`pathway_terms`) used.
2. **Retrieved Molecular Assertions & Evidence Subgraph**:
   - Markdown table of candidate proteins retrieved: Candidate Symbol, Relationship Type (`interacts_with`, `regulates`, `substrate_of`), Functional Module, Study ID, Evidentiary Tier (Tier 1/2/3), and verbatim `evidence_quote`.
3. **Reverse-Interrogation & Sub-Threshold Proteomics Dynamics**:
   - Quantitative results from `interrogate_unthresholded_proteomics.R`: Candidate Gene Symbol, observed $\log_2\text{FC}$, nominal $p$-value, directional trend, custom pathway `fgsea` enrichment statistics (`NES`, `pval`), and **Concordance Status** (`STRONG`, `MODERATE`, `WEAK`, or `NONE - Non-Replicated`).
   - Concise summary of non-replicated candidates (1–2 sentences) documenting divergence between tissue and surrogate models.
4. **Follow-Up Data Inquiries & New Observations**:
   - If targeted queries were run via `code/09_literature.R`, document hypotheses tested, candidate proteins queried, and **new data-derived observations**.
5. **Third-Layer Biological Conclusions (Data-First Integration)**:
   - Deep mechanistic synthesis integrating literature assertions with observed remodeling.
   - Dissection of coordinated complex dynamics, direct vs. indirect regulatory cascades, and cellular adaptations.
   - Primary empirical findings MUST lead the discussion; external literature must calibrate rather than hijack the narrative.
6. **Experimental Hypothesis Reconciliation**:
   - Comprehensive point-by-point evaluation against the working hypothesis in `docs/experiment.md`.
7. **Documented Literature References**:
   - Formatted list of all cited studies: Study ID, Author, Year, Title, Evidentiary Tier (Tier 1/2/3), and verified PMID/DOI. Include verbatim quotes where appropriate.

---

#### 6. Phase Completion Gate
- [ ] **Checkpoint Gate**:
  1. `docs/websearch.md`, `docs/knowledge.md`, and `docs/observations.md` successfully ingested.
  2. Literature query scripts (`query_literature.R`, `interrogate_unthresholded_proteomics.R`, or `code/09_literature.R`) executed cleanly with output logged to `logs/09_literature/console.log` (or `logs/09_literature.log`).
  3. `docs/literature.md` exists on disk with non-zero size, containing third-layer conclusions, new observations, sub-threshold dynamics, and documented references.
- [ ] **Complete Phase**:
  - Invoke `complete_phase(phaseName = "09_LITERATURE", summary = "Literature database interrogation complete in docs/literature.md with third-layer conclusions, sub-threshold dynamics, and grounded citations.")`
