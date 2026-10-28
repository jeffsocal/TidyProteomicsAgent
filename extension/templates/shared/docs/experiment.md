<!-- 
======================================================================
USER SPECIFICATION & INTERACTION FILE:
- Sections 1 & 2: MAINTAINED EXCLUSIVELY BY THE RESEARCHER.
  AI Agents: Do not edit, delete, or overwrite the researcher's hypotheses or dataset parameters.
- Section 3: COLLABORATIVE INTERACTION & SCAFFOLDING AREA.
  AI Agents: You are authorized and instructed to append/update Section 3 with discovered 
  sample groups, proposed sample pooling/recoding tables, and suggested contrast pairs for user review.
======================================================================
-->

# Experiment & Dataset Specification

## 1. Input Dataset Parameters
👉 [USER ACTION REQUIRED - CONFIGURE DATASET PARAMETERS]:

<!-- 
ACTION REQUIRED: Specify the dataset location, mass spectrometry search platform, and analyte.
Phase 0 (00_INSTALL.md) will verify that you have replaced the placeholders below with valid values.
-->

- **PATH_TO_DATA_FILE**: [REQUIRED: Enter URL or relative path to data file, e.g. data/raw/ProteomeDiscoverer_2.5_proteins.xlsx or data/raw/tidyproteomics_data.rds]
- **PLATFORM**: [REQUIRED: Enter search platform (e.g. ProteomeDiscoverer, MaxQuant, DIA-NN, Spectronaut, FragPipe) or 'tidyproteomics' / 'rds' if providing an existing pre-processed R data object]
- **ANALYTE**: [REQUIRED: proteins or peptides (or inherited automatically from object if using a pre-processed tidyproteomics RDS)]

> **Note on PATH_TO_DATA_FILE**:
> - If `PATH_TO_DATA_FILE` is an HTTPS/HTTP URL, R's `tidyproteomics::import()` requires a local file path. Phase 1 (`01_INSPECT.md`) automatically stages the file by downloading it into `data/raw/` prior to importing. If specifying a local dataset, provide the relative or absolute filesystem path.
> - **Pre-Processed R Objects (.rds)**: If `PATH_TO_DATA_FILE` is an `.rds` file (or `PLATFORM` is `tidyproteomics` or `rds`), Phase 1 (`01_INSPECT.md`) automatically ingests the object via `readRDS()`, audits the `operations()` trail and available quantitative layers (`get_quant_names()`), and configures downstream phases (Phase 2 Normalization and Phase 3 Imputation) to run in verification/pass-through mode to preserve upstream transformations without double-scaling.

## 2. Experimental Hypothesis & Study Design
👉 [USER ACTION REQUIRED - DESCRIBE STUDY & HYPOTHESIS]:

<!-- 
ACTION REQUIRED: Please provide your scientific hypothesis and study design below.
Phase 0 (00_INSTALL.md) will verify that you have replaced this placeholder with your study details.
-->

[REQUIRED: Describe the experimental hypothesis, biological system, treatment conditions, control groups, and key biological questions to investigate.]

## 3. Sample Grouping, Recoding & Contrast Designations

<!-- 
COLLABORATIVE INTERACTION SECTION:
Phase 1 (01_INSPECT) will inspect the ingested dataset and scaffold the discovered sample groups below.
If raw sample names contain technical batch suffixes (e.g. _batch5, _run1) or need pooling into clean biological
groups, you (or the agent) can specify the recoding map below. Phase 2 (2.1b) and Phase 4 will automatically apply this mapping prior to normalization benchmarking, PCA/CV variation analysis, within-group imputation, and differential expression.
-->

### A. Discovered Sample Groups in Dataset:
ℹ️ [AUTO-GENERATED REFERENCE - READ ONLY]:
<!-- Populated automatically during Phase 1 inspection -->
- *(Pending Phase 1 data ingestion)*

