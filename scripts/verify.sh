#!/bin/bash

# This script performs basic checks for a GitHub Pages site.

echo "Running site verification checks..."

# Check for the existence of key files
if [ -f "index.html" ]; then
    echo "✔ index.html found."
else
    echo "✖ index.html not found. A main entry point is recommended."
    exit 1
fi

if [ -f "_config.yml" ]; then
    echo "✔ _config.yml found. Assuming Jekyll or similar configuration."
else
    echo "ℹ _config.yml not found. This is optional for simple static sites."
fi

echo "Site verification complete."
exit 0
