#!/bin/sh

WIKI_DIR="${WIKI_DIR:-/wiki-content}"
APP_DIR="/app"

echo "=== WikiApp Dev Mode ==="
echo "Wiki content: ${WIKI_DIR}"

# Step 1: Initial generate (allow failure — dev server can still serve)
echo "Generating config and preprocessing..."
WIKI_DIR="${WIKI_DIR}" npx tsx "${APP_DIR}/.vitepress/scripts/generate-sidebar.ts" || echo "⚠️ Generate had errors, continuing..."

# Step 2: Start file watcher in background (auto regenerate on 99-wiki changes)
echo "Starting file watcher..."
WIKI_DIR="${WIKI_DIR}" npx tsx "${APP_DIR}/.vitepress/scripts/watch-wiki.ts" &
WATCHER_PID=$!

# Step 3: VitePress dev server (HMR, auto-reload)
echo "Starting VitePress dev server at http://0.0.0.0:80..."
exec npx vitepress dev "${APP_DIR}" --port 80 --host 0.0.0.0
