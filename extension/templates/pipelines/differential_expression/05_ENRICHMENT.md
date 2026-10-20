### Phase 5: Functional Annotation Assessment & Pathway Enrichment

Construct and execute `code/05_enrichment.R`, capturing full execution output to `logs/05_enrichment.log` (e.g. `Rscript code/05_enrichment.R 2>&1 | tee logs/05_enrichment.log`). You must strictly enforce all checkpoints below.

---

#### Phase 5.1: Functional Annotation Assessment Gate & Remediation Guidance
- Load the differential expression dataset from Phase 4:
  ```r
  stat_data <- readRDS("data/tidyproteomics_data.rds")
  ```
- Extract and audit available functional annotation categories:
  ```r
  available_terms <- get_annotation_terms(stat_data)
  cat("=== AVAILABLE ANNOTATION CATEGORIES ===\n")
  print(available_terms)
  ```
- **Annotation Adequacy Assessment**:
  Functional pathway enrichment requires biological ontology terms (e.g., Gene Ontology terms like `biological_process`, `cellular_component`, `molecular_function`, or pathway categories like `reactome_pathway`, `wiki_pathway`, `kegg_pathway`).

  - **External Annotation Ingestion Check**:
    If an external annotation mapping table exists in `data/` (e.g., `data/annotations.csv` or `data/annotations.tsv`), merge it into the dataset prior to enrichment testing:
    ```r
    anno_file <- NULL
    if (file.exists("data/annotations.csv")) anno_file <- "data/annotations.csv"
    if (file.exists("data/annotations.tsv")) anno_file <- "data/annotations.tsv"

    if (!is.null(anno_file)) {
      cat(sprintf("Merging external annotations from %s...\n", anno_file))
      anno_df <- if (grepl("\\.tsv$", anno_file)) read.delim(anno_file) else read.csv(anno_file)
      stat_data <- stat_data %>% annotate(anno_df)
      available_terms <- get_annotation_terms(stat_data)
      cat("Updated annotation categories:\n")
      print(available_terms)
    }
    ```

  - **Inadequate Annotations Protocol**:
    If `available_terms` does not contain at least one biological ontology category:
    1. Log an explicit alert in stdout and `docs/notes.md`:
       > "⚠️ **Annotation Notice**: Dataset lacks functional ontologies (GO terms / Reactome / KEGG). Enrichment analysis requires biological annotations. Refer to the [TidyProteomics Annotation Guide](https://jeffsocal.github.io/tidyproteomics/articles/annotating.html) to download and supply an annotation file in `data/annotations.csv`."
    2. If no external annotation table is supplied, record in `docs/notes.md` that pathway enrichment was bypassed due to missing ontology terms, preserve `stat_data` to `data/tidyproteomics_data.rds`, and complete the phase so Phase 6 through Phase 10 can proceed based on biomarker observations.

#### Phase 5.2: Multi-Category Pathway Enrichment Testing
- If functional annotation terms are present, select targeted biological terms:
  ```r
  # Select biological categories (or all available terms if not using standard GO names):
  selected_terms <- intersect(
    available_terms,
    c("biological_process", "cellular_component", "molecular_function", "reactome_pathway", "wiki_pathway", "kegg_pathway")
  )
  if (length(selected_terms) == 0) {
    selected_terms <- available_terms
  }
  cat("Targeted enrichment categories:\n")
  print(selected_terms)
  ```
- Dynamically extract contrast pairs directly from completed Phase 4 expression analysis:
  ```r
  available_contrasts <- names(stat_data$analysis)
  cat(sprintf("Available contrasts for pathway enrichment: %s\n", paste(available_contrasts, collapse = ", ")))
  pairs <- lapply(strsplit(available_contrasts, "/"), function(x) c(x[1], x[2]))
  ```
- Execute non-parametric two-tailed Wilcoxon rank-sum enrichment across all targeted terms:
  ```r
  cores <- max(1, min(4, parallel::detectCores() - 1))
  cat(sprintf("Executing multi-category enrichment across %d contrast(s) using %d CPU core(s)...\n", length(pairs), cores))

  enriched_data <- stat_data %>%
    enrichment(.pairs = pairs, .terms = selected_terms, .method = "wilcoxon", .cpu_cores = cores)
  ```
- **Checkpoint 5.2**: Confirm that enrichment operations completed without errors and are recorded in `operations(enriched_data)`.

#### Phase 5.3: Automated Pathway Visualization & Exports
- Export composite enrichment plots and tables:
  ```r
  enriched_data %>%
    analyze_enrichments(significance_max = 0.05, top_n = 30)
  ```
  *(Generates `<analyte>_enrichment_<contrast>.png` and `table_<analyte>_enrichment_<contrast>.csv`).*

- Move generated enrichment assets into `data/`:
  ```r
  enr_assets <- list.files(pattern = "^(plot_|table_|.*_enrichment_).*(png|csv)$")
  for (f in enr_assets) {
    file.rename(f, file.path("data", f))
  }
  ```

#### Phase 5.4: Object Persistence & Blackboard Recording
- Persist the enriched dataset to disk:
  ```r
  saveRDS(enriched_data, file = "data/tidyproteomics_data.rds")
  ```
- Record the following directly into `docs/notes.md`:
  - Analyzed annotation categories (e.g. `biological_process`, `reactome_pathway`).
  - Total significant enriched terms ($q \le 0.05$) per category.
  - Leading enriched upregulated and downregulated biological pathways.

#### Phase 5.5: Checkpoint Verification & State Recording
- [ ] **Checkpoint 5.5**:
  1. `logs/05_enrichment.log` exists on disk with non-zero file size.
  2. `data/tidyproteomics_data.rds` exists on disk with non-zero file size.
  3. If functional terms were analyzed: enrichment tables (`data/table_*_enrichment_*.csv`) and enrichment plots (`data/*_enrichment_*.png`) exist in `data/` with non-zero file sizes.
  4. `docs/notes.md` contains the functional enrichment audit and summary.
- [ ] **Complete Phase**:
  - Invoke `complete_phase(phaseName = "05_ENRICHMENT", summary = "Functional annotation assessment and pathway enrichment completed. Tested targeted categories, exported enrichment tables and plots, and persisted data/tidyproteomics_data.rds.")`
