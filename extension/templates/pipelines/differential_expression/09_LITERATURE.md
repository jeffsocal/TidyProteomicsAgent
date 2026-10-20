### Phase 9: Literature Knowledge Database Interrogation & Third-Layer Conclusions

In this phase, you (the LLM) will use the literature search strategy formulated in `08_WEBSEARCH` (`docs/websearch.md`) to interrogate the "Literature Knowledge Database" (the active DuckDB literature database). 

You will synthesize evidence across:
- `06_OBSERVATIONS` (`docs/observations.md`)
- `07_KNOWLEDGE` (`docs/knowledge.md`)
- `08_WEBSEARCH` (`docs/websearch.md`)
- The retrieved molecular assertions, graph-hop evidence, and reverse-interrogation results

to further contextualize the observations and develop the **third layer of conclusions**.

If new hypotheses or candidate networks emerge from the literature assertions:
- Use `agent/SKILL.md` to query the saved dataset (`data/tidyproteomics_data.rds`) directly (e.g. running `tools/literature/interrogate_unthresholded_proteomics.R` or custom scripts in `code/09_literature.R` logged to `logs/09_literature.log`).
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

2. **Step 2B: LLM Rationalization of Retrieved Candidates**:
   - Review the retrieved assertions, supporting `study_id` references, and `evidence_quote` notes.
   - Select the most biologically compelling candidate genes or functional modules (e.g., specific adapter complexes, proteasome subunits, or kinase cascades) hypothesized to exhibit coordinate sub-threshold regulation.

3. **Step 2C: Reverse-Interrogate Unthresholded Proteomics Data**:
   - Execute the reverse-interrogation skill against `data/tidyproteomics_data.rds`:
     ```bash
     Rscript tools/literature/interrogate_unthresholded_proteomics.R "<candidate_symbols>" "<module_name>" data/tidyproteomics_data.rds 2>&1 | tee logs/09_literature.log
     ```
   - Review the output table and custom `fgsea` enrichment metrics (`NES`, `pval`, `leadingEdge`) to verify if the candidate cluster displays coordinate nominal shifts ($p < 0.05$) or concordant directional drift.
   - Any identified sub-threshold shifts must be recorded as **new observations** in `docs/literature.md`.

##### Strategy B: When Literature Database is DISABLED (Standard Literature Fallback)
If no active DuckDB literature database is configured:
- Target & Biomarker Corroboration: Query or synthesize documented scientific literature for the target's molecular role, known phenotypes, and compensatory stress mechanisms.
- Pathway Context: Corroborate enriched pathways against known proteomic hallmarks in the model organism/system.
- Cite standard literature by Author (Year). Never invent or hallucinate numerical PMIDs or DOIs.

---

#### 3. Interactive Data Queries via `agent/SKILL.md` (Pursuing Literature Hypotheses)
If the literature database assertions point to additional protein families, isoform differences, or pathway branches:
- Write and execute `code/09_literature.R` (capturing output to `logs/09_literature.log`):
  ```bash
  Rscript code/09_literature.R 2>&1 | tee logs/09_literature.log
  ```
- Use canonical `tidyproteomics` methods per `agent/SKILL.md` to extract unthresholded metrics or verify target-interactor relationships.
- Document any **new** data-derived findings in `docs/literature.md`.

---

#### 4. Developing Third-Layer Biological Conclusions
Synthesize all prior layers into a deep mechanistic framework:
1. **Integration of Literature Assertions & Experimental Shifts**:
   - Reconcile the primary data with molecular assertions from the literature database.
   - Ground functional interpretations with verbatim quotes (`evidence_quote`) and verified study IDs.
2. **Sub-Threshold Coordinated Regulation**:
   - Evaluate multi-protein complexes that missed strict statistical cutoffs but show coordinated directional drift or nominal shifts ($p < 0.05$) corroborated by literature.
3. **Reconciliation with Experimental Hypothesis**:
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
   - Markdown table of candidate proteins retrieved: Candidate Symbol, Relationship Type (`interacts_with`, `regulates`, `substrate_of`), Functional Module, Study ID, and verbatim `evidence_quote`.
3. **Reverse-Interrogation & Sub-Threshold Proteomics Dynamics**:
   - Quantitative results from `interrogate_unthresholded_proteomics.R`: Candidate Gene Symbol, observed $\log_2\text{FC}$, nominal $p$-value, directional trend, and custom pathway `fgsea` enrichment statistics (`NES`, `pval`).
4. **Follow-Up Data Inquiries & New Observations**:
   - If targeted queries were run via `code/09_literature.R`, document hypotheses tested, candidate proteins queried, and **new data-derived observations**.
5. **Third-Layer Biological Conclusions**:
   - Deep mechanistic synthesis integrating literature assertions with observed remodeling.
   - Dissection of coordinated complex dynamics, direct vs. indirect regulatory cascades, and cellular adaptations.
6. **Experimental Hypothesis Reconciliation**:
   - Comprehensive point-by-point evaluation against the working hypothesis in `docs/experiment.md`.
7. **Documented Literature References**:
   - Formatted list of all cited studies: Study ID, Author, Year, Title, and verified PMID/DOI. Include verbatim quotes where appropriate.

---

#### 6. Phase Completion Gate
- [ ] **Checkpoint Gate**:
  1. `docs/websearch.md`, `docs/knowledge.md`, and `docs/observations.md` successfully ingested.
  2. Literature query scripts (`query_literature.R`, `interrogate_unthresholded_proteomics.R`, or `code/09_literature.R`) executed cleanly with output logged to `logs/09_literature.log`.
  3. `docs/literature.md` exists on disk with non-zero size, containing third-layer conclusions, new observations, sub-threshold dynamics, and documented references.
- [ ] **Complete Phase**:
  - Invoke `complete_phase(phaseName = "09_LITERATURE", summary = "Literature database interrogation complete in docs/literature.md with third-layer conclusions, sub-threshold dynamics, and grounded citations.")`
