# Mtb human lung Knowledge Database

> **Accounting & Provenance Report**: Comprehensive structured index of molecular assertions, experimental contexts, and biomedical sources ingested into the active literature knowledge database.

---

## 1. Database Title & Metadata

- **Database Title**: Mtb human lung Knowledge Database
- **Database Label**: `mtb_human_lung`
- **Storage Engine**: DuckDB (Columnar Analytical Database Engine)
- **Schema Version**: `v2` (Generic Perturbation-Centric Knowledge Graph: `studies` -> `experimental_contexts` -> `molecular_assertions`)
- **Active File Path**: `mtb_human_lung.duckdb` (6,041,600 bytes)
- **Date Created**: `2026-10-20T14:36:00-0700`
- **Last Date Updated**: `2026-10-20 21:57:32.018`
- **Accounting Verified**: `2026-10-20 17:12 -0700`

---

## 2. Executive Summary

The **Mtb human lung Knowledge Database** is a curated, perturbation-centric molecular knowledge graph constructed to contextualize high-resolution mass spectrometry and whole-cell proteomics workflows. The database captures the multidimensional molecular dynamics across 24 peer-reviewed publications and data sources spanning 1997 to 2024.

Within the **TidyProteomicsAgent** pipeline architecture, this database serves as the automated reasoning foundation for **Phase 09 (Literature Knowledge Database Interrogation)** and **Phase 10 (Scientific Manuscript Synthesis)**. It enables two-way programmatic graph-hops via `tools/literature/query_literature.R` to retrieve literature-asserted co-factors, physical interactors, and downstream targets, which are subsequently reverse-interrogated against unthresholded experimental proteomics datasets (`data/tidyproteomics_data.rds` via `tools/literature/interrogate_unthresholded_proteomics.R`). This empowers the agent to identify coordinated sub-threshold shifts and resolve biological mechanisms that fall below strict single-protein statistical cutoffs.

---

## 3. Database Content & Statistical Accounting

### 3.1 Primary Corpus Totals

| Metric | Count | Description |
|:---|:---:|:---|
| **Indexed Sources / Files** | **24** | Full-text peer-reviewed papers and supplementary datasets parsed and indexed |
| **Experimental Contexts** | **73** | Distinct biological conditions, host models, tissue types, and perturbation regimens |
| **Molecular Assertions** | **1149** | Discrete subject-predicate-object knowledge edges extracted with verbatim evidence |
| **Canonical Human Symbols** | **436** | Unique normalized HGNC / Ensembl human gene and protein identifiers |
| **Pathogen / Unmapped Entities** | **575** | Unique organism-specific locus tags, antigens, and unmapped entities |
| **Represented Organisms** | **5** | Distinct species across experimental contexts |
| **Biological Model Systems** | **62** | Cell lines, primary tissues, biofluids, and in vivo models |
| **Perturbation Regimens** | **49** | Unique perturbation targets, infections, treatments, and cohorts |

### 3.2 Breakdown by Knowledge Relationship Type

| Relationship Type | Assertions | % of Total |
|:---|:---:|:---:|
| `ACCUMULATES_UP` | 403 | 35.1% |
| `COMPENSATORY_PATHWAY` | 354 | 30.8% |
| `DEPLETED_DOWN` | 164 | 14.3% |
| `NO_CHANGE` | 131 | 11.4% |
| `PHYSICAL_INTERACTOR` | 79 | 6.9% |
| `DIRECT_SUBSTRATE` | 18 | 1.6% |

### 3.3 Breakdown by Assay Modality

| Assay Modality | Contexts |
|:---|:---:|
| whole_cell_proteomics | 16 |
| western_blot | 9 |
| survival | 5 |
| CFU_bacterial_load, survival, RPA, histology, immunocytochemistry | 4 |
| Label-free plasma exosome proteomics by LC-MS/MS | 4 |
| RNA_seq | 4 |
| histopathology; CFU_enumeration | 4 |
| CFU plating; histology; flow cytometry; cytokine bead array; RNase protection assay | 3 |
| functional immune assays | 3 |
| microarray_transcriptomics | 3 |

### 3.4 Top Functional Modules Represented

| Functional Module | Assertions |
|:---|:---:|
| Complement and coagulation cascades | 24 |
| Glycolysis | 19 |
| Acute phase response | 16 |
| Adaptive antimycobacterial immunity | 16 |
| Acute-phase response; inflammation | 10 |
| Polyketide synthesis; complex lipid biosynthesis | 9 |
| IFNγ response | 8 |
| Unassigned proteins | 8 |
| Glucose uptake | 7 |
| MHC class II antigen presentation | 7 |

---

## 4. Ingested Sources Index

The table below lists all peer-reviewed studies and data sources currently indexed in the active knowledge database, sorted chronologically:

