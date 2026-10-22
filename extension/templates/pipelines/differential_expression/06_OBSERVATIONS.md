---
skills:
  - TIDYPROTEOMICS_CORE
  - TIDYPROTEOMICS_EXTRACT_QUERY
---

### Phase 6: Primary Data-Derived Observations & Extraction

In this phase, you (the LLM) will construct and execute an extraction script `code/06_observations.R` using the saved `data/tidyproteomics_data.rds` object. This extracts targeted summaries from `tidyproteomics` directly to the terminal and log (`logs/06_observations/console.log`), avoiding token overflows from large CSV files. 

You will summarize the primary quantitative data derived so far across all evaluated contrasts:
- Overall dataset dimensions, quantified identifiers, and quality checkpoint status.
- Target perturbation status (if a specific target gene was defined in `docs/experiment.md`) or untargeted discovery scope.
- Quantitative threshold counts ($|\log_2\text{FC}| \ge 1.0, q \le 0.05$), total upregulated, total downregulated per contrast.
- Top significantly expressed proteins (Markdown tables of top 10 upregulated and top 10 downregulated features with $\log_2\text{FC}$ and $q$-values).
- Top significant pathway enrichments across analyzed annotation categories (GO, Reactome, etc.).

You will then author `docs/observations.md` strictly documenting these primary data-derived observations without premature speculation or external literature synthesis (which will be systematically developed layer-by-layer in subsequent phases: internal knowledge in Phase 7, web search in Phase 8, and literature database interrogation in Phase 9).

---

#### 1. Deterministic Data Extraction via `code/06_observations.R`
Rather than reading massive CSV files into context, write and execute `code/06_observations.R` (capturing output to `logs/06_observations/console.log`: `mkdir -p logs/06_observations && Rscript code/06_observations.R 2>&1 | tee logs/06_observations/console.log`). 

