# Primary Data-Derived Observations

Created: 2026-10-21 18:24  
Author: OPENROUTER | openai/gpt-6-luna  
Agent: TidyProteomicsAgent v0.1.0  
R Package: tidyproteomics v1.9.15  

Model and agent provenance: [`docs/llm.md`](llm.md). These observations summarize the saved object and extracted results in `logs/06_observations/console.log` and the exported analysis tables.

## 1. Analysis Checkpoint & Dataset Dimensions Summary

- **Target perturbation:** NOT APPLICABLE — untargeted discovery comparison; the experiment specification does not designate a single target gene.
- **Artifact verification:** PASS — `data/tidyproteomics_data.rds`, the expression and enrichment CSV tables, and eight PNG files are present. The extraction script completed with `PHASE_6_EXTRACTION_CHECKPOINT_PASS`.
- **Dataset:** 2,656 quantified proteins; 38 files recoded into two groups (`active_necrotic_granuloma`, `healthy`); active quantitation is randomforest-normalized and upstream-imputed, with 0% missing values in the saved protein-level object.
- **Contrast:** `active_necrotic_granuloma / healthy` (log2 fold change is numerator relative to denominator).

| Contrast | Quantified proteins | Significant (|log2FC| ≥ 1, q ≤ 0.05) | Upregulated | Downregulated |
|---|---:|---:|---:|---:|
| active_necrotic_granuloma / healthy | 2,656 | 982 | 664 | 318 |

These are exploratory statistics, not a batch-independent disease effect: healthy files are all labeled batch 8, while granuloma files are associated with batches 5, 6, and 9. The files have not been confirmed as independent biological subjects, and the fitted expression comparison did not adjust for batch.

## 2. Target Efficacy / Leading Perturbation Status

No single target was specified, so target efficacy is not applicable. This is a discovery comparison of TB-associated necrotic granuloma samples against healthy lung samples. There is no designated target-level measurement to compare with an experimental expectation.

## 3. Top Significantly Upregulated Proteins

Ranked by descending log2 fold change among proteins satisfying the stated thresholds. Statistical significance values preserve precision using scientific notation. The `Imputation Risk` tag distinguishes continuous quantitative shifts (`LOW`) from limit-of-detection on/off missingness shifts (`HIGH`).

| Rank | Gene symbol(s) | Accession | Description | log2FC | q-value | Imputation Risk |
|---:|---|---|---|---:|---:|---|
| 1 | SYN1 | P17600 | Synapsin-1 (Brain protein 4.1) (Synapsin I) | 6.420980 | 2.67e-03 | **HIGH** (66.7% healthy) |
| 2 | IGLC3 | P0DOY3 | Immunoglobulin lambda constant 3 | 4.974185 | 3.99e-10 | **HIGH** (83.3% healthy) |
| 3 | S100A7; PSOR1; S100A7C | P31151 | Protein S100-A7 (Psoriasin) | 4.423038 | 1.57e-06 | **HIGH** (100% healthy) |
| 4 | MZB1; MEDA7; PACAP; HSPC190 | Q8WU39 | Marginal zone B- and B1-cell-specific protein | 4.286051 | 2.19e-09 | **HIGH** (66.7% healthy) |
| 5 | MFAP2; MAGP1 | P55001 | Microfibrillar-associated protein 2 | 4.240504 | 1.08e-09 | **HIGH** (100% healthy) |
| 6 | PCOLCE; PCPE1 | Q15113 | Procollagen C-endopeptidase enhancer 1 | 4.065025 | 1.58e-12 | **HIGH** (100% healthy) |
| 7 | CFD; DF; PFD | P00746 | Complement factor D (Adipsin) | 4.053160 | 7.06e-08 | **HIGH** (66.7% healthy) |
| 8 | Immunoglobulin | P0DOX8 | Immunoglobulin lambda-1 light chain | 3.747326 | 2.76e-10 | **LOW** (0.0% healthy; 5.3% total) |
| 9 | DEFA1; DEF1; DEFA2; MRS; DEFA1B | P59665 | Neutrophil defensin 1 | 3.720646 | 4.76e-07 | **LOW** (0.0% healthy; 5.3% total) |
| 10 | ALOX5AP; FLAP | P20292 | Arachidonate 5-lipoxygenase-activating protein | 3.634010 | 4.99e-04 | **HIGH** (83.3% healthy) |

## 4. Top Significantly Downregulated Proteins

Ranked by ascending log2 fold change among proteins satisfying the stated thresholds. Statistical significance values preserve precision using scientific notation. The `Imputation Risk` tag distinguishes continuous quantitative shifts (`LOW`) from limit-of-detection on/off missingness shifts (`HIGH`).

