---
skills:
  - TIDYPROTEOMICS_CORE
  - TIDYPROTEOMICS_ENRICHMENT
---

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
    Connect top functional pathways directly back to their underlying molecular drivers. Iterate through tested `selected_terms` using `rlang::inject()` and `.term = term_name` to prevent NSE failure and resolve Reactome accession IDs to human-readable names:
    ```r
    resolve_reactome_ids <- function(ids) {
      if (length(ids) == 0) return(character(0))
      resolved <- as.character(ids)
      reactome_idx <- which(grepl("^R-[A-Z]{3}-[0-9]+", resolved))
      if (length(reactome_idx) == 0) return(resolved)
      unique_reactome <- unique(resolved[reactome_idx])
      name_map <- list()
      tsv_paths <- c("tools/reactome_pathways.tsv", "data/reactome_pathways.tsv", "extension/templates/shared/tools/reactome_pathways.tsv")
      for (tp in tsv_paths) {
        if (file.exists(tp)) {
          tryCatch({
            df <- read.delim(tp, header = FALSE, stringsAsFactors = FALSE, sep = "\t")
            if (ncol(df) >= 2) {
              sub_df <- df[df[[1]] %in% unique_reactome, ]
              if (nrow(sub_df) > 0) {
                for (i in seq_len(nrow(sub_df))) name_map[[sub_df[i, 1]]] <- sub_df[i, 2]
              }
            }
          }, error = function(e) NULL)
          break
        }
      }
      unresolved <- setdiff(unique_reactome, names(name_map))
      if (length(unresolved) > 0) {
        for (rid in unresolved) {
          suppressWarnings(tryCatch({
            url <- paste0("https://reactome.org/ContentService/data/query/", rid)
            con <- url(url, open = "r")
            raw_txt <- readLines(con, warn = FALSE)
            close(con)
            if (length(raw_txt) > 0) {
              parsed <- jsonlite::fromJSON(paste(raw_txt, collapse = "\n"))
              if (!is.null(parsed$displayName) && nzchar(parsed$displayName)) name_map[[rid]] <- parsed$displayName
            }
          }, error = function(e) NULL))
        }
      }
      for (i in reactome_idx) {
        rid <- resolved[i]
        if (!is.null(name_map[[rid]]) && nzchar(name_map[[rid]])) resolved[i] <- name_map[[rid]]
      }
      resolved
    }

  - Move generated default enrichment plots and tables into `data/`:
    ```r
    enr_assets <- list.files(pattern = "^(plot_|table_|.*_enrichment_).*(png|csv)$")
    for (f in enr_assets) {
      file.rename(f, file.path("data", f))
    }
    ```

  - **Pathway Leading-Edge Member Protein Extraction & Dissection**:
    Connect top functional pathways directly back to their underlying molecular drivers. Iterate through tested `selected_terms` using `rlang::inject()` and `.term = term_name` to resolve Reactome accession IDs and map driving member proteins:
    ```r
    resolve_reactome_ids <- function(ids) {
      if (length(ids) == 0) return(character(0))
      resolved <- as.character(ids)
      reactome_idx <- which(grepl("^R-[A-Z]{3}-[0-9]+", resolved))
      if (length(reactome_idx) == 0) return(resolved)
      unique_reactome <- unique(resolved[reactome_idx])
      name_map <- list()
      tsv_paths <- c("tools/reactome_pathways.tsv", "data/reactome_pathways.tsv", "extension/templates/shared/tools/reactome_pathways.tsv")
      for (tp in tsv_paths) {
        if (file.exists(tp)) {
          tryCatch({
            df <- read.delim(tp, header = FALSE, stringsAsFactors = FALSE, sep = "\t")
            if (ncol(df) >= 2) {
              sub_df <- df[df[[1]] %in% unique_reactome, ]
              if (nrow(sub_df) > 0) {
                for (i in seq_len(nrow(sub_df))) name_map[[sub_df[i, 1]]] <- sub_df[i, 2]
              }
            }
          }, error = function(e) NULL)
          break
        }
      }
      unresolved <- setdiff(unique_reactome, names(name_map))
      if (length(unresolved) > 0) {
        for (rid in unresolved) {
          suppressWarnings(tryCatch({
            url <- paste0("https://reactome.org/ContentService/data/query/", rid)
            con <- url(url, open = "r")
            raw_txt <- readLines(con, warn = FALSE)
            close(con)
            if (length(raw_txt) > 0) {
              parsed <- jsonlite::fromJSON(paste(raw_txt, collapse = "\n"))
              if (!is.null(parsed$displayName) && nzchar(parsed$displayName)) name_map[[rid]] <- parsed$displayName
            }
          }, error = function(e) NULL))
        }
      }
      for (i in reactome_idx) {
        rid <- resolved[i]
        if (!is.null(name_map[[rid]]) && nzchar(name_map[[rid]])) resolved[i] <- name_map[[rid]]
      }
      resolved
    }

    for (c_str in available_contrasts) {
      term_tables <- list()
      for (term_name in selected_terms) {
        t_tbl <- tryCatch(
          rlang::inject(tidyproteomics::export_analysis(
            enriched_data,
            !!rlang::parse_expr(c_str),
            .analysis = "enrichment",
            .term = term_name
          )) %>% dplyr::mutate(term = term_name, .before = 1),
          error = function(e) NULL
        )
        if (!is.null(t_tbl) && nrow(t_tbl) > 0) {
          term_tables[[term_name]] <- t_tbl
        }
      }
      enr_tbl <- dplyr::bind_rows(term_tables)
      if (!is.null(enr_tbl) && nrow(enr_tbl) > 0) {
        orig_annotation <- enr_tbl$annotation
        if ("annotation" %in% names(enr_tbl)) {
          enr_tbl <- enr_tbl %>% dplyr::mutate(annotation = resolve_reactome_ids(annotation))
        }

        # Member Protein Resolution & Leading-Edge Extraction (Optimization 4)
        exp_tbl <- tryCatch(
          rlang::inject(tidyproteomics::export_analysis(enriched_data, !!rlang::parse_expr(c_str), .analysis = "expression")),
          error = function(e) NULL
        )
        prot_fc <- if (!is.null(exp_tbl) && "log2_foldchange" %in% names(exp_tbl)) setNames(exp_tbl$log2_foldchange, exp_tbl$protein) else numeric(0)
        prot_pval <- if (!is.null(exp_tbl) && "adj_p_value" %in% names(exp_tbl)) setNames(exp_tbl$adj_p_value, exp_tbl$protein) else numeric(0)

        gene_annos <- enriched_data$annotations[enriched_data$annotations$term == "gene_name", ]
        gene_map <- setNames(sub(";.*", "", gene_annos$annotation), gene_annos$protein)
        get_symbol <- function(prot) {
          sym <- gene_map[prot]
          ifelse(!is.na(sym) & nzchar(sym), sym, prot)
        }

        anno_unnested <- enriched_data$annotations %>%
          filter(!is.na(annotation), nzchar(annotation)) %>%
          tidyr::separate_rows(annotation, sep = ";") %>%
          mutate(annotation = trimws(annotation)) %>%
          filter(nzchar(annotation)) %>%
          distinct(term, annotation, protein)

        anno_to_prots <- split(anno_unnested$protein, paste0(anno_unnested$term, "___", anno_unnested$annotation))

        reactome_lut <- list()
        tsv_paths <- c("tools/reactome_pathways.tsv", "extension/templates/shared/tools/reactome_pathways.tsv")
        for (tp in tsv_paths) {
          if (file.exists(tp)) {
            tryCatch({
              lut_df <- read.delim(tp, header = FALSE, stringsAsFactors = FALSE)
              if (ncol(lut_df) >= 2) {
                for (idx in seq_len(nrow(lut_df))) reactome_lut[[lut_df[idx, 2]]] <- lut_df[idx, 1]
              }
            }, error = function(e) NULL)
            break
          }
        }

        member_proteins_vec <- character(nrow(enr_tbl))
        leading_edge_counts <- integer(nrow(enr_tbl))

        for (k in seq_len(nrow(enr_tbl))) {
          t_term <- enr_tbl$term[k]
          t_anno <- enr_tbl$annotation[k]
          t_orig <- orig_annotation[k]
          
          key <- paste0(t_term, "___", t_anno)
          prots <- anno_to_prots[[key]]
          if (is.null(prots) || length(prots) == 0) prots <- anno_to_prots[[paste0(t_term, "___", t_orig)]]
          if ((is.null(prots) || length(prots) == 0) && t_term == "reactome") {
            rid <- reactome_lut[[t_anno]]
            if (!is.null(rid)) prots <- anno_to_prots[[paste0(t_term, "___", rid)]]
          }
          
          if (!is.null(prots) && length(prots) > 0) {
            p_fc <- prot_fc[prots]
            p_adj <- prot_pval[prots]
            valid_fc <- ifelse(is.na(p_fc), 0, p_fc)
            ord <- order(-abs(valid_fc))
            ordered_prots <- prots[ord]
            ordered_syms <- sapply(ordered_prots, get_symbol)
            
            sig_drivers <- sum(!is.na(p_adj) & p_adj <= 0.05)
            leading_edge_counts[k] <- sig_drivers
            top_syms <- head(unique(ordered_syms), 10)
            member_proteins_vec[k] <- paste(top_syms, collapse = ", ")
          } else {
            member_proteins_vec[k] <- NA_character_
            leading_edge_counts[k] <- 0L
          }
        }

        enr_tbl$member_proteins <- member_proteins_vec
        enr_tbl$leading_edge_count <- leading_edge_counts

        out_csv <- file.path("data", paste0("table_proteins_enrichment_", gsub("/", "-", c_str), ".csv"))
        readr::write_csv(enr_tbl, out_csv)
        cat(sprintf("Exported enriched table with member_proteins and leading_edge_count to %s\n", out_csv))

        sig_terms <- enr_tbl %>%
          filter(!is.na(adj_p_value), adj_p_value <= 0.05) %>%
          arrange(adj_p_value) %>%
          head(5)

        cat(sprintf("\n=== LEADING ENRICHED PATHWAYS (%s) ===\n", c_str))
        for (k in seq_len(nrow(sig_terms))) {
          t_name <- sig_terms$annotation[k]
          score_val <- if ("enrichment" %in% names(sig_terms)) sig_terms$enrichment[k] else if ("score" %in% names(sig_terms)) sig_terms$score[k] else NA
          drivers <- if ("member_proteins" %in% names(sig_terms) && !is.na(sig_terms$member_proteins[k])) sig_terms$member_proteins[k] else "N/A"
          cat(sprintf("Pathway [%s]: %s (Score: %.2f, q = %.2e) | Drivers: %s\n",
                      sig_terms$term[k], t_name, score_val, sig_terms$adj_p_value[k], drivers))
        }
      }
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
  - Key driving member proteins and leading-edge counts identified in top functional pathways (if analyzed).

#### Phase 5.5: Checkpoint Verification & State Recording
- [ ] **Checkpoint 5.5**:
  1. `logs/05_enrichment/console.log` (or `logs/05_enrichment.log`) exists on disk with non-zero file size.
  2. `data/tidyproteomics_data.rds` exists on disk with non-zero file size.
  3. If functional terms were analyzed: enrichment tables (`data/table_*_enrichment_*.csv`) exist in `data/` with non-zero file size and contain `member_proteins` and `leading_edge_count` columns. Enrichment plots (`data/*_enrichment_*.png`) exist in `data/` with non-zero file sizes. If bypassed, `docs/notes.md` explicitly documents the bypass.
  4. `docs/notes.md` contains the functional enrichment audit and summary (or bypass documentation).
- [ ] **Complete Phase**:
  - Invoke `complete_phase(phaseName = "05_ENRICHMENT", summary = "Functional annotation assessment and pathway enrichment verification completed. Tested/confirmed targeted categories, exported enrichment tables with member proteins and leading-edge counts, generated plots, and persisted data/tidyproteomics_data.rds.")` (or summary documenting bypass if annotations were unavailable).
  - **CRITICAL AUTONOMY MANDATE**: You MUST invoke `complete_phase` to advance the pipeline to Phase 6. Under no circumstances should you halt execution, stop calling tools, or wait for user instructions.

