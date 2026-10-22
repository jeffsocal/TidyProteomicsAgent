<!-- 
======================================================================
USER SPECIFICATION FILE: MAINTAINED EXCLUSIVELY BY THE RESEARCHER.
AI AGENTS: DO NOT EDIT OR OVERWRITE THIS FILE. 
Record all runtime logs in docs/notes.md and findings in docs/observations.md.
======================================================================
-->

# Experiment & Dataset Specification

## 1. Input Dataset Parameters

- **PATH_TO_DATA_FILE**: data/tidyproteomics_data.rds
- **PLATFORM**: FragPipe
- **ANALYTE**: proteins

## 2. Experimental Hypothesis & Study Design

This is study covers microtome FFPE samples of lung tissue taken from deceased individuals that had an identified mycobacterium tuberculosis infection, or where healthy. The samples cover necrotic leasons from infected individuals, and random samples from otherwise healthy individuals.

## 3. Sample Grouping, Recoding & Contrast Designations

### 3.A Discovered sample groups & Study Structure
ℹ️ [AUTO-GENERATED REFERENCE - READ ONLY]

- **Raw Acquisition Files**: 38 files
- **Discovered Biological Subjects**: 26 unique donors/subjects
- **Acquisition Batches**: 4 batches (`Batch_20240524`, `Batch6`, `Batch8`, `Batch9`)
- **Paired Donor Detection**: 5 biological subjects (`Sample21`, `Sample22`, `Sample23`, `Sample24`, `Sample25`) have matched samples in BOTH `active_necrotic_granuloma` and `healthy` groups.
- **Cross-Batch Bridge Samples**: 8 subjects (`Sample13`, `Sample14`, `Sample16`, `Sample21`, `Sample22`, `Sample23`, `Sample24`, `Sample25`) were acquired across multiple batches.
- **Technical Replicates / Cuts**: 6 subjects (`Sample13`, `Sample14`, `Sample16`, `Sample19a/b`, `Sample20a/b/c`, `Sample5a/b`) have multiple measurements within condition.

| Discovered sample group | Raw files | Unique subjects | Interpretation |
|---|---:|---:|---|
| `active_necrotic_granuloma` | 32 | 25 | TB-associated necrotic granuloma (batches 20240524, 6, 9) |
| `healthy` | 6 | 6 | Healthy lung (batch 8; 5 donors paired with granuloma) |

These sample/file heuristics distinguish independent biological subjects from technical cuts, identify donor pairing, and detect cross-batch bridge samples to eliminate pseudo-replication.

### 3.B Sample Group Renaming & Pooling Map
| Current sample label | Proposed clean biological label |
|---|---|
| `active_necrotic granuloma_batch5` | `active_necrotic_granuloma` |
| `active_necrotic granuloma_batch6` | `active_necrotic_granuloma` |
| `active_necrotic granuloma_batch9` | `active_necrotic_granuloma` |
| `healthy_healthy_batch8` | `healthy` |

- **Reassign Sample Names According to Pooling Map**: TRUE

### 3.C Target contrasts
`active_necrotic_granuloma` / `healthy`

### 3.D Batch-confounding pre-flight decision
The observed labels associate all healthy samples with batch 8 and TB-associated granuloma samples with batches 5, 6, and 9. Disease status and batch may therefore be confounded; batch 5 dominates the disease files, and batches 6 and 9 have only 3 and 1 files, respectively. Pooling the disease labels does not remove this potential confounding. Review acquisition/design records and determine whether a defensible disease effect can be separated from batch before differential expression.

- **Proceed With Potential Batch Confounding**: TRUE
