### Phase 4: Publication-Grade Scientific Manuscript Synthesis

In this phase, you (the LLM) will author a publication-grade scientific manuscript (`docs/scientific_report.md`). The manuscript must clearly detail the experimental design, mass-spectrometry quantitative proteomics pipeline, quality control checkpoints, differential expression, and pathway dynamics. 

Crucially, the manuscript must feature an **in-depth, rigorous, and biologically grounded Discussion** that interprets the observed proteomic remodeling, integrates literature evidence curated in `docs/observations.md`, and critically evaluates the implications toward the core hypothesis in `docs/experiment.md`.

---

#### Pre-Flight Quality Gate (Mandatory)
Before writing `docs/scientific_report.md`, verify that:
1. `docs/observations.md` and `data/tidyproteomics_data.rds` exist on disk, are non-empty, and confirm target perturbation validation.
2. Pathway enrichment results in `data/table_proteins_enrichment_<contrast>.csv` cover $\ge 3$ distinct annotation categories.
3. Execution logs exist in `logs/` and verify clean runs: `logs/00_setup.log`, `logs/01_data_quality.log`, `logs/02_expression.log`, `logs/03_observations.log`.
4. All referenced quantitative tables (`data/table_proteins_*.csv`) and plots (`data/*.png`) exist on disk with non-zero file sizes.
*If any requirement is missing, return to Phase 2 or Phase 3 to regenerate artifacts before compiling this report.*

---

#### Manuscript Structure & Authoring Guidelines

Compose `docs/scientific_report.md` formatted in GitHub-flavored markdown adhering strictly to the following structure:

1. **Title & Front Matter**:
   - **Title**: Informative and descriptive publication title highlighting the target gene/perturbation, biological system (e.g., cell line), and primary proteomic discoveries.
   - **Standard Document Header**: Reference `docs/llm.md` and format immediately below the title as:
     ```markdown
     Title

     Created: YYYY-MM-DD HH:MM
     Author: PROVIDER | LLM-MODEL
     Agent: TidyProteomicsAgent vX.X.X
     ```
   - **Framework Context**: Analysis Framework (`tidyproteomics` R package).

2. **Abstract** (Structured or Narrative, ~250–350 words):
   - **Background**: Biological significance of the investigated target and perturbation (e.g., role of the target protein/pathway in cellular homeostasis).
   - **Objective**: Key question and experimental hypothesis from `docs/experiment.md`.
   - **Methodology**: Quantitative proteomics platform (LC-MS/MS), sample cohort, quality control, normalization benchmarking, and statistical pipeline.
   - **Key Findings**: Target depletion/alteration metrics ($\log_2\text{FC}$, $q$-value), overall proteome alteration counts ($|\log_2\text{FC}| \ge 1.0$, $q \le 0.05$), top biomarker candidates, and leading enriched functional pathways.
   - **Conclusions**: Biological implications for the cellular model and disease context.

3. **Introduction**:
   - **Biological Context**: Comprehensive background on the target protein's molecular mechanisms and biological pathways under study (e.g., target molecular function, known interaction partners, catalytic activity).
   - **Cellular Consequences of Perturbation**: Known physiological roles, expected downstream cascades, and compensatory pathways.
   - **Study Rationale & Hypothesis**: Explicit articulation of the study objective and the working hypothesis directly derived from `docs/experiment.md`.

4. **Materials and Methods**:
   - **Data Provenance & Experimental Design**: Raw data origin, sample groups (treatment vs. control), replication scheme, and mass spectrometry platform.
   - **Quality Filtering**: Removal of common contaminants (cRAP, Trypsin) and peptide confidence thresholds (`num_unique_peptides >= 2`).
   - **Normalization Benchmarking & Imputation**: Evaluation of normalization algorithms (`median`, `linear`, `loess`, `limma`), selection criteria via CV/PC1 metrics, and left-censored minimum value imputation.
   - **Differential Expression Analysis**: Linear modeling with empirical Bayes moderation (`limma` framework), cutoffs for biological significance ($|\log_2\text{FC}| \ge 1.0$, adjusted $p \le 0.05$).
   - **Multi-Category Functional Enrichment**: Non-parametric two-tailed Wilcoxon rank-sum testing across $\ge 3$ biological annotation domains (e.g., GO Biological Process, Cellular Component, Molecular Function, Reactome pathways).

