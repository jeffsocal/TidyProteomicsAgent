### Phase 10: Publication-Grade Scientific Manuscript Synthesis

In this phase, you (the LLM) will author a publication-grade scientific manuscript (`docs/scientific_report.md`). 

The manuscript synthesizes the complete chain of evidence contained in `docs/*`:
- `docs/experiment.md` (Biological hypothesis, model system, experimental design)
- `docs/observations.md` (Primary data-derived observations, target status, quantitative tables)
- `docs/knowledge.md` (Internal knowledge contextualization, first-layer conclusions)
- `docs/websearch.md` (Web search corroboration, second-layer conclusions)
- `docs/literature.md` (Literature Knowledge Database interrogation, sub-threshold dynamics, third-layer conclusions)
- `docs/notes.md` (Runtime execution state, quality benchmarks, and task history)

Crucially, the manuscript must feature an **in-depth, rigorous, and biologically grounded Discussion** that integrates all three layers of conclusions, evaluates sub-threshold proteomic remodeling, and critically evaluates the implications toward the core hypothesis in `docs/experiment.md`. All references across `docs/*` must be documented.

---

#### Pre-Flight Quality Gate (Mandatory)
Before writing `docs/scientific_report.md`, verify that:
1. All prerequisite documents in `docs/` exist and are non-empty:
   - `docs/observations.md`
   - `docs/knowledge.md`
   - `docs/websearch.md`
   - `docs/literature.md`
   - `data/tidyproteomics_data.rds`
2. Execution logs exist in `logs/` and verify clean runs across prior phases:
   - `logs/00_install.log` (or `logs/00_setup.log`)
   - `logs/01_inspect.log`
   - `logs/02_normalize.log`
   - `logs/03_impute.log`
   - `logs/04_expression.log`
   - `logs/05_enrichment.log`
   - `logs/06_observations.log`
   - Execution logs for follow-up inquiries (`logs/07_knowledge.log`, `logs/08_websearch.log`, `logs/09_literature.log` if generated).
3. All referenced quantitative tables (`data/table_*_*.csv`) and plots (`data/*.png`) exist on disk with non-zero file sizes.
*If any requirement is missing, return to the relevant preceding phase to regenerate artifacts before compiling this report.*

---

#### Manuscript Structure & Authoring Guidelines

Compose `docs/scientific_report.md` formatted in GitHub-flavored markdown adhering strictly to the following structure:

1. **Title & Front Matter**:
   - **Title**: Informative and descriptive publication title highlighting the target gene/perturbation (or experimental/clinical comparison), biological system (e.g., cell line, tissue, or model organism), and primary proteomic discoveries.
   - **Standard Document Header**: Reference `docs/llm.md` and format immediately below the title as:
     ```markdown
     Title

     Created: YYYY-MM-DD HH:MM
     Author: PROVIDER | LLM-MODEL
     Agent: TidyProteomicsAgent vX.X.X
     ```
   - **Framework Context**: Analysis Framework (`tidyproteomics` R package).

2. **Abstract** (Structured or Narrative, ~250–350 words):
   - **Background**: Biological significance of the investigated system, disease model, or target perturbation.
   - **Objective**: Key question and experimental hypothesis from `docs/experiment.md`.
   - **Methodology**: Quantitative proteomics platform (LC-MS/MS), sample cohort, quality control, normalization benchmarking, missingness evaluation, imputation rationale, and statistical pipeline.
   - **Key Findings**: Target alteration metrics (if targeted) or leading biomarker signatures (if untargeted), overall proteome alteration counts ($|\log_2\text{FC}| \ge 1.0$, $q \le 0.05$), top biomarker candidates, leading enriched functional pathways, and validated sub-threshold complexes.
   - **Conclusions**: Biological implications for the cellular model, disease context, or therapeutic mechanism.