Use `tidyproteomics`, `dplyr`, and `knitr` to extract exact numbers, target verification (or untargeted scope), top biomarkers, and pathway summaries across all evaluated contrasts:
```r
library(tidyproteomics)
library(dplyr)
library(knitr)

# 1. Load persisted tidyproteomics data object from data/
tp_data <- readRDS("data/tidyproteomics_data.rds")

# Helper to resolve Reactome IDs to human-readable pathway names
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
  return(resolved)
}

# Helper to preserve precision on statistical columns using scientific notation (< 1e-4)
format_stats <- function(df) {
  df %>% mutate(across(any_of(c("p_value", "adj_p_value")), ~ ifelse(!is.na(.) & . < 1e-4, sprintf("%.2e", .), sprintf("%.4f", .))))
}

# 2. Checkpoint & dataset dimension summary
cat("=== OBJECT SUMMARY ===\n")
print(tp_data)

analyte_name <- tp_data$analyte
available_terms <- get_annotation_terms(tp_data, format = "vector")

# 3. Extract differential expression results across all defined contrasts:
completed_analyses <- get_analyses(tp_data)
contrast_names <- unique(completed_analyses$comparison)
cat(sprintf("\nAvailable contrasts in object: %s\n", paste(contrast_names, collapse = ", ")))

# Target check (if a specific target gene/protein was specified in docs/experiment.md; otherwise NULL):
target_gene <- "<decided_target_gene_or_NULL>"         # e.g., "MYC" or NULL
target_uniprot <- "<decided_target_uniprot_or_NULL>"   # e.g., "P01106" or NULL

for (c_name in contrast_names) {
  c_parts <- strsplit(c_name, "/")[[1]]
  treatment_group <- c_parts[1]
  control_group <- c_parts[2]
  contrast_str <- paste0(treatment_group, "/", control_group)
  contrast_tag <- paste0(treatment_group, "-", control_group)

  cat(sprintf("\n=======================================================\nCONTRAST: %s vs %s\n=======================================================\n", treatment_group, control_group))

  exp_tbl <- rlang::inject(export_analysis(tp_data, !!rlang::parse_expr(contrast_str), .analysis = "expression"))

  # Missing gene symbol fallback and delimiter sanitation (Bug 5)
  clean_desc_word <- if ("description" %in% names(exp_tbl)) sub(" .*$", "", trimws(exp_tbl$description)) else NA_character_
  clean_desc_word[is.na(clean_desc_word) | clean_desc_word == ""] <- NA_character_

  exp_tbl <- exp_tbl %>%
    mutate(
      gene_name = coalesce(
        if ("gene_name" %in% names(.)) ifelse(is.na(gene_name) | !nzchar(trimws(gene_name)), NA_character_, gene_name) else NA_character_,
        clean_desc_word,
        protein
      ),
      gene_name = gsub(";[[:space:]]+", "; ", gsub(";+", "; ", trimws(gene_name))),
      gene_name = gsub("^[; ]+|[; ]+$", "", gene_name)
    )

  # Imputation Risk Flagging (Optimization 3)
  g1_imp <- paste0("imputed_", treatment_group)
  g2_imp <- paste0("imputed_", control_group)
  exp_tbl <- exp_tbl %>%
    mutate(
      imputed_total = if ("imputed_total" %in% names(.)) imputed_total else if ("imputed" %in% names(.)) imputed else NA_real_,
      imputation_bias = if ("imputation_bias" %in% names(.)) imputation_bias else case_when(
        pmax(if (g1_imp %in% names(.)) get(g1_imp) else 0,
             if (g2_imp %in% names(.)) get(g2_imp) else 0, na.rm = TRUE) > 0.5 ~ "HIGH",
        pmax(if (g1_imp %in% names(.)) get(g1_imp) else 0,
             if (g2_imp %in% names(.)) get(g2_imp) else 0, na.rm = TRUE) >= 0.2 ~ "MODERATE",
        TRUE ~ "LOW"
      )
    )

  # Target perturbation / biomarker check (if targeted):
  if (!is.null(target_gene) && target_gene != "" && !grepl("<decided_", target_gene)) {
    target_cols <- intersect(
      c("gene_name", "gene_symbol", "symbol", "gene", "protein", "accession", "peptide", "uniprot", "uniprot_id"),
      colnames(exp_tbl)
    )
    target_rows <- if (length(target_cols) > 0) {
      exp_tbl %>% filter(if_any(all_of(target_cols), ~ .x %in% c(target_gene, target_uniprot)))
    } else {
      exp_tbl[0, ]
    }
    if ("foldchange" %in% colnames(target_rows) && nrow(target_rows) > 0) {
      target_rows <- target_rows %>% mutate(percent_change = (foldchange - 1) * 100)
    }

    cat(sprintf("\n=== TARGET STATUS (%s / %s) ===\n", target_gene, ifelse(is.null(target_uniprot), "NA", target_uniprot)))
    target_display <- target_rows %>% select(any_of(c(
      target_cols, "log2_foldchange", "foldchange", "p_value",
      "adj_p_value", "imputation_bias", "percent_change", "description", "name"
    ))) %>% format_stats()
    cat(knitr::kable(target_display, format = "pipe"), sep = "\n")
  } else {
    cat("\n=== TARGET STATUS: Untargeted / Discovery Screen (No single target gene specified) ===\n")
  }

  cat("\n=== QUANTITATIVE THRESHOLD COUNTS ===\n")
  sig_all <- exp_tbl %>% filter(!is.na(adj_p_value), adj_p_value <= 0.05, abs(log2_foldchange) >= 1)
  sig_up <- exp_tbl %>% filter(!is.na(adj_p_value), adj_p_value <= 0.05, log2_foldchange >= 1)
  sig_down <- exp_tbl %>% filter(!is.na(adj_p_value), adj_p_value <= 0.05, log2_foldchange <= -1)

  cat(sprintf("Total Quantified Identifiers (%s): %d\n", analyte_name, nrow(exp_tbl)))
  cat(sprintf("Total Significant (|log2FC| >= 1, q <= 0.05): %d\n", nrow(sig_all)))
  cat(sprintf("Total Upregulated (log2FC >= 1, q <= 0.05): %d\n", nrow(sig_up)))
  cat(sprintf("Total Downregulated (log2FC <= -1, q <= 0.05): %d\n", nrow(sig_down)))

  cat("Imputation risk breakdown for all quantified features:\n")
  print(table(exp_tbl$imputation_bias))

  # Dynamically assemble display columns based on available identifiers, statistics, annotations, and imputation tags:
  id_cols <- intersect(
    c("gene_name", "gene_symbol", "symbol", "gene", "protein", "peptide", "accession", "description", "name"),
    colnames(exp_tbl)
  )
  stat_cols <- intersect(c("log2_foldchange", "p_value", "adj_p_value", "imputation_bias"), colnames(exp_tbl))
  anno_cols <- setdiff(
    intersect(available_terms, colnames(exp_tbl)),
    c(id_cols, stat_cols, "gene_id_entrez", "gene_id_ensemble")
  )
  display_columns <- unique(c(id_cols, stat_cols, anno_cols))

  cat(sprintf("\n=== TOP 10 UPREGULATED %s (MARKDOWN TABLE) ===\n", toupper(analyte_name)))
  top_up <- sig_up %>% arrange(desc(log2_foldchange), adj_p_value) %>% head(10)
  cat(knitr::kable(top_up %>% select(any_of(display_columns)) %>% format_stats(), format = "pipe"), sep = "\n")

  cat(sprintf("\n=== TOP 10 DOWNREGULATED %s (MARKDOWN TABLE) ===\n", toupper(analyte_name)))
  top_down <- sig_down %>% arrange(log2_foldchange, adj_p_value) %>% head(10)
  cat(knitr::kable(top_down %>% select(any_of(display_columns)) %>% format_stats(), format = "pipe"), sep = "\n")

  # 4. Top robust candidates ranked by volcano pi-score: |log2FC| * -log10(adj_p_value)
  cat(sprintf("\n=== TOP 10 BALANCED CANDIDATES (VOLCANO PI-SCORE) FOR %s ===\n", contrast_tag))
  top_pi <- sig_all %>%
    mutate(pi_score = abs(log2_foldchange) * -log10(pmax(adj_p_value, 1e-10))) %>%
    arrange(desc(pi_score)) %>%
    head(10)
  cat(knitr::kable(top_pi %>% select(any_of(c(display_columns, "pi_score"))) %>% format_stats(), format = "pipe"), sep = "\n")

  # 5. Extract enrichment results across all analyzed categories for this contrast (with member proteins)
  enr_csv <- file.path("data", paste0("table_proteins_enrichment_", gsub("/", "-", contrast_str), ".csv"))
  if (file.exists(enr_csv)) {
    enr_tbl <- tryCatch(readr::read_csv(enr_csv, show_col_types = FALSE), error = function(e) NULL)
  } else {
    enriched_terms <- if (nrow(completed_analyses) > 0) {
      completed_analyses %>%
        filter(comparison == contrast_str, analysis == "enrichment") %>%
        pull(term)
    } else {
      available_terms
    }

    enr_tbl <- dplyr::bind_rows(lapply(enriched_terms, function(t) {
      tryCatch(
        rlang::inject(export_analysis(tp_data, !!rlang::parse_expr(contrast_str), .analysis = "enrichment", .term = t)) %>%
          dplyr::mutate(term = t, .before = 1),
        error = function(e) NULL
      )
    }))
    if (!is.null(enr_tbl) && nrow(enr_tbl) > 0 && "annotation" %in% names(enr_tbl)) {
      enr_tbl <- enr_tbl %>% dplyr::mutate(annotation = resolve_reactome_ids(annotation))
    }
  }

  if (!is.null(enr_tbl) && nrow(enr_tbl) > 0) {
    cat(sprintf("\n=== MULTI-CATEGORY ENRICHMENT FOR %s ===\n", contrast_tag))
    cat(knitr::kable(enr_tbl %>% group_by(term) %>% summarise(
      terms_count = n(),
      sig_terms = sum(adj_p_value <= 0.05, na.rm = TRUE),
      .groups = "drop"
    ), format = "pipe"), sep = "\n")

    cat(sprintf("\n=== TOP SIGNIFICANT PATHWAYS FOR %s (MARKDOWN TABLE) ===\n", contrast_tag))
    if ("member_proteins" %in% names(enr_tbl)) {
      enr_tbl <- enr_tbl %>%
        mutate(top_drivers = sapply(strsplit(as.character(member_proteins), ",\\s*"), function(x) paste(head(x, 4), collapse = ", ")))
    }
    enr_cols <- intersect(c("term", "annotation", "enrichment", "size", "p_value", "adj_p_value", "top_drivers", "leading_edge_count"), names(enr_tbl))
    sig_enr <- enr_tbl %>% filter(!is.na(adj_p_value), adj_p_value <= 0.05) %>% arrange(adj_p_value) %>% head(30)
    cat(knitr::kable(sig_enr %>% select(any_of(enr_cols)) %>% format_stats(), format = "pipe"), sep = "\n")
  }
}

# 6. Multi-Contrast Cross-Comparison (if >= 2 contrasts evaluated)
if (length(contrast_names) >= 2) {
  cat("\n=== MULTI-CONTRAST CROSS-COMPARISON SUMMARY ===\n")
  cat(sprintf("Total contrasts: %d. Comparing shared vs contrast-specific significant features.\n", length(contrast_names)))
}

# 5. Checkpoints
cat("\n=== CHECKPOINTS ===\n")
cat("Artifact tidyproteomics_data.rds exists in data/:", file.exists("data/tidyproteomics_data.rds"), "\n")
expr_tables <- list.files("data", pattern = "^table_.*_expression_.*\\.csv$")
cat("Expression tables found in data/:", length(expr_tables), "\n")
stopifnot("Expression data extraction failed" = length(expr_tables) > 0)
cat("PHASE_6_EXTRACTION_CHECKPOINT_PASS\n")
```