### B. Sample Group Renaming & Pooling Map (Optional):
👉 [USER REVIEW & EDIT TABLE]:
<!-- Define mappings to merge batch-specific or replicate samples into unified biological groups.
     Example:
     | Raw Sample Group | Cleaned Group Name |
     | :--- | :--- |
     | active_necrotic granuloma_batch5 | active necrotic granuloma |
     | active_necrotic granuloma_batch6 | active necrotic granuloma |
     | active_necrotic granuloma_batch9 | active necrotic granuloma |
     | healthy_healthy_batch8 | healthy |
-->
| Raw Sample Group | Cleaned Group Name |
| :--- | :--- |

👉 [USER TOGGLE]:
- **Reassign Sample Names According to Pooling Map**: TRUE
<!-- 
     What TRUE / FALSE means for your analysis:
     - TRUE:  Phase 2 (2.1b) and Phase 4 will apply the mapping table above to reassign and pool sample group names 
              in the dataset (e.g. merging 'lesion_batch2' and 'lesion_batch5' into 'lesion') 
              before normalization benchmarking, replicate CV/PCA plotting, within-condition imputation, and differential expression.
     - FALSE: Phases 2–4 will ignore the table above and retain raw sample group names as originally ingested.
     NOTE: This value must strictly remain TRUE or FALSE without appending conversational text.
-->

### C. Target Contrasts:
👉 [USER ACTION REQUIRED - DEFINE TARGET CONTRASTS]:
<!-- Specify pairwise comparisons between active group names (e.g. 'active necrotic granuloma' vs 'healthy'):
- Contrast: <treatment> vs <control>
-->

### D. Confounded Batch & Exploratory Comparison Authorization:
⚠️ [PRE-FLIGHT GATE DECISION]:
<!-- 
     Why this setting exists:
     When disease/treatment cohorts are completely separated across technical batches (e.g., all healthy 
     samples were processed in batch 8, while all lesion samples were processed in batches 5, 6, and 9), 
     technical batch effects cannot be mathematically adjusted or separated from biological condition in 
     linear models because batch and condition are collinear.

     What TRUE / FALSE means for your analysis:
     - TRUE:  Proceed with the exploratory comparison between cohorts despite potential batch confounding,
              documenting in report notes that observed differences may reflect technical batch variation 
              alongside true biology.
     - FALSE: Halt Phase 4 before computing linear models, requiring researcher review to reconfigure contrasts 
              or cohort comparisons.
     NOTE: This value must strictly remain TRUE or FALSE without appending conversational text.
-->
- **Proceed With Potential Batch Confounding**: FALSE

### E. Missing Value Imputation Strategy:
👉 [USER ACTION REQUIRED - CONFIRM IMPUTATION METHOD]:
<!-- 
     Why this setting exists:
     Per Karpievitch et al. (BMC Bioinformatics 13 Suppl 16, S5, 2012), Random Forest imputation 
     (impute.randomforest, method = "matrix", group_by_sample = TRUE) excels at imputing sporadic 
     Missing At Random (MAR) values without distorting within-group variance, EXCEPT when missingness 
     is Missing Not At Random (MNAR) due to intentional gene knockout/knockdown, targeted suppression, 
     or condition-exclusive on/off switches, where column-wise minimum Limit-of-Detection imputation 
     (base::min, method = "column") is unbiased and retains condition-exclusive proteins in linear modeling.

     Allowed Imputation Method values:
     - randomforest_grouped : impute.randomforest, method = "matrix", group_by_sample = TRUE (Default for general/MAR profiling)
     - min_column           : base::min, method = "column" (Recommended for intentional knockouts, suppressions, or MNAR on/off switches)
     - min_row_grouped      : base::min, method = "row", group_by_sample = TRUE (Within-condition row minimum only)
     - none                 : Bypass imputation (for complete-case datasets with 0% missingness)
     NOTE: Keep Imputation Method and Confirm Imputation Strategy as clean values without appending conversational text.
-->
- **Imputation Method**: randomforest_grouped
- **Confirm Imputation Strategy**: FALSE


