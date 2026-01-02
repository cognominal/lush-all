#!/bin/sh
set -e

status=$(git status --porcelain=v1)
if [ -z "$status" ]; then
  exit 0
fi

# Keep only paths, handling rename output like "old -> new".
paths=$(printf '%s\n' "$status" | sed -E 's/^.. //' | sed -E 's/.* -> //')
# Flag likely module/source files that should be committed for test runs.
module_changes=$(printf '%s\n' "$paths" | grep -E '\\.(ts|tsx|js|jsx|mjs|cjs|mts|cts|svelte)$' || true)

if [ -n "$module_changes" ]; then
  echo "Uncommitted module files detected (commit before pushing):"
  echo "$module_changes"
  exit 1
fi