- **CLI Verification**: For log inspection, use native command-line utilities (e.g. `head -n 30 logs/06_observations/console.log`, `grep -i "pass" ...`) instead of dumping full raw files into the prompt context. Note: Markdown tables in the log can be directly transferred into `docs/observations.md`.

---

#### 2. Direct Construction of `docs/observations.md`
Write the file `docs/observations.md` directly, referencing `docs/llm.md` for active model details. Ensure it begins with the standard document header immediately below the title:

```markdown
# Primary Data-Derived Observations

Created: YYYY-MM-DD HH:MM
Author: PROVIDER | LLM-MODEL
Agent: TidyProteomicsAgent vX.X.X
```

Organize the document strictly into the following structured sections:

1. **Analysis Checkpoint & Dataset Dimensions Summary**:
   - Status (PASS/FAIL) for Target Perturbation (if targeted; or "NOT APPLICABLE - UNTARGETED DISCOVERY SCREEN") and Artifact Verification (`data/tidyproteomics_data.rds`, tables in `data/`, plots in `data/`).
   - Summary of dataset dimensions: total features quantified (`proteins` or `peptides`), total significantly altered ($|\log_2\text{FC}| \ge 1.0$, $q \le 0.05$), count upregulated, count downregulated per contrast.
2. **Target Efficacy / Leading Perturbation Status**:
   - Quantitative breakdown of the primary target (if targeted) or leading master regulator / key functional hub (if untargeted screening): Gene Symbol / Accession, $\log_2\text{FC}$, fold change, $p$-value, $q$-value, imputation risk tag, and percent change.
   - Comparison with experimental expectations stated in `docs/experiment.md`.
