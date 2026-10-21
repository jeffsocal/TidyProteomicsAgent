<!-- 
======================================================================
USER SPECIFICATION FILE: MAINTAINED EXCLUSIVELY BY THE RESEARCHER.
AI AGENTS: DO NOT EDIT OR OVERWRITE THIS FILE. 
Record all runtime logs in docs/notes.md and findings across docs/ (observations.md, knowledge.md, websearch.md, literature.md).
======================================================================
-->

# Experiment & Dataset Specification

## 1. Input Dataset Parameters

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

<!-- 
ACTION REQUIRED: Please provide your scientific hypothesis and study design below.
Phase 0 (00_INSTALL.md) will verify that you have replaced this placeholder with your study details.
-->

[REQUIRED: Describe the experimental hypothesis, biological system, treatment conditions, control groups, and key biological questions to investigate.]
