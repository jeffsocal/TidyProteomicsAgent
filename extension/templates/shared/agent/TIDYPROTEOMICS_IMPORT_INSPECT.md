---
name: TIDYPROTEOMICS_IMPORT_INSPECT
description: Raw proteomics data ingestion, platform support matrix, configuration file architecture, quality control summaries, and exploratory data visualizations.
---

# tidyproteomics: Data Ingestion & Exploratory Quality Inspection

This skill module covers importing raw quantitative mass spectrometry outputs, validating sample metadata, running quality control summaries, and generating initial exploratory plots.

---

## 1. Supported Formats & Data Platforms

`tidyproteomics` provides built-in parsers for major quantitative proteomics software packages, as well as an extensible regular-expression engine for custom flat tables (`.csv`, `.tsv`, `.xlsx`).

### Platform Support Matrix

| Platform | Analyte Level | Expected Input Files | Config File Name | Notes |
| :--- | :--- | :--- | :--- | :--- |
| **ProteomeDiscoverer** | `proteins`, `peptides` | `*_Proteins.txt`, `*_Peptides.txt` | `ProteomeDiscoverer_proteins.csv` | Standard tabular exports |
| **MaxQuant** | `proteins`, `peptides` | `proteinGroups.txt`, `evidence.txt` | `MaxQuant_proteins.csv` | Supports razor & unique peptides |
| **FragPipe** | `proteins`, `peptides` | `combined_protein.tsv`, `combined_peptide.tsv` | `FragPipe_proteins.csv` | Supports Philosopher/MSFragger exports |
| **DIA-NN** | `peptides`, `precursors` | `report.tsv` | `DIA-NN_peptides.csv` | DIA quantitative matrices |
| **Skyline** | `peptides`, `transitions` | Custom CSV report | `Skyline_peptides.csv` | Targeted PRM/SRM workflows |
| **mzTab** | `proteins`, `peptides` | `*.mzTab` | Built-in HUPO-PSI parser | Standard open format |
| **Custom / Flat CSV** | `proteins`, `peptides` | `*.csv`, `*.tsv`, `*.xlsx` | Custom generated config | Requires column mapping table |

---

## 2. Configuration File Architecture & Match-Between-Runs

### Configuration Tables
`tidyproteomics` maps external column headers to its internal schema using configuration tables:
```r
# Export a default config to the local working directory to inspect or edit
export_config("FragPipe", "proteins")

# Import data using a modified custom configuration table
data <- import(files = "my_data.tsv", platform = "FragPipe", analyte = "proteins", path = "custom_config.csv")
```

### Match-Between-Runs (MBR) Filtering
If an upstream search tool used match-between-runs (e.g. MaxQuant or FragPipe), MBR flags can be screened or filtered:
```r
# Filter out observations identified solely by match-between-runs
data_mbr_filtered <- data %>% subset(match_between_runs == FALSE)
```

---

## 3. Data Import Syntax

```r
library(tidyproteomics)
library(dplyr)

# Ingest raw quantitative dataset
data <- import(
  files = "path/to/data.tsv",
  platform = "FragPipe",    # e.g., "FragPipe", "MaxQuant", "ProteomeDiscoverer", "DIA-NN"
  analyte = "proteins"     # "proteins" or "peptides"
)

# Verify loaded object state
print(data)
```

---

## 4. Quality Control & Inspection Summaries

### `summary()` S3 Method
The `summary()` method provides comprehensive quality checks across distinct analytical axes:

- **Global Data Quality Check (`summary(data)`)**:
  Reports total proteins, peptides, peptides per protein, quantifiable fraction, median CV, and PCA dimensionality (PC1 and PC2 variance explained).

- **Sample-Level Quality Check (`summary(data, "sample")`)**:
  Reports per-sample identifications, quantifiable fraction, replicate CV, and PCA coordinates (PC1, PC2) to spot outlier injections or sample loading inconsistencies:
  ```r
  summary(data, "sample")
  ```

- **Contamination Screening (`summary(data, contamination = 'CRAP')`)**:
  Screens for common mass spectrometry contaminants against a regular expression pattern (e.g., `'CRAP'`, `'Keratin'`, `'Trypsin'`, `'BSA'`).
  > [!CRITICAL]
  > **Always Use Named Argument `contamination = 'CRAP'`**
  > Always write `summary(data, contamination = 'CRAP')`. **Never write `summary(data, "contamination")`**! Passing `"contamination"` positionally sets `by = "contamination"`, which causes `tidyproteomics` to look for a non-existent column named `"contamination"` and returns `NULL`.

---

## 5. Exploratory Data Visualization

All visualization functions save images directly to disk when `destination = "png"` (or `"svg"`, `"tiff"`) is provided. Always assign the pipeline or wrap in `invisible()`:

```r
# 1. Identification counts across replicates
invisible(data %>% plot_counts(destination = "png"))

# 2. Dynamic range of protein abundance
invisible(data %>% plot_dynamic_range(destination = "png"))

# 3. Qualitative Venn / Euler overlap across conditions
invisible(data %>% plot_venn(destination = "png"))
# or for proportional Euler diagrams:
invisible(data %>% plot_euler(destination = "png"))

# 4. Concatenate multiple exploratory plots in a single pipeline:
data <- data %>%
  plot_counts(destination = "png") %>%
  plot_quantitation(destination = "png")
```

---

## 6. Peptide-to-Protein Collapsing

For peptide-level datasets that need to be aggregated to protein-level abundance:
```r
proteins <- data %>%
  collapse(
    collapse_to = "protein",
    assign_by = "razor-global",  # "razor-global", "unique", or "all"
    fasta_path = "uniprot_human.fasta",
    .function = fsum            # Use fast fsum or fmedian
  )

# Verify sequence coverage and protein representation
invisible(proteins %>% plot_protein_coverage(destination = "png"))
```
