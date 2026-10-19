# =====================================================================
# Script Name: 00_environment.R
# Purpose: Check and automatically install missing dependencies 
#          and the tidyproteomics package from GitHub.
# =====================================================================

# 1. Ensure core installation helpers are present
if (!requireNamespace("BiocManager", quietly = TRUE)) {
    install.packages("BiocManager")
}

if (!requireNamespace("remotes", quietly = TRUE)) {
    install.packages("remotes")
}

# 2. Define package groups based on source
cran_packages <- c(
    "broom", "cli", "digest", "doParallel", "dplyr", "e1071", "eulerr", 
    "forcats", "ggplot2", "ggrepel", "glue", "gridExtra", "magrittr", 
    "missForest", "pheatmap", "prettyunits", "purrr", "randomForest", 
    "RColorBrewer", "readr", "readxl", "rlang", "scales", "stringr", 
    "tibble", "tidyr", "tidyselect", "vroom", "writexl", "knitr", "testthat"
)

bioc_packages <- c(
    "BiocParallel", "Biostrings", "fgsea", "limma", "MSstats"
)

github_package <- "jeffsocal/tidyproteomics"

# 3. Helper function to check and install missing packages
install_missing <- function(pkgs, type = "cran") {
    installed <- rownames(installed.packages())
    missing_pkgs <- pkgs[!(pkgs %in% installed)]
    
    if (length(missing_pkgs) > 0) {
        message(sprintf("\n-> Installing %d missing %s package(s): %s", 
                        length(missing_pkgs), type, paste(missing_pkgs, collapse = ", ")))
        
        if (type == "cran") {
            install.packages(missing_pkgs, dependencies = TRUE)
        } else if (type == "bioc") {
            BiocManager::install(missing_pkgs, update = FALSE, ask = FALSE)
        }
    } else {
        message(sprintf("-> All %s packages are already installed.", type))
    }
}

# 4. Execute Installations
message("Checking CRAN dependencies...")
install_missing(cran_packages, type = "cran")

message("\nChecking Bioconductor dependencies...")
install_missing(bioc_packages, type = "bioc")

message("\nChecking tidyproteomics (GitHub)...")
if (!("tidyproteomics" %in% rownames(installed.packages()))) {
    message("-> Installing tidyproteomics from GitHub...")
    remotes::install_github("jeffsocal/tidyproteomics", upgrade = "never")
} else {
    message("-> tidyproteomics is already installed.")
}

# 5. Expose Environment and Dependency Versions
message("\n=====================================================")
message(" Environment & Dependency Version Summary")
message("=====================================================")
message(sprintf("R Version:              %s", R.version.string))
message(sprintf("Platform:               %s", R.version$platform))

tp_version <- tryCatch(as.character(packageVersion("tidyproteomics")), error = function(e) "NOT INSTALLED")
message(sprintf("tidyproteomics Version: %s", tp_version))

# Collect and report all tidyproteomics dependencies
extract_deps <- function(pkg_name) {
    if (!pkg_name %in% rownames(installed.packages())) return(character(0))
    desc <- packageDescription(pkg_name)
    extract_fields <- function(field_val) {
        if (is.null(field_val) || is.na(field_val)) return(character(0))
        raw <- unlist(strsplit(field_val, ","))
        clean <- sub("[(].*[)]", "", raw)
        clean <- gsub("[[:space:]]+", "", clean)
        clean[clean != "" & clean != "R"]
    }
    unique(c(
        extract_fields(desc$Depends),
        extract_fields(desc$Imports),
        extract_fields(desc$Suggests)
    ))
}

all_deps <- sort(unique(c(cran_packages, bioc_packages, extract_deps("tidyproteomics"))))

message(sprintf("\nInstalled Dependencies (%d packages):", length(all_deps)))
for (pkg in all_deps) {
    ver <- tryCatch(as.character(packageVersion(pkg)), error = function(e) "not installed")
    message(sprintf("  - %-16s : %s", pkg, ver))
}

message("\n=====================================================")
message(" Setup complete! All required packages are ready to use.")
message("=====================================================")

