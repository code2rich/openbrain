#!/bin/sh
set -e

WIKI_DIR="${WIKI_DIR:-/wiki-content}"
APP_DIR="/app"

echo "=== WikiApp Build ==="
echo "Wiki content: ${WIKI_DIR}"

# Step 1: Generate config + preprocess wiki files + create symlink
echo "Generating config and preprocessing..."
WIKI_DIR="${WIKI_DIR}" npx tsx "${APP_DIR}/.vitepress/scripts/generate-sidebar.ts"

# Step 2: Build VitePress site
echo "Building VitePress site..."
npx vitepress build "${APP_DIR}"

echo "=== Build complete ==="

# Step 3: Serve static site (API runs on host separately)
echo "Serving VitePress site at http://0.0.0.0:80"
exec npx serve "${APP_DIR}/.vitepress/dist" -l 80