| Rank | Gene symbol(s) | Accession | Description | log2FC | q-value | Imputation Risk |
|---:|---|---|---|---:|---:|---|
| 1 | HBG2 | P69892 | Hemoglobin subunit gamma-2 | -4.743037 | 2.92e-09 | **HIGH** (84.4% granuloma) |
| 2 | AGER; RAGE | Q15109 | Advanced glycosylation end product-specific receptor | -3.520278 | 4.74e-07 | **HIGH** (65.6% granuloma) |
| 3 | CAV1; CAV | Q03135 | Caveolin-1 | -3.234685 | 4.76e-09 | **HIGH** (87.5% granuloma) |
| 4 | LAMB3; LAMNB1 | Q13751 | Laminin subunit beta-3 | -3.151304 | 2.76e-10 | **HIGH** (87.5% granuloma) |
| 5 | EPB42; E42P | P16452 | Protein 4.2 | -3.148196 | 6.13e-08 | **HIGH** (81.2% granuloma) |
| 6 | LAMC2; LAMB2T; LAMNB2 | Q13753 | Laminin subunit gamma-2 | -3.123013 | 1.21e-09 | **HIGH** (96.9% granuloma) |
| 7 | LAMA3; LAMNA | Q16787 | Laminin subunit alpha-3 | -3.102503 | 5.80e-10 | **HIGH** (84.4% granuloma) |
| 8 | LAMA5; KIAA0533; KIAA1907 | O15230 | Laminin subunit alpha-5 | -3.049582 | 1.21e-09 | **MODERATE** (25.0% granuloma) |
| 9 | PSMB6; LMPY; Y | P28072 | Proteasome subunit beta type-6 | -3.048091 | 2.37e-06 | **HIGH** (78.1% granuloma) |
| 10 | CAVIN2; SDPR | O95810 | Caveolae-associated protein 2 | -2.953062 | 7.89e-09 | **HIGH** (93.8% granuloma) |

## 5. Top Significant Pathway Enrichments

Counts are the number of annotation terms with BH-adjusted q ≤ 0.05. Reactome accession identifiers have been resolved to their canonical pathway designations using the Reactome Content Service. Leading-edge driver proteins represent the top driving members ranked by effect size ($|\log_2\text{FC}|$).

| Annotation category | Tested terms | Significant terms |
|---|---:|---:|
| gene_ontology_biological_process | 2,385 | 38 |
| gene_ontology_cellular_component | 590 | 59 |
| gene_ontology_molecular_function | 677 | 21 |
| reactome | 940 | 129 |
| subcellular_location_cc | 91 | 7 |
| pathway | 41 | 0 |
| uni_pathway | 25 | 0 |

