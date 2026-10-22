---
skills:
  - TIDYPROTEOMICS_CORE
---

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
1. Core prerequisite documents in `docs/` exist and are non-empty:
   - `docs/observations.md` (contains extracted primary data-derived observations)
   - `docs/knowledge.md` (contains first-layer internal knowledge conclusions)
   - `docs/websearch.md` (contains second-layer web search corroborations)
   - `docs/literature.md` (contains third-layer literature database interrogation)
   - `data/tidyproteomics_data.rds` (persisted tidyproteomics dataset object)
2. Execution logs exist in `logs/` for all phases executed in the active pipeline:
   - Inspect `logs/` or `docs/notes.md` to confirm clean runs for whichever pipeline phases were executed (e.g. `logs/<phase>/console.log` or `logs/<phase>.log`, such as `logs/00_install/console.log`, `logs/01_inspect/console.log`, `logs/06_observations/console.log`, and any follow-up inquiry logs in `logs/07_*`, `logs/08_*`, `logs/09_*`).
   - **Pre-Processed / Custom Pipeline Flexibility**: If the dataset was pre-normalized, imputed, or had differential expression and enrichment executed prior to ingestion (or if upstream phases such as `02_NORMALIZE` through `05_ENRICHMENT` were omitted or deleted), upstream logs (`logs/02_*` to `logs/05_*`) are **NOT required**. Confirm that quantitative data and statistical results are present in `data/tidyproteomics_data.rds` and documented in `docs/observations.md`.
3. Quantitative tables and figure validation:
   - Verify that any quantitative tables (`data/table_*_*.csv`) and plots (`data/*.png`) that you reference or embed in the manuscript exist on disk with non-zero file sizes.
   - **Handling Visuals & Missing Plots**: Only embed images (`![...](../data/<filename>.png)`) and link tables that confirmedly exist on disk in `data/`. If specific diagnostic or summary plots (e.g., volcano plot, PCA score plot, expression profiles, pathway enrichment) were not generated in earlier phases:
     - *Option A (Render Missing Plots)*: If desired, execute a brief R script (e.g., `code/10_plots.R`) using `tidyproteomics` on `data/tidyproteomics_data.rds` to render and save missing plots into `data/`.
     - *Option B (Table & Narrative Presentation)*: Present the quantitative findings using structured Markdown tables and narrative descriptions based on `docs/observations.md`, omitting markdown image tags for missing files to avoid broken image links.
*Do NOT fail this phase simply because upstream processing phases (such as normalization or imputation benchmarking) were omitted or performed externally, provided that `docs/observations.md`, downstream layer documents, and `data/tidyproteomics_data.rds` are available.*

---

#### Phase 10.1: Generation of Hypothesis-Driven Discussion Figures
Before authoring `docs/scientific_report.md`, write and execute `code/10_discussion_figures.R` (saving logs to `logs/10_synthesis/console.log` via `mkdir -p logs/10_synthesis && Rscript code/10_discussion_figures.R 2>&1 | tee logs/10_synthesis/console.log`) to generate 2 to 4 publication-grade figures in `data/` specifically designed to accompany the Discussion themes:

1. **Focused Biological Module Mini-Heatmap or Grouped Boxplot (`plot_discussion_module_*.png`):**
   - Per-sample abundance profiles for coordinated multi-protein hubs identified across Phases 7–9 (e.g., humoral/complement activation: `MZB1`, `IGLC3`, `CFD`, `C1QA/B/C`).
2. **Contrasting / Opposing Biological Program Plot (`plot_discussion_dichotomy_*.png`):**
   - Directly contrast opposing cellular or structural programs (e.g., extracellular matrix synthesis/assembly `PCOLCE`, `MFAP2` vs. basement membrane loss `LAMA3`, `LAMB3`, `LAMC2`).
3. **Literature Candidate Validation & Concordance Forest Plot (`plot_discussion_literature_forest.png`):**
   - A dot plot or forest plot showing $\log_2\text{FC}$ and 95% confidence intervals for external candidates nominated in `docs/literature.md`, visually separating candidates that validated in tissue from discordant or sub-threshold markers (`S100A8/A9`, `LTA4H`, `COL15A1`, `MMP2`).
4. **Data Integrity & Imputation Diagnostic Plot (`plot_discussion_imputation_diagnostic.png`):**
   - For leading or unexpected outlier candidates (e.g., `SYN1`, `HBG2`), render per-sample jitter/strip plots distinguishing observed vs. imputed values to visually clarify whether fold changes reflect continuous biological regulation or on/off detection limits.