5. **Results** (Clear narrative with embedded figures, statistics, and markdown tables):
   - **Data Quality & Cohort Diagnostics**:
     - Evaluation of protein identification counts and distribution across replicates (`![Protein Counts](../data/plot_proteins_counts.png)`).
     - Benchmarking of quantitative reproducibility across normalization candidates (`![Variation CV](../data/plot_proteins_normalizated_variation.png)`, if multi-method normalization benchmarking was performed).
     - Unsupervised multivariate clustering demonstrating replicate reproducibility and clear group separation (`![PCA Score Plot](../data/plot_proteins_<norm>_pca_PC1PC2.png)`, e.g. `../data/plot_proteins_loess_pca_PC1PC2.png`).
   - **Target Perturbation Verification**:
     - Rigorous confirmation of target perturbation efficiency with exact statistics from `docs/observations.md` (Gene name, UniProt accession, $\log_2\text{FC}$, $p$-value, $q$-value, % change).
   - **Global Proteome Remodeling & Differential Expression**:
     - Global shift metrics: total quantified, significantly upregulated, and significantly downregulated proteins.
     - Global landscape visualization: `![Volcano Plot](../data/proteins_volcano_<contrast>.png)`
     - Formatted markdown tables of Top 10 Upregulated and Top 10 Downregulated Biomarkers (Rank, Gene Symbol, UniProt ID, Description, $\log_2\text{FC}$, $q$-value, Primary Biological Function).
     - Visual expression profiles of leading candidates: `![Top Upregulated](../data/plot_expression_up_<contrast>.png)` and `![Top Downregulated](../data/plot_expression_down_<contrast>.png)`.
   - **Multi-Ontology Pathway & Functional Enrichment**:
     - Summary of enriched biological processes, cellular compartments, and molecular pathways.
     - Visual representation: `![Pathway Enrichment](../data/proteins_enrichment_<contrast>.png)`
     - Structured markdown table summarizing significant enriched pathways across $\ge 3$ annotation categories (Domain, Term Name, Direction, Rank Statistic / Score, $q$-value).

6. **Discussion** (Concise, robust biological interpretation and hypothesis implications):
   - **Mechanistic Dissection of Primary vs. Secondary Effects**:
     - Differentiate direct substrates, interactors, and target alterations from downstream secondary stress or compensatory cascades.
     - Evaluate accumulation or depletion of pathway clients, stress-responsive chaperones, and cellular response systems using the literature curated in `docs/observations.md`.
     - Analyze co-factor behavior, interaction complexes, and their stability/expression changes.
   - **Pathological & Cellular Cascades**:
     - Connect specific altered proteins to known cellular programs (e.g., organelle stress responses, metabolic shifts, structural dynamics, or cell division checkpoints).
   - **Direct Evaluation of the Experimental Hypothesis**:
     - Point-by-point reconciliation with `docs/experiment.md`:
       - Did the perturbation achieve the predicted molecular impact on target abundance and pathway activity?
       - Were hypothesized cellular responses and compensatory pathways activated as anticipated?
       - What unexpected or unpredicted proteomic shifts emerged, and what novel biological mechanisms or alternative hypotheses do they suggest?
   - **Broader Biological & Therapeutic Implications**:
     - Contextualize results within disease mechanisms, cell biology, or therapeutic vulnerabilities.
   - **Study Limitations & Future Directions**:
     - Discuss experimental boundaries (e.g., steady-state protein abundance vs. turnover rates, lack of post-translational modification enrichment, single timepoint).
     - Propose concrete orthogonal validation experiments (e.g., targeted PRM/SRM assays, pulse-chase kinetics, immunoprecipitation, functional assays).

7. **Conclusions**:
   - Concise summary of core discoveries, validating the analytical workflow and defining the proteomic hallmark of the perturbation.

8. **Data & Artifact Availability**:
   - Explicit relative markdown links to all executable R scripts (`[01_data_quality.R](../code/01_data_quality.R)`, `[02_expression.R](../code/02_expression.R)`), logs (`../logs/*.log`), observation notes (`[observations.md](./observations.md)`), experiment hypothesis (`[experiment.md](./experiment.md)`), execution benchmark notes (`[notes.md](./notes.md)`), tables (`../data/table_proteins_*.csv`), and figures (`../data/*.png`).

---

#### Critical Constraints
- **Absolute Data Grounding**: Every numerical value ($\log_2\text{FC}$, $p$-value, $q$-value, protein count, pathway score) MUST strictly match `docs/observations.md` and the exported CSV tables. Never fabricate or hallucinate figures or statistical metrics.
- **Direct Literature Linking**: Discussions of biological function must weave in the literature findings, citations, and PMIDs/DOIs curated in `docs/observations.md` (or `agent/BIOLOGY.md`). When operating offline without active web search, cite studies by Author (Year) and verified citations from `agent/BIOLOGY.md`; never fabricate numerical PMIDs or DOIs.

---

#### Phase Completion Gate
- [ ] **Complete Phase**:
  - Invoke `complete_phase(phaseName = "04_SYNTHESIS", summary = "Publication-grade manuscript authored in docs/scientific_report.md with complete abstract, methods, verified quantitative findings, grounded discussion, and artifact links.")`