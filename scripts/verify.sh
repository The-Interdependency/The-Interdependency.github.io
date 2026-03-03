#!/bin/bash
set -euo pipefail

echo "Running site verification checks..."
VERIFICATION_FAILED=0

# --- Check for required canon files and patterns (Section 5.1 & 14) ---
REQUIRED_CANON_FILES_STATIC=(
    "canon/definitions/definitions_invariants.md"
    "canon/hmmm/hmmm.json"
)

REQUIRED_CANON_FILE_PATTERNS=(
    "canon/tiw/tiw.v*.md" # Check for at least one versioned TIW file
    "canon/releases/release-*.json" # Check for at least one release manifest
)

for file in "${REQUIRED_CANON_FILES_STATIC[@]}"; do
    if [[ ! -f "$file" ]]; then
        echo "ERROR: Required canon file missing: $file"
        VERIFICATION_FAILED=1
    else
        echo "OK: Canon file present: $file"
    fi
done

for pattern in "${REQUIRED_CANON_FILE_PATTERNS[@]}"; do
    if ! compgen -G "$pattern" > /dev/null; then
        echo "ERROR: Required canon file pattern missing: $pattern (e.g., no matching file found)"
        VERIFICATION_FAILED=1
    else
        echo "OK: Canon file pattern present: $pattern"
    fi
done

# --- Check for required IA pages (Section 4.1 & 14) ---
# Assuming .md extension for content pages, and index.html for the root
REQUIRED_IA_PAGES=(
    "index.html" # Assuming the root page is index.html
    "site/pages/read/preamble.md"
    "site/pages/read/articles.md"
    "site/pages/read/definitions.md"
    "site/pages/read/faq.md"
    "site/pages/canon/index.md"
    "site/pages/canon/releases.md"
    "site/pages/canon/changelog.md"
    "site/pages/canon/provenance.md"
    "site/pages/systems/edcm.md"
    "site/pages/systems/pcna.md"
    "site/pages/systems/ptca.md"
    "site/pages/systems/a0.md"
    "site/pages/tools/a0.md"
    "site/pages/tools/edcm.md"
    "site/pages/tools/repo.md"
    "site/pages/contribute/index.md"
    "site/pages/contribute/security.md"
    "site/pages/contribute/contact.md"
)

for page in "${REQUIRED_IA_PAGES[@]}"; do
    if [[ ! -f "$page" ]]; then
        echo "ERROR: Required IA page missing: $page"
        VERIFICATION_FAILED=1
    else
        echo "OK: IA page present: $page"
    fi
done


# --- Check for forbidden "PCTA" string (Section 6 & 14) ---
# Exclude spec.md and this verify.sh script from the check
if grep -Ril "PCTA" . --exclude="*.sh" --exclude="spec.md" --exclude-dir=".git" --exclude-dir="node_modules"; then
    echo "ERROR: The forbidden string 'PCTA' was found in files other than exclusions. Please correct to 'PTCA'."
    VERIFICATION_FAILED=1
else
    echo "OK: 'PCTA' string not found outside of specified exclusions."
fi

# --- Final Verdict ---
if [[ $VERIFICATION_FAILED -eq 1 ]]; then
    echo "VERIFICATION FAILED: One or more critical checks did not pass."
    exit 1
else
    echo "VERIFICATION PASSED: All checks completed successfully."
    exit 0
fi