```r
# Example structure in code/10_discussion_figures.R:
suppressPackageStartupMessages({
  library(tidyproteomics)
  library(dplyr)
  library(ggplot2)
})
data <- readRDS("data/tidyproteomics_data.rds")
expr <- readr::read_csv(list.files("data", pattern = "^table_.*_expression_.*\\.csv$", full.names = TRUE)[1], show_col_types = FALSE)

# Generate theme plots using ggplot2 or tidyproteomics plotting utilities...
# Save all figures to data/plot_discussion_<theme>.png
```

---

#### Phase 10.2: Manuscript Structure & Authoring Guidelines

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
   - **Data Provenance & Experimental Design**: Raw data origin OR pre-processed `tidyproteomics` dataset origin, sample groups (treatment vs. control), replication scheme, and mass spectrometry platform as documented in `docs/experiment.md` and object metadata.
   - **Quality Filtering**: Removal of common contaminants (cRAP, Trypsin) and peptide confidence thresholds if applicable (`num_unique_peptides >= 2`).
   - **Normalization & Missingness Handling**:
     - *If benchmarked in-pipeline*: Evaluation of candidate algorithms (`median`, `linear`, `loess`, `limma`), selection criteria via CV/PC1 metrics, demonstration of replicate CV reduction, and missingness imputation rationale.
     - *If pre-processed externally*: Document the normalization and imputation provenance as stated in `docs/experiment.md` or data object attributes (e.g., "The dataset was expertly normalized and imputed prior to analytical ingestion into TidyProteomicsAgent...").
   - **Differential Expression Analysis**: Linear modeling with empirical Bayes moderation (`limma` framework), statistical significance thresholds ($|\log_2\text{FC}| \ge 1.0$, adjusted $p \le 0.05$). Note whether executed in-pipeline or extracted from the pre-computed analysis slot of the `tidyproteomics` object.
   - **Multi-Category Functional Enrichment**: Non-parametric two-tailed Wilcoxon rank-sum testing across biological annotation domains (e.g., GO Biological Process, Cellular Component, Molecular Function, Reactome pathways), noting whether computed in-pipeline or extracted from the pre-computed dataset object.
   - **Literature Database Interrogation & Sub-Threshold Modeling**: Graph-hop assertion query methodology and unthresholded reverse-interrogation statistical parameters.