3. **Introduction**:
   - **Biological Context**: Comprehensive background on the biological system, target protein (if targeted), disease context, or molecular pathways under study.
   - **Cellular Consequences of Perturbation / Condition**: Known physiological roles, expected downstream cascades, and compensatory pathways.
   - **Study Rationale & Hypothesis**: Explicit articulation of the study objective and the working hypothesis directly derived from `docs/experiment.md`.

4. **Materials and Methods**:
   - **Data Provenance & Experimental Design**: Raw data origin, sample groups (treatment vs. control), replication scheme, and mass spectrometry platform.
   - **Quality Filtering**: Removal of common contaminants (cRAP, Trypsin) and peptide confidence thresholds if applicable (`num_unique_peptides >= 2`).
   - **Normalization Benchmarking**: Evaluation of normalization algorithms (`median`, `linear`, `loess`, `limma`), selection criteria via CV/PC1 metrics, and demonstration of replicate CV reduction.
   - **Missingness Handling & Imputation Strategy**: Scientific rationale for the chosen imputation method (e.g., left-censored minimum for biological limit-of-detection/knockout dropouts vs. neighbor/correlation methods for stochastic missing at random).
   - **Differential Expression Analysis**: Linear modeling with empirical Bayes moderation (`limma` framework), cutoffs for biological significance ($|\log_2\text{FC}| \ge 1.0$, adjusted $p \le 0.05$).
   - **Multi-Category Functional Enrichment**: Non-parametric two-tailed Wilcoxon rank-sum testing across biological annotation domains (e.g., GO Biological Process, Cellular Component, Molecular Function, Reactome pathways).
   - **Literature Database Interrogation & Sub-Threshold Modeling**: Graph-hop assertion query methodology and unthresholded reverse-interrogation statistical parameters.

5. **Results** (Clear narrative with embedded figures, statistics, and markdown tables):
   - **Data Quality & Cohort Diagnostics**:
     - Evaluation of identification counts across replicates (`![Identification Counts](../data/plot_<analyte>_counts.png)`).
     - Benchmarking of quantitative reproducibility across normalization candidates (`![Variation CV](../data/plot_<analyte>_normalizated_variation.png)`).
     - Unsupervised multivariate clustering demonstrating replicate reproducibility and group separation (`![PCA Score Plot](../data/plot_<analyte>_<norm>_pca_PC1PC2.png)`).
   - **Target Verification / Primary Biomarker Metrics**:
     - Rigorous confirmation of target perturbation efficiency (if targeted) or leading master regulator / biomarker hub statistics from `docs/observations.md` (Gene name / Accession, $\log_2\text{FC}$, $p$-value, $q$-value, % change).
   - **Global Proteome Remodeling & Differential Expression**:
     - Global shift metrics: total quantified features, significantly upregulated, and significantly downregulated features per contrast.
     - Global landscape visualization: `![Volcano Plot](../data/<analyte>_volcano_<contrast>.png)`
     - Formatted markdown tables of Top 10 Upregulated and Top 10 Downregulated Biomarkers (Rank, Identifier / Gene Symbol, Description, $\log_2\text{FC}$, $q$-value, Primary Biological Function).
     - Visual expression profiles of leading candidates: `![Top Upregulated](../data/plot_expression_up_<contrast>.png)` and `![Top Downregulated](../data/plot_expression_down_<contrast>.png)`.
   - **Functional & Pathway Enrichment Landscape**:
     - Summary of enriched biological processes, cellular compartments, and molecular pathways.
     - Visual representation: `![Pathway Enrichment](../data/<analyte>_enrichment_<contrast>.png)`
     - Structured markdown table summarizing significant enriched pathways across annotation categories (Domain, Term Name, Direction, Rank Statistic / Score, $q$-value).
   - **Targeted Hypothesis Inquiries & Sub-Threshold Complex Shifts**:
     - Results of follow-up inquiries conducted across Phases 7, 8, and 9 (from `docs/knowledge.md`, `docs/websearch.md`, and `docs/literature.md`), including coordinate shifts in unthresholded complex members.