3. **Top Significantly Upregulated Proteins**:
   - Structured markdown table: Rank, Identifier (Gene Symbol / Accession), Description, $\log_2\text{FC}$, $q$-value, Imputation Risk (`imputation_bias`: HIGH, MODERATE, LOW). (Directly copy pre-formatted markdown table from `logs/06_observations/console.log`). Prominently tag candidates like `HBG2` or `SYN1` so detection/missingness-driven shifts are distinguished from continuous shifts.
4. **Top Significantly Downregulated Proteins**:
   - Structured markdown table: Rank, Identifier (Gene Symbol / Accession), Description, $\log_2\text{FC}$, $q$-value, Imputation Risk (`imputation_bias`: HIGH, MODERATE, LOW). (Directly copy pre-formatted markdown table from `logs/06_observations/console.log`).
5. **Top Significant Pathway Enrichments**:
   - Summary table of significant terms across analyzed annotation categories (Category/Term, Annotation Name, Direction / Enrichment Score, $q$-value, Leading Driver Proteins [top 3–5 member gene symbols], Leading-Edge Count).
   - Primary biological themes identified across contrasts based directly on statistical enrichment and driven by specific leading-edge member proteins.
6. **Primary Empirical Data Summary**:
   - Objective, factual synthesis of data-derived observations directly grounded in the quantitative tables and figures.
   - Detection-rate sensitivity discussion: explicitly evaluate whether top candidates are driven by continuous abundance changes (LOW imputation bias) or limit-of-detection presence/absence shifts (HIGH imputation bias).
   - Pure empirical observation: no premature speculation or external literature synthesis (this is developed systematically in Phases 7, 8, and 9).