5. **Results** (Clear narrative with embedded figures, statistics, and markdown tables):
   - **Data Quality & Cohort Diagnostics**:
     - Evaluation of identification counts across replicates (`![Identification Counts](../data/plot_<analyte>_counts.png)` if available).
     - Qualitative binary switch and feature overlap profile (`![Feature Overlap](../data/plot_<analyte>_venn.png)` or `![Feature Overlap](../data/plot_<analyte>_euler.png)` if available).
     - Benchmarking of quantitative reproducibility across normalization candidates (`![Variation CV](../data/plot_<analyte>_normalizated_variation.png)` if pipeline-benchmarked).
     - Unsupervised multivariate clustering demonstrating replicate reproducibility and group separation (`![PCA Score Plot](../data/plot_<analyte>_<norm>_pca_PC1PC2.png)` and `![Sample Clustering Heatmap](../data/plot_<analyte>_<norm>_heatmap.png)` if available).
   - **Target Verification / Primary Biomarker Metrics**:
     - Rigorous confirmation of target perturbation efficiency (if targeted) or leading master regulator / biomarker hub statistics from `docs/observations.md` (Gene name / Accession, $\log_2\text{FC}$, $p$-value, $q$-value, % change).
     - Dedicated candidate visual profile for investigated target: `![Target Expression Profile](../data/plot_expression_target_<target>_<contrast>.png)` (if available).
   - **Global Proteome Remodeling & Differential Expression**:
     - Global shift metrics: total quantified features, significantly upregulated, and significantly downregulated features per contrast.
     - Global landscape visualization: `![Volcano Plot](../data/<analyte>_volcano_<contrast>.png)` (if available on disk; otherwise summarize via table).
     - Formatted markdown tables of Top 10 Upregulated, Top 10 Downregulated, and Top Volcano $\pi$-Score Biomarkers (Rank, Identifier / Gene Symbol, Description, $\log_2\text{FC}$, $q$-value, Imputation Risk [`HIGH`, `MODERATE`, `LOW`], $\pi$-score, Primary Biological Function). Statistical columns ($p$-value, $q$-value) smaller than $1 \times 10^{-4}$ MUST be formatted in scientific notation (e.g. `3.99e-10` rather than `0.0000000` or `0.0e+00`). Sanitize delimiter strings (avoid `;;`) and provide fallbacks for unmapped gene symbols (avoid `NA`). Distinguish continuous quantitative shifts from limit-of-detection presence/absence shifts.
     - Visual expression profiles of leading candidates: `![Top Upregulated](../data/plot_expression_up_<contrast>.png)` and `![Top Downregulated](../data/plot_expression_down_<contrast>.png)` (if available).
     - Dedicated visual expression profiles of agent-curated candidate subsets / complexes: `![Curated Candidate Profiles](../data/plot_expression_curated_<contrast>.png)` (if available).
     - Cross-contrast comparative scatter plot: `![Comparative Expression](../data/plot_compexp_<contrastA>_vs_<contrastB>.png)` (if multi-contrast experiment evaluated).
   - **Functional & Pathway Enrichment Landscape**:
     - Summary of enriched biological processes, cellular compartments, and molecular pathways, highlighting leading-edge driver proteins.
     - Visual representation: `![Pathway Enrichment](../data/<analyte>_enrichment_<contrast>.png)` (if available on disk).
     - Structured markdown table summarizing significant enriched pathways across annotation categories (Domain, Term Name, Direction, Rank Statistic / Score, $q$-value, Leading Driver Proteins [top 3–5 member gene symbols], Leading-Edge Count). Always report human-readable pathway names (e.g. resolve bare Reactome accessions like `R-HSA-977606` to *"Regulation of Complement cascade"*; do not display `"identifier unresolved in export"`), and format $q$-values in scientific notation.
     - **Leading-Edge Protein Citations**: When describing enriched pathway themes in text, explicitly cite the specific quantified member proteins driving the enrichment (e.g., citing *C8A, C8B, C9, CFH* when discussing complement cascade activation, or *COL1A1, COL1A2, FN1* when discussing ECM remodeling).
   - **Synthesized Biomarker Panel Heatmap**:
     - Visual representation of the prioritized biological signature across all replicates: `![Synthesis Biomarker Heatmap](../data/plot_<analyte>_synthesis_heatmap.png)` (if generated).
   - **Targeted Hypothesis Inquiries & Sub-Threshold Complex Shifts**:
     - Results of follow-up inquiries conducted across Phases 7, 8, and 9 (from `docs/knowledge.md`, `docs/websearch.md`, and `docs/literature.md`), including coordinate shifts in unthresholded complex members.

