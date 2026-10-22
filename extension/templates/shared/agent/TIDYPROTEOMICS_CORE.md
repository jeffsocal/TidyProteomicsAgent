---
name: TIDYPROTEOMICS_CORE
description: Core architecture, opaque S3 data structure, non-negotiable rules, object inspection getters, and tidyverse conventions for tidyproteomics.
---

# tidyproteomics: Core Architecture & Golden Rules

`tidyproteomics` is an R package that introduces an S3 data object architecture and tidyverse-aligned pipeable framework for quantitative proteomics post-analysis.

---

## 1. Core Architecture & Philosophy

### Strict Data Encapsulation & Opaque Object Model
A `tidyproteomics` object is an **opaque, encapsulated S3 data structure**. It manages high-dimensional proteomics data, sample metadata, peptide/protein accounting, biological annotations, statistical analyses, and a complete audit trail across synchronized internal slots:
- `$data`: Raw/imported quantitative matrix.
- `$experiments`: Sample-to-replicate mapping and experimental design metadata.
- `$quantitative`: Normalized and imputed abundance matrices with analytical flags.
- `$accounting`: Identifications, peptide counts, and quantifiable fraction metrics.
- `$annotations`: Biological annotations (gene symbols, GO terms, Reactome pathways).
- `$analyses`: Completed statistical models (differential expressions, enrichments).
- `$operations`: Sequential, non-destructive audit trail of all transformations.

> [!CRITICAL]
> **Never modify internal object slots directly!**
> Do not execute `data$quantitative <- ...` or `data$data <- ...`. All transformations must be performed using canonical `tidyproteomics` functions (`subset()`, `normalize()`, `impute()`, `expression()`, `enrichment()`, `annotate()`). Modifying internal slots breaks object synchronization and corrupts downstream statistical models.

---

## 2. Non-Negotiable LLM Guidelines & Golden Rules

1. **Enforce `print(data)` for State Verification**:
   Always execute `print(data)` immediately after loading a dataset and after transformations. It outputs:
   - Origin platform, analyte type, file count, memory size, dynamic range, percent missingness.
   - Verified sample names (essential for contrast formulas).
   - Applied imputation algorithm (e.g., `*imputed via min`).
   - Active normalization selection (e.g., `*normalized loess`).
   - Loaded annotation categories.

2. **NEVER Call `ggsave()` on `plot_*()` Outputs**:
   - All `plot_*()` functions inherit built-in saving from `plot_save()` via `destination = c("png", "svg", "tiff", "jpeg", "save")`.
   - **Fatal Error**: Calling `ggsave()` on `data %>% plot_*(destination = "png")` causes a fatal error because saving mode writes the image file directly and returns the `tidyproteomics` **data object**, NOT a ggplot object.
   - Always save plots directly by specifying `destination = "png"` inside the `plot_*()` call itself.

3. **Capture `plot_*()` Pipelines to Prevent Console Flooding**:
   - Because `plot_*(..., destination = "png")` returns the `tidyproteomics` data object, an unassigned pipe interactively evaluates and prints the entire data object to stdout.
   - Always assign the output or wrap in `invisible(...)`:
     ```r
     invisible(data %>% plot_counts(destination = "png"))
     # or
     data <- data %>% plot_pca(destination = "png")
     ```

4. **Always Inspect Object History via `operations(data)`**:
   Run `operations(data)` to verify what normalizations, filters, or analyses have already been executed before chaining additional operations.

5. **Use `%like%` for Pattern Matching in Subsets**:
   When filtering annotations in `subset()`, use `description %like% "regex"` rather than `grepl()` inside base subset.

6. **Unquoted Ratio Notation for Contrasts**:
   When specifying comparisons in `expression()`, use unquoted ratio notation: `expression(treatment/control)`. The resulting `log2_foldchange` is calculated as $\log_2(\text{treatment}) - \log_2(\text{control})$.

---

## 3. Data Object Inspection Getters (`get_*()`)

All `get_*()` functions support `format = c("table", "vector")` (defaulting to `"table"`):
- Use `format = "table"` when inspecting the object interactively or presenting summaries.
- Use `format = "vector"` when passing getter outputs into programmatic checks, vector arguments, or string comparisons.

| Function | Default Output | Purpose |
| :--- | :--- | :--- |
| `get_sample_names(data)` | Character table/vector | Returns unique sample group names present in object. |
| `get_quant_names(data)` | Character table/vector | Returns available quantitative assays (e.g. `"raw"`, `"loess"`). |
| `get_analyses(data)` | Tibble of completed tests | Catalogs computed statistical analyses (`comparison`, `analysis`). |
| `get_accountings(data)` | Character table/vector | Returns available accounting columns (e.g. `"num_peptides"`). |
| `get_annotation_terms(data)` | Character table/vector | Lists loaded annotation categories (`"biological_process"`, etc.). |
| `get_annotations(data, term)`| Tibble of annotations | Filters identifiers and annotations for a specific category. |
| `get_variables(data)` | Character table/vector | Lists experimental variables present in sample metadata. |
| `operations(data)` | Operations history list | Displays the sequential audit trail of applied transformations. |
