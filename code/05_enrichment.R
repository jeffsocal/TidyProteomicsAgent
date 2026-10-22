suppressPackageStartupMessages({
  library(tidyproteomics)
  library(dplyr)
})

cat("=== PHASE 5: FUNCTIONAL ANNOTATION AND ENRICHMENT ===\n")
stat_data <- readRDS("data/tidyproteomics_data.rds")
cat("=== OBJECT ===\n")
print(stat_data)
cat("=== OPERATIONS ===\n")
ops <- operations(stat_data)
print(tail(ops, 12))

anno_file <- NULL
if (file.exists("data/annotations.csv")) anno_file <- "data/annotations.csv"
if (file.exists("data/annotations.tsv")) anno_file <- "data/annotations.tsv"
if (!is.null(anno_file)) {
  cat(sprintf("Merging external annotations from %s...\n", anno_file))
  anno_df <- if (grepl("\\.tsv$", anno_file)) read.delim(anno_file) else read.csv(anno_file)
  stat_data <- stat_data %>% annotate(anno_df)
}

available_terms <- get_annotation_terms(stat_data, format = "vector")
cat("=== AVAILABLE ANNOTATION CATEGORIES ===\n")
print(get_annotation_terms(stat_data, format = "table"))
non_functional <- c("protein", "protein_name", "gene_name", "organism", "description",
                    "num_peptides", "num_unique_peptides")
candidate_terms <- setdiff(available_terms, non_functional)
ontology_patterns <- "biological_process|cellular_component|molecular_function|reactome|kegg|pathway|wiki_pathway|gene_ontology|subcellular"
selected_terms <- candidate_terms[grepl(ontology_patterns, candidate_terms, ignore.case = TRUE)]
if (!length(selected_terms) && length(candidate_terms)) selected_terms <- candidate_terms
cat("Selected enrichment categories:\n")
print(selected_terms)

analysis_catalog <- get_analyses(stat_data)
cat("=== EXISTING ANALYSES ===\n")
print(analysis_catalog)
expr_comparisons <- character()
if (nrow(analysis_catalog) > 0) {
  catalog_types <- dplyr::pull(analysis_catalog, "analysis")
  catalog_comparisons <- dplyr::pull(analysis_catalog, "comparison")
  expr_comparisons <- unique(catalog_comparisons[catalog_types == "expression"])
  if (!length(expr_comparisons)) expr_comparisons <- unique(catalog_comparisons)
}
cat(sprintf("Available contrasts for pathway enrichment: %s\n", paste(expr_comparisons, collapse = ", ")))
pairs <- lapply(strsplit(expr_comparisons, "/", fixed = TRUE), function(x) c(x[1], x[2]))

if (!length(selected_terms)) {
  notice <- "Annotation Notice: Dataset lacks functional ontologies (GO terms / Reactome / KEGG). Enrichment analysis requires biological annotations. Refer to the TidyProteomics Annotation Guide (https://jeffsocal.github.io/tidyproteomics/articles/annotating.html) to supply data/annotations.csv."
  cat(paste0("WARNING: ", notice, "\n"))
  enriched_data <- stat_data
  bypassed <- TRUE
} else {
  already_enriched <- any(grepl("enrichment", ops, ignore.case = TRUE))
  if (already_enriched) {
    cat("Pre-existing enrichment operations detected; preserving stored calculations.\n")
    enriched_data <- stat_data
  } else if (length(pairs)) {
    cores <- max(1, min(4, parallel::detectCores() - 1, na.rm = TRUE))
    cat(sprintf("Executing Wilcoxon enrichment for %d contrast(s), %d annotation categories, %d core(s).\n", length(pairs), length(selected_terms), cores))
    enriched_data <- stat_data %>% enrichment(.pairs = pairs, .terms = selected_terms,
                                               .method = "wilcoxon", .cpu_cores = cores)
  } else {
    cat("No expression contrasts found; preserving object without enrichment.\n")
    enriched_data <- stat_data
  }
  post_catalog <- get_analyses(enriched_data)
  post_types <- if (nrow(post_catalog)) dplyr::pull(post_catalog, "analysis") else character()
  bypassed <- !any(post_types == "enrichment")
}

cat("=== UPDATED ANALYSIS CATALOG ===\n")
final_catalog <- get_analyses(enriched_data)
print(final_catalog)
final_types <- if (nrow(final_catalog)) dplyr::pull(final_catalog, "analysis") else character()
resolve_reactome_ids <- function(ids) {
  if (length(ids) == 0) return(character(0))
  resolved <- as.character(ids)
  reactome_idx <- which(grepl("^R-[A-Z]{3}-[0-9]+", resolved))
  if (length(reactome_idx) == 0) return(resolved)

  unique_reactome <- unique(resolved[reactome_idx])
  name_map <- list()

  tsv_paths <- c(
    "tools/reactome_pathways.tsv",
    "data/reactome_pathways.tsv",
    "extension/templates/shared/tools/reactome_pathways.tsv"
  )
  for (tp in tsv_paths) {
    if (file.exists(tp)) {
      tryCatch({
        df <- read.delim(tp, header = FALSE, stringsAsFactors = FALSE, sep = "\t")
        if (ncol(df) >= 2) {
          sub_df <- df[df[[1]] %in% unique_reactome, ]
          if (nrow(sub_df) > 0) {
            for (i in seq_len(nrow(sub_df))) {
              name_map[[sub_df[i, 1]]] <- sub_df[i, 2]
            }
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
          if (!is.null(parsed$displayName) && nzchar(parsed$displayName)) {
            name_map[[rid]] <- parsed$displayName
          }
        }
      }, error = function(e) NULL))
    }
  }

  for (i in reactome_idx) {
    rid <- resolved[i]
    if (!is.null(name_map[[rid]]) && nzchar(name_map[[rid]])) {
      resolved[i] <- name_map[[rid]]
    }
  }
  return(resolved)
}