6. **Discussion** (Concise, robust biological interpretation synthesizing all three layers of conclusions):
   - **Discussion Authoring Constraints (Data vs. Literature Balance)**:
     - **The 70/30 Evidentiary Rule**: At least **70% of the Discussion narrative** must focus on interpreting the primary empirical data: the dataset's strongest altered proteins, verified pathway enrichments, discordant structural processes, and sample-level distributions. At most **30% of the Discussion narrative** should contextualize these findings using external literature and surrogate biofluid models.
     - **Mandatory Top-Candidate Accounting**: Every candidate in the dataset's Top 5 Upregulated and Top 5 Downregulated tables MUST be explicitly addressed and mechanistically evaluated in the Discussion.
     - **External Paper Topic Hijacking Prohibition**: External literature must be used solely to *benchmark* or *contrast* the empirical findings. Do NOT organize Discussion subsections around external candidate panels or genes that failed to demonstrate significant differential abundance in this dataset. When discussing surrogate studies (e.g., plasma proteomics), explicitly frame them as a contrast to tissue biology (e.g., "While circulating plasma panels prioritize X and Y, bulk lesion tissue demonstrates that the local pathology is instead dominated by Z...").
   - **Mandatory Discussion Figure Embedding**: The discussion MUST NOT be a pure narrative text block. Each major theme subsection must embed and discuss at least one of the hypothesis-driven discussion figures generated in Phase 10.1 (e.g. `![Biological Module](../data/plot_discussion_module_<theme>.png)` or `![Program Dichotomy](../data/plot_discussion_dichotomy_<theme>.png)`).
   - **Mechanistic Dissection of Primary vs. Secondary Effects**:
     - Differentiate direct interactors, target alterations, or primary disease drivers from downstream secondary stress or compensatory cascades (drawing from `docs/observations.md` and `docs/knowledge.md`).
     - Evaluate accumulation or depletion of pathway clients, stress-responsive chaperones, and cellular response systems.
     - Cite specific driving member proteins from functional pathways when discussing coordinated biological responses.
     - Embed focused biological module mini-heatmap or grouped boxplot: `![Focused Biological Module](../data/plot_discussion_module_<theme>.png)`.
   - **Literature Database Integration & Sub-Threshold Dynamics**:
     - Synthesize candidate cofactors, interactors, or substrates identified through DuckDB literature database graph-hops and web searches (drawing from `docs/websearch.md` and `docs/literature.md`).
     - Explicitly cite supporting study IDs (or DOIs) and verbatim evidence quotes curated in `docs/literature.md`.
     - Discuss coordinate sub-threshold regulation of complexes that missed strict volcano plot thresholds but show concordant directional shifts.
     - Embed literature validation forest / concordance plot: `![Literature Validation Forest Plot](../data/plot_discussion_literature_forest.png)`.
   - **Pathological & Cellular Cascades & Opposing Programs**:
     - Connect specific altered features to known cellular programs (e.g., organelle stress responses, metabolic shifts, structural dynamics, or cell division checkpoints).
     - Directly contrast opposing cellular or structural programs with embedded visual comparison: `![Opposing Biological Programs](../data/plot_discussion_dichotomy_<theme>.png)`.
   - **Data Integrity, Missingness & Limit-of-Detection Assessment**:
     - Explicitly evaluate whether unexpected biomarker shifts (e.g., `SYN1`, `HBG2`) reflect true continuous regulation or on/off limit-of-detection artifacts based on imputation proportions and the diagnostic strip/jitter plot: `![Imputation Diagnostic](../data/plot_discussion_imputation_diagnostic.png)`.
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
   - Explicit relative markdown links to all executable R scripts actually present in `code/` (e.g. `[00_install.R](../code/00_install.R)`, `[01_inspect.R](../code/01_inspect.R)`, `[06_observations.R](../code/06_observations.R)`, `[10_discussion_figures.R](../code/10_discussion_figures.R)`), all available phase logs in `logs/` (e.g. `[01_inspect/console.log](../logs/01_inspect/console.log)`, `[10_synthesis/console.log](../logs/10_synthesis/console.log)`, and `[pipeline.md](../logs/pipeline.md)`), documentation files (`[observations.md](./observations.md)`, `[knowledge.md](./knowledge.md)`, `[websearch.md](./websearch.md)`, `[literature.md](./literature.md)`, `[experiment.md](./experiment.md)`, `[notes.md](./notes.md)`), tables (`../data/table_*_*.csv`), standard figures (`../data/*.png`), and discussion figures (`../data/plot_discussion_*.png`).
   - *Note*: Dynamically inspect `code/` and `logs/` to link existing files; do not include dead links to omitted or deleted phases.

---

#### Critical Constraints
- **Absolute Data Grounding**: Every numerical value ($\log_2\text{FC}$, $p$-value, $q$-value, feature count, pathway score) MUST strictly match `docs/observations.md` and the exported CSV tables. Never fabricate or hallucinate figures or statistical metrics.
- **Direct Literature Linking**: Discussions of biological function must weave in the literature findings, citations, and PMIDs/DOIs/Study IDs curated across `docs/*`. Always reference verbatim quotes from `docs/literature.md` when interpreting literature-derived complex members.

---

#### Phase Completion Gate
- [ ] **Checkpoint Gate**:
  1. `code/10_discussion_figures.R` executed with status code 0 and output logged to `logs/10_synthesis/console.log` (or `logs/10_synthesis.log`).
  2. 2 to 4 hypothesis-driven discussion figures (`data/plot_discussion_*.png`) exist on disk with non-zero file sizes.
  3. `docs/scientific_report.md` exists on disk with non-zero file size, contains complete Results and Discussion sections, and embeds both Results figures and Discussion figures (`data/plot_discussion_*.png`).
- [ ] **Complete Phase**:
  - Invoke `complete_phase(phaseName = "10_SYNTHESIS", summary = "Publication-grade manuscript authored in docs/scientific_report.md with complete abstract, methods, verified quantitative findings, embedded hypothesis-driven discussion figures, multi-layered grounded discussion, and artifact links.")`
