# =====================================================================
# Script Name: 00_install.R
# Purpose: Check and automatically install missing dependencies
#          and the tidyproteomics package from GitHub.
# =====================================================================

# Ensure macOS compiler environment is valid if Command Line Tools are installed
if (Sys.info()["sysname"] == "Darwin" && Sys.getenv("DEVELOPER_DIR") == "") {
    if (file.exists("/Library/Developer/CommandLineTools")) {
        test_clang <- suppressWarnings(tryCatch(system2("clang", "--version", stdout = FALSE, stderr = FALSE), error = function(e) 1))
        if (test_clang != 0) {
            Sys.setenv(DEVELOPER_DIR = "/Library/Developer/CommandLineTools")
        }
    }
}

# 1. Ensure core installation helpers are present
if (!requireNamespace("BiocManager", quietly = TRUE)) {
    install.packages("BiocManager")
}
if (!requireNamespace("remotes", quietly = TRUE)) {
    install.packages("remotes")
}

# 2. Define package groups based on source
cran_packages <- c(
    "babelgene", "broom", "cli", "DBI", "digest", "doParallel", "dplyr", "duckdb",
    "e1071", "eulerr", "forcats", "ggplot2", "ggrepel", "glue", "gridExtra",
    "jsonlite", "knitr", "magrittr", "missForest", "pdftools", "pheatmap",
    "prettyunits", "purrr", "randomForest", "RColorBrewer", "readr", "readxl",
    "rlang", "scales", "stringr", "testthat", "tibble", "tidyr", "tidyselect",
    "vroom", "writexl"
)
bioc_packages <- c("BiocParallel", "Biostrings", "fgsea", "limma", "MSstats")
optional_bioc_packages <- character(0)
github_package <- "jeffsocal/tidyproteomics"

# 3. Helper function to check and install missing packages
install_missing <- function(pkgs, type = "cran") {
    installed <- rownames(installed.packages())
    missing_pkgs <- pkgs[!(pkgs %in% installed)]
    if (length(missing_pkgs) > 0) {
        message(sprintf("\n-> Installing %d missing %s package(s): %s", length(missing_pkgs), type, paste(missing_pkgs, collapse = ", ")))
        if (type == "cran") {
            install.packages(missing_pkgs, dependencies = TRUE)
        } else if (type == "bioc") {
            BiocManager::install(missing_pkgs, update = FALSE, ask = FALSE)
        }
    } else {
        message(sprintf("-> All %s packages are already installed.", type))
    }
}

# 4. Execute installations
message("Checking CRAN dependencies...")
install_missing(cran_packages, type = "cran")
message("\nChecking Bioconductor dependencies...")
install_missing(bioc_packages, type = "bioc")

# Optional Bioconductor packages (graceful fallback if compilation or download fails)
if (length(optional_bioc_packages) > 0) {
    message("\nChecking optional annotation packages...")
    for (pkg in optional_bioc_packages) {
        if (!pkg %in% rownames(installed.packages())) {
            message(sprintf("-> Checking optional package %s (non-fatal)...", pkg))
            tryCatch({
                BiocManager::install(pkg, update = FALSE, ask = FALSE)
            }, error = function(e) {
                message(sprintf("   Notice: Optional package %s could not be installed: %s", pkg, e$message))
                message("   (This does not affect core tidyproteomics analysis or pipeline execution).")
            })
        } else {
            message(sprintf("-> Optional package %s is already installed.", pkg))
        }
    }
}

message("\nChecking tidyproteomics (GitHub)...")
if (!("tidyproteomics" %in% rownames(installed.packages()))) {
    message("-> Installing tidyproteomics from GitHub...")
    remotes::install_github(github_package, upgrade = "never")
} else {
    message("-> tidyproteomics is already installed.")
}

# 5. Expose environment and dependency versions
message("\n=====================================================")
message(" Environment & Dependency Version Summary")
message("=====================================================")
message(sprintf("R Version:              %s", R.version.string))
message(sprintf("Platform:               %s", R.version$platform))
tp_version <- tryCatch(as.character(packageVersion("tidyproteomics")), error = function(e) "NOT INSTALLED")
message(sprintf("tidyproteomics Version: %s", tp_version))

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
    unique(c(extract_fields(desc$Depends), extract_fields(desc$Imports), extract_fields(desc$Suggests)))
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
