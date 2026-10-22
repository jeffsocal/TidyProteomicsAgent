### Phase 5: Functional Annotation Assessment & Pathway Enrichment

Construct and execute `code/05_enrichment.R`, capturing full execution output to `logs/05_enrichment/console.log` (e.g. `mkdir -p logs/05_enrichment && Rscript code/05_enrichment.R 2>&1 | tee logs/05_enrichment/console.log`). You must strictly enforce all checkpoints below.

---

#### Phase 5.1: Functional Annotation Assessment Gate & Remediation Guidance
- Load the differential expression dataset from Phase 4:
  ```r
  stat_data <- readRDS("data/tidyproteomics_data.rds")
  ```

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
  }
  ```

- Extract and audit available functional annotation categories:
  ```r
  available_terms <- get_annotation_terms(stat_data, format = "vector")
  cat("=== AVAILABLE ANNOTATION CATEGORIES ===\n")
  print(get_annotation_terms(stat_data, format = "table"))
  ```

- **Robust Dynamic Term Discovery**:
  Different search engines and annotation pipelines produce different naming conventions for ontology terms:
  - UniProt / standard: `biological_process`, `cellular_component`, `molecular_function`, `reactome_pathway`, `wiki_pathway`, `kegg_pathway`
  - FragPipe: `gene_ontology_biological_process`, `gene_ontology_cellular_component`, `gene_ontology_molecular_function`, `reactome`, `kegg`, `pathway`
  - Other sources: `subcellular_location`, etc.

  **Do NOT use strict exact-string vector intersections** like `intersect(available_terms, c("biological_process", ...))`, which fail on prefixed headers. Instead, apply robust regex-based matching:
  ```r
  # Exclude identifier/metadata columns that are not functional ontologies:
  non_functional <- c("protein", "protein_name", "gene_name", "organism", "description", "num_peptides", "num_unique_peptides")
  candidate_terms <- setdiff(available_terms, non_functional)

  # Target biological ontology categories via case-insensitive pattern matching:
  ontology_patterns <- "biological_process|cellular_component|molecular_function|reactome|kegg|pathway|wiki_pathway|gene_ontology|subcellular"
  selected_terms <- candidate_terms[grepl(ontology_patterns, candidate_terms, ignore.case = TRUE)]

  # If no pattern matches but other candidate annotations exist, use them as fallback:
  if (length(selected_terms) == 0 && length(candidate_terms) > 0) {
    selected_terms <- candidate_terms
  }

  cat("Selected enrichment categories:\n")
  print(selected_terms)
  ```

- **Annotation Adequacy & Inadequate Annotations Protocol**:
  Functional pathway enrichment requires biological ontology terms or candidate annotations (`length(selected_terms) > 0`).

  **If `length(selected_terms) == 0` (no biological ontology categories or candidate annotations exist)**:
  1. Log an explicit alert in stdout and `docs/notes.md`:
     > "⚠️ **Annotation Notice**: Dataset lacks functional ontologies (GO terms / Reactome / KEGG). Enrichment analysis requires biological annotations. Refer to the [TidyProteomics Annotation Guide](https://jeffsocal.github.io/tidyproteomics/articles/annotating.html) to download and supply an annotation file in `data/annotations.csv`."
  2. **CRITICAL AUTONOMOUS CONTINUATION MANDATE (DO NOT HALT)**:
     - **NEVER halt execution, stop calling tools, or exit the script with an error or prompt asking the user for instructions.** The agent loop must run completely autonomously.
     - Record in `docs/notes.md` that pathway enrichment was bypassed due to missing ontology terms.
     - Preserve `stat_data` to `data/tidyproteomics_data.rds`.
     - Ensure `code/05_enrichment.R` exits cleanly (exit code 0).
     - **Always invoke `complete_phase(phaseName = "05_ENRICHMENT", summary = "Pathway enrichment bypassed due to absence of biological ontology annotations; data preserved.")`** so the pipeline autonomously advances to Phase 6 through Phase 10 based on primary biomarker observations.

#### Phase 5.2: Multi-Category Pathway Enrichment Testing
- Dynamically extract contrast pairs directly from completed Phase 4 expression analysis:
  ```r
  completed_analyses <- get_analyses(stat_data)
  available_contrasts <- unique(completed_analyses$comparison[completed_analyses$analysis == "expression"])
  if (length(available_contrasts) == 0) {
    # Fallback to comparison names if analysis column differs
    available_contrasts <- unique(completed_analyses$comparison)
  }
  cat(sprintf("Available contrasts for pathway enrichment: %s\n", paste(available_contrasts, collapse = ", ")))
  pairs <- lapply(strsplit(available_contrasts, "/"), function(x) c(x[1], x[2]))
  ```

- Check if pathway enrichment has already been computed in upstream operations or execute enrichment on `selected_terms`:
  ```r
  ops <- operations(stat_data)
  already_enriched <- any(grepl("enrichment", ops))

  if (already_enriched) {
    cat("Pre-existing pathway enrichment results detected in tidyproteomics object history. Preserving upstream enrichment calculations.\n")
    enriched_data <- stat_data
  } else if (length(selected_terms) > 0) {
    cores <- max(1, min(4, parallel::detectCores() - 1))
    cat(sprintf("Executing multi-category enrichment across %d contrast(s) using %d CPU core(s)...\n", length(pairs), cores))

    enriched_data <- stat_data %>%
      enrichment(.pairs = pairs, .terms = selected_terms, .method = "wilcoxon", .cpu_cores = cores)
  } else {
    cat("No functional ontology terms available for enrichment analysis. Bypassing pathway enrichment and preserving differential expression data.\n")
    enriched_data <- stat_data
  }
  ```

- **Checkpoint 5.2**: Confirm that enrichment operations are recorded in `operations(enriched_data)` (or if bypassed, that differential expression operations are confirmed).

#### Phase 5.3: Automated Pathway Visualization & Exports
- If pathway enrichment was computed (`length(selected_terms) > 0` and any enrichment analysis exists):
  - Export composite enrichment plots and tables:
    ```r
    enriched_data %>%
      analyze_enrichments(significance_max = 0.05, top_n = 30)
    ```
    *(Generates `<analyte>_enrichment_<contrast>.png` and `table_<analyte>_enrichment_<contrast>.csv`).*

  - **Pathway Leading-Edge Feature Extraction & Dissection**:
    Connect top functional pathways directly back to their underlying molecular drivers:
    ```r
    for (pair in pairs) {
      c_str <- paste0(pair[1], "/", pair[2])
      enr_tbl <- tryCatch(export_analysis(enriched_data, c_str, .analysis = "enrichment"), error = function(e) NULL)
      if (!is.null(enr_tbl) && nrow(enr_tbl) > 0) {
        sig_terms <- enr_tbl %>%
          filter(!is.na(adj_p_value), adj_p_value <= 0.05) %>%
          arrange(adj_p_value) %>%
          head(5)

        cat(sprintf("\n=== LEADING ENRICHED PATHWAYS (%s) ===\n", c_str))
        for (k in seq_len(nrow(sig_terms))) {
          t_name <- sig_terms$annotation[k]
          cat(sprintf("Pathway [%s]: %s (Score: %.2f, q = %.2e)\n",
                      sig_terms$term[k], t_name, sig_terms$score[k], sig_terms$adj_p_value[k]))
        }
      }
    }
    ```

  - Move generated enrichment assets into `data/`:
    ```r
    enr_assets <- list.files(pattern = "^(plot_|table_|.*_enrichment_).*(png|csv)$")
    for (f in enr_assets) {
      file.rename(f, file.path("data", f))
    }
    ```
- If enrichment was bypassed:
  ```r
  cat("Pathway visualization and exports bypassed (no enrichment performed).\n")
  ```

#### Phase 5.4: Object Persistence & Blackboard Recording
- Persist the enriched (or preserved) dataset to disk:
  ```r
  saveRDS(enriched_data, file = "data/tidyproteomics_data.rds")
  ```
- Record the following directly into `docs/notes.md`:
  - Analyzed annotation categories (e.g. `gene_ontology_biological_process`, `reactome_pathway`, or note that enrichment was bypassed).
  - Total significant enriched terms ($q \le 0.05$) per category (if analyzed).
  - Leading enriched upregulated and downregulated biological pathways (if analyzed).
  - Key driving member proteins identified in top functional pathways (if analyzed).

#### Phase 5.5: Checkpoint Verification & State Recording
- [ ] **Checkpoint 5.5**:
  1. `logs/05_enrichment/console.log` (or `logs/05_enrichment.log`) exists on disk with non-zero file size.
  2. `data/tidyproteomics_data.rds` exists on disk with non-zero file size.
  3. If functional terms were analyzed: enrichment tables (`data/table_*_enrichment_*.csv`) and enrichment plots (`data/*_enrichment_*.png`) exist in `data/` with non-zero file sizes. If bypassed, `docs/notes.md` explicitly documents the bypass.
  4. `docs/notes.md` contains the functional enrichment audit and summary (or bypass documentation).
- [ ] **Complete Phase**:
  - Invoke `complete_phase(phaseName = "05_ENRICHMENT", summary = "Functional annotation assessment and pathway enrichment verification completed. Tested/confirmed targeted categories, exported enrichment tables and plots, and persisted data/tidyproteomics_data.rds.")` (or summary documenting bypass if annotations were unavailable).
  - **CRITICAL AUTONOMY MANDATE**: You MUST invoke `complete_phase` to advance the pipeline to Phase 6. Under no circumstances should you halt execution, stop calling tools, or wait for user instructions.