| Category / term | Annotation | Enrichment score | q-value | Leading Driver Proteins | Leading-Edge Count |
|---|---|---:|---:|---|---:|
| gene_ontology_cellular_component | extracellular space | 0.8763025 | 6.82e-29 | IGLC3, S100A7, PCOLCE, CFD | 272 |
| gene_ontology_cellular_component | extracellular region | 0.7705230 | 1.85e-22 | IGLC3, S100A7, MFAP2, PCOLCE | 318 |
| subcellular_location_cc | Secreted; cell membrane | 1.6004439 | 5.47e-15 | IGLC3, P0DOX8, CFD, S100A12 | 38 |
| gene_ontology_biological_process | immune response | 1.4273946 | 2.02e-13 | DEFA1, CCL19, IGHV4-34, ADAMDEC1 | 63 |
| subcellular_location_cc | Secreted | 1.3023792 | 2.70e-12 | PCOLCE, CFD, DEFA1, CCL19 | 41 |
| gene_ontology_cellular_component | immunoglobulin complex | 1.6134666 | 2.78e-12 | P0DOX8, IGHV4-34, IGLC3, IGHV3-7 | 32 |
| reactome | Regulation of Complement cascade | 1.5097070 | 7.08e-12 | IGLC3, IGHV4-34, IGHV3-7, IGLV1-51 | 40 |
| gene_ontology_biological_process | adaptive immune response | 1.3396817 | 2.47e-11 | IGLC3, P0DOX8, IL4I1, IGLV1-51 | 46 |
| gene_ontology_molecular_function | antigen binding | 1.5175885 | 1.05e-10 | IGLC3, P0DOX3, IGHV4-34, IGHV3-7 | 32 |
| reactome | FCGR activation | 1.6142485 | 2.95e-08 | IGLC3, IGHV4-34, FCGR1A, IGHV3-7 | 25 |
| reactome | Neutrophil degranulation | 0.6691893 | 2.13e-07 | S100A7, CFD, DEFA1, S100A12 | 150 |
| reactome | Classical antibody-mediated complement activation | 1.5097070 | 2.13e-07 | IGLC3, IGHV4-34, IGHV3-7, IGLV1-51 | 23 |
| reactome | Initial triggering of complement | 1.4913589 | 5.23e-07 | IGLC3, IGHV4-34, IGHV3-7, IGLV1-51 | 25 |
| reactome | Fc epsilon receptor (FCERI) signaling | 1.6750087 | 5.67e-07 | IGLC3, IGHV4-34, IGHV3-7, IGLV1-51 | 19 |
| reactome | Role of LAT2/NTAL/LAB on calcium mobilization | 1.6743693 | 6.16e-07 | IGLC3, IGHV4-34, IGHV3-7, IGLV1-51 | 19 |
| reactome | Role of phospholipids in phagocytosis | 1.5097070 | 6.49e-07 | IGLC3, IGHV4-34, FCGR1A, IGHV3-7 | 24 |
| reactome | Cell surface interactions at the vascular wall | 1.4488191 | 7.77e-07 | IGLC3, IGHV4-34, IGHV3-7, CEACAM8 | 34 |
| reactome | CD22 mediated BCR regulation | 1.6743693 | 1.41e-06 | IGLC3, IGHV4-34, IGHV3-7, IGLV1-51 | 18 |
| reactome | Laminin interactions | -1.4041435 | 1.41e-06 | LAMB3, LAMC2, LAMA3, LAMA5 | 20 |
| reactome | FCERI mediated MAPK activation | 1.5005740 | 1.43e-06 | IGLC3, IGHV4-34, IGHV3-7, IGLV1-51 | 24 |
| reactome | Immunoregulatory interactions between a Lymphoid and a non-Lymphoid cell | 1.4862726 | 3.26e-06 | IGLC3, IGHV4-34, FCGR1A, IGHV3-7 | 31 |
| reactome | Antigen activates B Cell Receptor (BCR) leading to generation of second messengers | 1.5005740 | 4.96e-06 | IGLC3, IGHV4-34, IGHV3-7, IGLV1-51 | 23 |
| reactome | FCGR3A-mediated IL10 synthesis | 1.5136477 | 9.10e-06 | IGLC3, IGHV4-34, FCGR1A, IGHV3-7 | 28 |
| reactome | FCERI mediated Ca+2 mobilization | 1.5051405 | 9.10e-06 | IGLC3, IGHV4-34, IGHV3-7, IGLV1-51 | 23 |
| gene_ontology_cellular_component | nucleoplasm | 0.0796006 | 1.23e-05 | PSMB6, ECPAS, CAVIN2, HELZ2 | 221 |
| gene_ontology_cellular_component | cytosol | 0.1964708 | 1.56e-05 | HBG2, S100A7, RPE, ARHGDIB | 613 |
| gene_ontology_biological_process | immunoglobulin mediated immune response | 1.5454804 | 3.61e-05 | IGLC3, P0DOX3, IGHV4-34, IGHV3-7 | 16 |
| gene_ontology_biological_process | complement activation, classical pathway | 1.2430895 | 4.29e-05 | C8A, C1RL, C9, C7 | 21 |
| gene_ontology_cellular_component | Z disc | -0.6222374 | 4.39e-05 | ANK1, KRT19, FHL2, SLC4A1 | 23 |
| gene_ontology_molecular_function | heparin binding | 1.2291120 | 4.42e-05 | PCOLCE, LAMC2, CCN5, GPNMB | 39 |

Enrichment is reported in immune response/adaptive immune response, immunoglobulin complex and antigen binding, extracellular/secreted annotations, and complement activation (Regulation of Complement cascade, Initial triggering of complement, Classical antibody-mediated complement activation). Reactome pathways have been resolved to their canonical biological designations, and driving member proteins are explicitly mapped. Pathway and UniPathway categories had no terms at q ≤ 0.05.

## 6. Primary Empirical Data Summary

The saved protein dataset contains 2,656 quantified identifiers and the expression contrast reports 982 proteins meeting both the absolute log2-fold-change threshold of 1 and BH q-value threshold of 0.05: 664 higher and 318 lower in the granuloma numerator group relative to healthy. The leading positive fold changes include SYN1, IGLC3, S100A7, MZB1, and MFAP2; the largest negative fold changes include HBG2, AGER, CAV1, and laminin subunits. Enrichment results include immune-related, extracellular, and secreted annotations, with Reactome and subcellular-location terms also represented. The analysis is limited by possible disease/batch confounding, unverified biological independence of files, and the existing upstream imputation. Accordingly, these results are descriptive associations for this dataset and should not be read as causal or batch-independent disease effects.