if (!bypassed && any(final_types == "enrichment")) {
  enriched_data %>% analyze_enrichments(significance_max = 0.05, top_n = 30)
  assets <- list.files(pattern = "^(plot_|table_|.*_enrichment_).*(png|csv)$", ignore.case = TRUE)
  for (f in assets) {
    target <- file.path("data", basename(f))
    if (normalizePath(f, mustWork = FALSE) != normalizePath(target, mustWork = FALSE)) file.rename(f, target)
  }

  for (c_str in expr_comparisons) {
    term_tables <- list()
    for (term_name in selected_terms) {
      t_tbl <- tryCatch(
        rlang::inject(tidyproteomics::export_analysis(
          enriched_data,
          !!rlang::parse_expr(c_str),
          .analysis = "enrichment",
          .term = term_name
        )) %>% dplyr::mutate(term = term_name, .before = 1),
        error = function(e) {
          cat(sprintf("Export warning for %s (%s): %s\n", c_str, term_name, conditionMessage(e)))
          NULL
        }
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
              for (idx in seq_len(nrow(lut_df))) {
                reactome_lut[[lut_df[idx, 2]]] <- lut_df[idx, 1]
              }
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
        
        # Try direct lookup with resolved or original annotation
        key <- paste0(t_term, "___", t_anno)
        prots <- anno_to_prots[[key]]
        if (is.null(prots) || length(prots) == 0) {
          prots <- anno_to_prots[[paste0(t_term, "___", t_orig)]]
        }
        
        # If still not found and reactome, try reverse lookup
        if ((is.null(prots) || length(prots) == 0) && t_term == "reactome") {
          rid <- reactome_lut[[t_anno]]
          if (!is.null(rid)) {
            prots <- anno_to_prots[[paste0(t_term, "___", rid)]]
          }
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

      cat(sprintf("\n=== ENRICHMENT RESULT STRUCTURE: %s ===\n", c_str))
      cat("Columns: ", paste(names(enr_tbl), collapse = ", "), "\n", sep = "")
      if (all(c("adj_p_value", "annotation") %in% names(enr_tbl))) {
        sig <- enr_tbl %>% filter(!is.na(adj_p_value), adj_p_value <= 0.05) %>% arrange(adj_p_value)
        cat(sprintf("Significant terms (BH q<=0.05): %d\n", nrow(sig)))
        if (nrow(sig)) print(head(sig %>% select(any_of(c("term", "annotation", "enrichment", "score", "adj_p_value", "member_proteins", "leading_edge_count"))), 10))
      }
      out_csv <- file.path("data", paste0("table_proteins_enrichment_", gsub("/", "-", c_str), ".csv"))
      readr::write_csv(enr_tbl, out_csv)
      cat(sprintf("Exported comprehensive enrichment table with member proteins to %s\n", out_csv))
    }
  }
} else {
  cat("Pathway visualization and exports bypassed (no enrichment result available).\n")
}
saveRDS(enriched_data, file = "data/tidyproteomics_data.rds")

version <- as.character(utils::packageVersion("tidyproteomics"))
stamp <- format(Sys.time(), "%Y-%m-%d %H:%M")
notes <- c("", "### Phase 5: Functional Annotation Assessment & Pathway Enrichment - COMPLETED", "",
           paste0("- **Run timestamp**: ", stamp),
           paste0("- **Annotation categories considered**: ", if (length(selected_terms)) paste(selected_terms, collapse = ", ") else "none; enrichment bypassed"),
           paste0("- **Enrichment status**: ", if (bypassed) "bypassed/no enrichment results" else "enrichment results audited and exported"),
           paste0("- **Contrast(s)**: ", if (length(expr_comparisons)) paste(expr_comparisons, collapse = ", ") else "none found"),
           "- **Interpretive limitation**: Any enrichment results inherit the exploratory expression analysis limitations: disease group and acquisition batch are associated, and independent subject mapping is unverified. Results are descriptive and do not establish disease-specific effects.",
           paste0("- **Persistence**: Enriched or preserved object saved to `data/tidyproteomics_data.rds`; tidyproteomics v", version, "."),
           "- **Provenance**: `docs/llm.md`; script: `code/05_enrichment.R`; log: `logs/05_enrichment/console.log`.")
if (bypassed) notes <- c(notes, "- **Annotation notice**: No usable functional ontology terms/results were available; enrichment was bypassed and differential-expression data preserved.")
cat(paste(notes, collapse = "\n"), "\n", file = "docs/notes.md", append = TRUE)
cat("Phase 5 script completed.\n")