6. **Discussion** (Concise, robust biological interpretation synthesizing all three layers of conclusions):
   - **Mechanistic Dissection of Primary vs. Secondary Effects**:
     - Differentiate direct interactors, target alterations, or primary disease drivers from downstream secondary stress or compensatory cascades (drawing from `docs/observations.md` and `docs/knowledge.md`).
     - Evaluate accumulation or depletion of pathway clients, stress-responsive chaperones, and cellular response systems.
   - **Literature Database Integration & Sub-Threshold Dynamics**:
     - Synthesize candidate cofactors, interactors, or substrates identified through DuckDB literature database graph-hops and web searches (drawing from `docs/websearch.md` and `docs/literature.md`).
     - Explicitly cite supporting study IDs (or DOIs) and verbatim evidence quotes curated in `docs/literature.md`.
     - Discuss coordinate sub-threshold regulation of complexes that missed strict volcano plot thresholds but show concordant directional shifts.
   - **Pathological & Cellular Cascades**:
     - Connect specific altered features to known cellular programs (e.g., organelle stress responses, metabolic shifts, structural dynamics, or cell division checkpoints).
   - **Direct Evaluation of the Experimental Hypothesis**:
     - Point-by-point reconciliation with `docs/experiment.md`:
       - Did the perturbation or condition achieve the predicted molecular impact on target abundance and pathway activity?
       - Were hypothesized cellular responses and compensatory pathways activated as anticipated?
       - What unexpected or unpredicted proteomic shifts emerged, and what novel biological mechanisms do they suggest?
   - **Broader Biological & Therapeutic Implications**: Contextualize results within disease mechanisms, biomarker potential, or therapeutic vulnerabilities.
   - **Study Limitations & Future Directions**: Propose concrete orthogonal validation experiments (e.g., targeted PRM/SRM assays, western blots, pulse-chase kinetics, or immunoprecipitation).

7. **Conclusions**:
   - Concise summary of core discoveries, validating the analytical workflow and defining the proteomic hallmark of the perturbation or disease model.

8. **Documented References**:
   - Comprehensive bibliography compiling all literature citations, study IDs, web sources, and publications referenced across `docs/*` (`docs/observations.md`, `docs/knowledge.md`, `docs/websearch.md`, `docs/literature.md`).

9. **Data & Artifact Availability**:
   - Explicit relative markdown links to all executable R scripts (`[00_install.R](../code/00_install.R)`, `[01_inspect.R](../code/01_inspect.R)`, `[02_normalize.R](../code/02_normalize.R)`, `[03_impute.R](../code/03_impute.R)`, `[04_expression.R](../code/04_expression.R)`, `[05_enrichment.R](../code/05_enrichment.R)`, `[06_observations.R](../code/06_observations.R)`), logs (`../logs/*.log`), documentation files (`[observations.md](./observations.md)`, `[knowledge.md](./knowledge.md)`, `[websearch.md](./websearch.md)`, `[literature.md](./literature.md)`, `[experiment.md](./experiment.md)`, `[notes.md](./notes.md)`), tables (`../data/table_*_*.csv`), and figures (`../data/*.png`).

---

#### Critical Constraints
- **Absolute Data Grounding**: Every numerical value ($\log_2\text{FC}$, $p$-value, $q$-value, feature count, pathway score) MUST strictly match `docs/observations.md` and the exported CSV tables. Never fabricate or hallucinate figures or statistical metrics.
- **Direct Literature Linking**: Discussions of biological function must weave in the literature findings, citations, and PMIDs/DOIs/Study IDs curated across `docs/*`. Always reference verbatim quotes from `docs/literature.md` when interpreting literature-derived complex members.

---

#### Phase Completion Gate
- [ ] **Complete Phase**:
  - Invoke `complete_phase(phaseName = "10_SYNTHESIS", summary = "Publication-grade manuscript authored in docs/scientific_report.md with complete abstract, methods, verified quantitative findings, multi-layered grounded discussion, and artifact links.")`
