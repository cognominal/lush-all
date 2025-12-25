# Docs route spec

## Scope

A filesystem-backed docs browser with a left file tree and a right markdown
viewer. This page is implemented in `svelte-app/src/routes/docs`.

## Current implementation

### Layout

- Two-pane layout with a draggable vertical divider.
- File tree defaults to 25% width, document view to 75%.
- The doc view always stays on the right.
- A breadcrumb bar is shown at the bottom. Clicking a crumb focuses the
  folder in the tree and scrolls it into view.

### File tree

- Tree is built from the repo root (`../` from `svelte-app`).
- Only `.md` files are shown.
- `node_modules`, `.git`, `dist`, `.svelte-kit`, and `build` are skipped.
- `summaries` and `day-summary` folders start collapsed.
- Tree is vertically scrollable.
- Clicking a file navigates to `?path=...`.

### Markdown rendering

- Uses `marked` (same library as svelte.dev) with a custom renderer.
- Custom renderer adds Tailwind classes for headings, paragraphs, lists,
  code blocks, blockquotes, and links.
- Relative `.md` links are rewritten to `/docs?path=...` based on the current
  document location so they work in-app while staying GitHub-compatible in
  the source file.
- Rewritten links include `data-doc-path` (resolved repo path) and
  `data-source-href` (original markdown href).
- External links open in a new tab; internal doc links stay in-app.
- No svelte.dev docs processing pipeline is used yet.

### Search

- Search bar with:
  - Scope toggle: Filenames vs Docs (content search)
  - Mode toggle: Text vs Regex
- Submitting search filters the tree to only folders that lead to matched
  files and selects the first match.
- Invalid regex shows a non-fatal error banner and keeps the tree unfiltered.
- A Clear button resets to `/docs`.

## Files

- `svelte-app/src/routes/docs/+page.server.ts`
- `svelte-app/src/routes/docs/+page.svelte`
- `svelte-app/src/lib/docs/FileTree.svelte`
- `svelte-app/src/lib/docs/TreeItem.svelte`
- `svelte-app/src/lib/docs/types.ts`

## Known limitations

- Search results are not highlighted in the markdown view.
- No glossary popups yet.
- Docs are not prerendered (`prerender = false`).