| # | Year | Study / Publication | Organism & Model | Modality | Assertions | Key Asserted Genes & Modules |
|:---:|:---:|:---|:---|:---|:---:|:---|
| 1 | 1997 | Progression of chronic pulmonary tuberculosis in mice aerogenically infected with virulent Mycobacterium tuberculosis | Mus musculus (C57BL/6) | histopathology; CFU_enumeration | 14 | MACROPHAGES, LYMPHOCYTES, CHEMOKINES `[Downregulation of protective immune responses]` |
| 2 | 1999 | [Comparative proteome analysis of Mycobacterium tuberculosis and Mycobacterium bovis BCG strains: towards functional genomics of microbial pathogens](https://doi.org/10.1046/j.1365-2958.1999.01549.x) | Mycobacterium bovis, Mycobacterium tuberculosis (BCG Chicago, H37Rv, Erdman, BCG Copenhagen, H37Rv culture supernatant) | whole_cell_proteomics | 44 | L-alanine dehydrogenase (40 kDa antigen; ald; Rv2780), 2-isopropylmalate synthase (leuA; Rv3710), Nicotinate-nucleotide pyrophosphatase (nadC; Rv1596), MPT64/MPB64 (Rv1980c), Conserved hypothetical protein Rv2449c, Conserved hypothetical protein Rv0036c `[Oxidative stress response]` |
| 3 | 2001 | [The Relative Importance of T Cell Subsets in Immunity and Immunopathology of Airborne Mycobacterium tuberculosis Infection in Mice](https://doi.org/10.1084/jem.193.3.271) | Mus musculus (C57BL/6 wild-type mice, C57BL/6 TCR-α-chain-deficient mice, C57BL/6 TCR-δ-chain-deficient mice, C57BL/6 H-2Aβ-deficient mice, C57BL/6 β2-microglobulin-deficient mice, C57BL/6 IFN-γ-deficient mice, C57BL/6 NOS2-deficient mice, C57BL/6 thymectomized mice) | CFU_bacterial_load, survival, RPA, histology, immunocytochemistry, CFU_bacterial_load, survival, survival | 50 | NOS2, IL-4, IL-15, IL-10, IL-13, IL-2 *(+3 more)* `[Adaptive antimycobacterial immunity]` |
| 4 | 2003 | [Mycobacterium tuberculosis infection causes different levels of apoptosis and necrosis in human macrophages and alveolar epithelial cells](https://doi.org/10.1046/j.1462-5822.2003.00312.x) | Homo sapiens (U937, A549, Human monocyte-derived macrophages, THP-1, U937 and A549) | western_blot, RNA_seq | 39 | BCL2, BAD, BAX, BCL-X, BCL-W, PIG8 *(+10 more)* `[Caspase-mediated apoptosis]` |
| 5 | 2004 | [The temporal expression profile of Mycobacterium tuberculosis infection in mice](https://doi.org/10.1073/pnas.0306023101) | Mus musculus, Mycobacterium tuberculosis (BALB/c mice, BALB/c SCID/SCID mice, M. tuberculosis H37Rv culture in Middlebrook 7H9 broth) | microarray_transcriptomics | 23 | RUBB, DINF, FDXA, PROZ, ACEAA, SIGK *(+10 more)* `[In vivo adaptation; low-pH and DNA-damage stress response]` |
| 6 | 2005 | [Disruption of granulocyte macrophage-colony stimulating factor production in the lungs severely affects the ability of mice to control Mycobacterium tuberculosis infection](https://doi.org/10.1189/jlb.1204723) | Mus musculus (GM-CSF knockout mice on a C57BL/6 background, SPC-GM+ transgenic mice on a GM-CSF knockout background, Wild-type C57BL/6 mice) | CFU plating; histology; flow cytometry; cytokine bead array; RNase protection assay | 30 | GM-CSF, IL-6, CD40, CD4, CD8, IL-12 *(+1 more)* `[Pulmonary macrophage and dendritic-cell maturation; host defense]` |
| 7 | 2006 | Modelling the Human Immune Response Mechanisms to Mycobacterium tuberculosis Infection in the Lungs | Homo sapiens (Human TB lung mathematical model) | mathematical_model | 32 | GRANULYSIN, PERFORIN, GRANZYMES, MACROPHAGES, MONOCYTES, CHEMOKINES `[CTL-mediated cytolysis]` |
| 8 | 2010 | [Dynamic antibody responses to the Mycobacterium tuberculosis proteome](https://doi.org/10.1073/pnas.1009080107) | Homo sapiens, Mus musculus (TB suspects: active TB and non-TB disease (NTBD), Infected mice (model details not specified in the provided text)) | protein_microarray | 5 | RV0934, RV0984, RV1411C, RV3804C, RV3881C `[M. tuberculosis immunoproteome; humoral immune response]` |
| 9 | 2010 | [Using a Label-free Proteomics Method to Identify Differentially Abundant Proteins in Closely Related Hypo- and Hypervirulent Clinical Mycobacterium tuberculosis Beijing Isolates](https://doi.org/10.1074/mcp.M900422-MCP200) | Mycobacterium tuberculosis, Mus musculus (Cultured clinical Beijing genotype isolates: hypervirulent and hypovirulent strains, BALB/c mice infected with clinical Beijing genotype isolates) | whole_cell_proteomics, qPCR, western_blot | 17 | ESAT-6, PPSA, FADD28, DOSR, STF3, RV1773 *(+3 more)* `[Host immune response; PGL-mediated immune modulation]` |
| 10 | 2010 | [Portrait of a Pathogen: The Mycobacterium tuberculosis Proteome In Vivo](https://doi.org/10.1371/journal.pone.0013938) | Cavia porcellus (Guinea pig aerosol infection with M. tuberculosis H37Rv) | whole_cell_proteomics | 92 | CTPV, CTPB, CTPD, CTPE, CTPF, CTPG *(+63 more)* `[Polyketide synthesis; complex lipid biosynthesis]` |
| 11 | 2011 | [Pathogenesis, Immunology, and Diagnosis of Latent Mycobacterium tuberculosis Infection](https://doi.org/10.1155/2011/814943) | Mus musculus (Mouse models discussed in cited literature) | literature_review | 77 | TLR2, TLR4, CD207, DC-SIGN, DECTIN-1, MYD88 *(+17 more)* `[Phagosome maturation]` |
| 12 | 2011 | [Profiling Early Lung Immune Responses in the Mouse Model of Tuberculosis](https://doi.org/10.1371/journal.pone.0016161) | Mus musculus (C57BL/6 mice) | microarray_gene_expression, flow_cytometry | 98 | HSPA1B, HSPA1A, HSPA5, HSPA2, HSPA14, TLR1 *(+67 more)* `[IFNγ response]` |
| 13 | 2011 | Human Lung Immunity against Mycobacterium tuberculosis: Insights into Pathogenesis and Protection | Homo sapiens, Mus musculus (Bronchoalveolar cells (BACs), including alveolar macrophages and lymphocytes, Bronchoalveolar cells from healthy M.tb-exposed household contacts, Murine mycobacterial infection models) | functional immune assays | 95 | IFN-GAMMA, TNF-ALPHA, IL-12, IL-4, IL-10, TGF-BETA *(+27 more)* `[Pattern recognition and M.tb uptake]` |
| 14 | 2012 | [Proteomic analysis of sputum in patients with active pulmonary tuberculosis](https://doi.org/10.1111/j.1469-0691.2012.03824.x) | Homo sapiens (Sputum from patients with active pulmonary tuberculosis and healthy controls) | 2D gel electrophoresis, MALDI-TOF/TOF mass spectrometry, and IL-25 ELISA | 72 | ALBUMIN-LIKE, PRO2675, PRO2044, PRO1708, PRO2619, TRANSFERRIN *(+18 more)* `[Acute phase response]` |
| 15 | 2013 | Proteomic analysis of purified protein derivative of Mycobacterium tuberculosis | Mycobacterium tuberculosis (PPD-CT68 prepared from M. tuberculosis Johnston strain culture) | whole_cell_proteomics | 46 | DNAK, GROEL, GROEL2, GROES, MPT83, ACPP *(+18 more)* `[Tricarboxylic acid cycle; immunoproteome]` |
| 16 | 2014 | [Mycobacterium tuberculosis in the Proteomics Era](https://doi.org/10.1128/microbiolspec.MGM2-0020-2013) | Mycobacterium tuberculosis (M. tuberculosis and BCG culture supernatants, Hypoxic, nonreplicating M. tuberculosis culture, M. tuberculosis culture in physiological saline, Standing and long-term stationary-phase cultures, Ex vivo infected host cells (host-cell type not specified)) | whole_cell_proteomics | 25 | ESAT-6, CFP-10, RV1198, RV1793, RV0243, HSPX *(+4 more)* `[Carbon-starvation response; hypothetical protein]` |
| 17 | 2015 | [Infection with Mycobacterium tuberculosis induces the Warburg effect in mouse lungs](https://doi.org/10.1038/srep18176) | Mus musculus (C57BL/6 mouse) | RNA_seq, immunofluorescence_microscopy | 80 | ADPGK, PFK-1, PFKFB1, PFKFB2, PFKFB4, PFKFB3 *(+16 more)* `[Glycolysis]` |
| 18 | 2018 | [Mycobacterium tuberculosis: An Adaptable Pathogen Associated With Multiple Human Diseases](https://doi.org/10.3389/fcimb.2018.00158) | Mus musculus, Homo sapiens (Multiple cited animal infection models, Human immune and tissue cells discussed in cited studies, Patients with tuberculosis and associated diseases) | review synthesis | 85 | PTPA, PTPB, UBIQUITIN, TRIM27, MCE3E, MCE3C *(+41 more)* `[Adaptive antimycobacterial immunity]` |
| 19 | 2018 | [Mycobacterium tuberculosis Invasion of the Human Lung: First Contact](https://doi.org/10.3389/fimmu.2018.01346) | Homo sapiens (human lung tissue explants, FACS-sorted human lung alveolar macrophages, epithelial cells, endothelial cells, γ/δ T cells, MAIT cells, NK cells, and NKT cells, FACS-sorted human lung innate lymphoid cells (ILC1, ILC2, ILC3 NKp44-negative and NKp44-positive subsets)) | microarray_gene_expression; Luminex cytokine/chemokine assay, RNA_seq | 27 | IL1B, IL23A, IL17, TSLP, IL33, IL15 *(+7 more)* `[Group 2 ILC effector cytokines]` |
| 20 | 2019 | [High-resolution quantitative proteomics applied to the study of the specific protein signature in the sputum and saliva of active tuberculosis patients and their infected and uninfected contacts](https://doi.org/10.1016/j.jprot.2019.01.010) | Homo sapiens (Active pulmonary TB patients, LTBI contacts, and exposed uninfected contacts) | whole_cell_proteomics | 41 | HAPTOGLOBIN, MUCIN-7, MAMMAGLOBIN-B, DERMCIDIN, CYSTATIN-F `[Acute-phase response; inflammation]` |
| 21 | 2020 | [Proteomic Profiling Reveals the Architecture of Granulomatous Lesions Caused by Tuberculosis and Mycobacterium avium Complex Lung Disease](https://doi.org/10.3389/fmicb.2019.03081) | Homo sapiens (Surgically resected human lung TB granulomas (FFPE), Surgically resected human lung MAC-LD granulomas (FFPE), TB and MAC-LD lung granuloma sub-compartments (FFPE)) | laser_microdissection_LC-MS/MS_proteomics; immunohistochemistry, laser_microdissection_LC-MS/MS_proteomics | 20 | S100A9, PSMB3, PSMA3, PSMA4, PSMB4 `[Cellular region; proteasome]` |
| 22 | 2021 | [Evolution of Drug-Resistant Mycobacterium tuberculosis Strains and Their Adaptation to the Human Lung Environment](https://doi.org/10.3389/fmicb.2021.612675) | Homo sapiens (unspecified) | proteomics | 44 | RPOB, RPOA, RPOC, AHPC, GLPK, MMPL3 *(+13 more)* `[Cell-envelope lipid remodeling]` |
| 23 | 2023 | [Comparative Proteomic Analysis of Exosomes Derived from Patients Infected with Non-Tuberculous Mycobacterium and Mycobacterium tuberculosis](https://doi.org/10.3390/microorganisms11092334) | Homo sapiens (Patients with pulmonary M. abscessus (MAB) infection, Patients with pulmonary M. intracellulare (MAC) infection, Patients with pulmonary M. abscessus (MAB) versus M. intracellulare (MAC) infection, Patients with active pulmonary drug-sensitive tuberculosis) | Label-free plasma exosome proteomics by LC-MS/MS | 41 | C1R, C1S, C2, MASP2, C4B, CFI *(+23 more)* `[Complement and coagulation cascades]` |
| 24 | 2024 | [Integrated plasma proteomics identifies tuberculosis-specific diagnostic biomarkers](https://doi.org/10.1172/jci.insight.173273) | Homo sapiens (South African and Peruvian pulmonary TB and healthy-control cohorts, UK-based MIMIC cohort, South African independent validation cohort) | whole_cell_proteomics, western_blot | 52 | MMP2, TIMP2, FETUB, SERPINA3, SERPINA4, SERPINA5 *(+26 more)* `[Response to bacterium; TB diagnostic biomarker]` |

---

## 5. Programmatic & Dynamic Interrogation

To explore specific assertions, physical interactors, or evidence quotes for any gene or module, use the dedicated query interfaces:

```bash
# Search assertions by gene symbol, alias, or module:
Rscript tools/literature/literature_cli.R search mtb_human_lung.duckdb "<symbol>"

# Two-way graph-hop interrogation for pipeline synthesis:
Rscript tools/literature/query_literature.R mtb_human_lung.duckdb "<seed_genes>" "<pathway_terms>" 20
```

> **Tip**: Granular assertion details, experimental condition parameters, and verbatim evidence quotes remain indexed in DuckDB for zero-token-overhead programmatic analysis.