---

#### 3. Critical Constraints
- **Absolute Data Grounding**: Every numerical value ($\log_2\text{FC}$, $p$-value, $q$-value, feature count, pathway score) MUST strictly match `logs/06_observations/console.log` and the exported CSV tables. Never fabricate or extrapolate numbers.
- **Scientific Precision Formatting (No Exact Zeros)**: Format all statistical significance columns ($p$-value, $q$-value) smaller than $1 \times 10^{-4}$ using scientific notation (e.g., `3.99e-10` rather than `0.0000000` or `0.0e+00`). Tables must never report misleading "exact zero" values.
- **Human-Readable Pathway Resolution**: Resolve bare Reactome accession IDs (e.g., `R-HSA-977606`, `R-HSA-166663`) to human-readable biological pathway names (e.g., `Regulation of Complement cascade`, `Initial triggering of complement`) via `resolve_reactome_ids()`. Never report `"identifier unresolved in export"`.
- **Sanitized Delimiters & Missing Identifier Fallback**: Strip redundant delimiter characters (avoid `;;` or trailing semicolons) and provide sensible fallbacks for unmapped gene symbols (e.g., fallback to the first word of the protein description or canonical accession rather than `NA`).
- **Pure Empirical Scope**: Do not synthesize external literature in this phase. Document what the mass spectrometry data directly demonstrates.

---

#### 4. Phase Completion Gate
- [ ] **Checkpoint Gate**:
  1. `code/06_observations.R` executed with status code 0 and output logged to `logs/06_observations/console.log` (or `logs/06_observations.log`).
  2. `logs/06_observations/console.log` (or `logs/06_observations.log`) ends with `PHASE_6_EXTRACTION_CHECKPOINT_PASS`.
  3. `docs/observations.md` exists on disk with non-zero size and conforms to the structure above.
- [ ] **Complete Phase**:
  - Invoke `complete_phase(phaseName = "06_OBSERVATIONS", summary = "Primary data-derived observations extracted and compiled in docs/observations.md with verified biomarker metrics, markdown tables, and pathway enrichment summaries.")`
