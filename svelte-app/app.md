# App Overview

This folder contains a SvelteKit app that prototypes a YAML “structural editor” UI backed by `yaml/` (this repo) + `lush-types/`.

## What You See

### Left pane: YAML editor (CodeMirror)
- Loads `YAML_SAMPLE` into a CodeMirror 6 editor.
- Moving the cursor updates the “current selection” (cursor-based).
- Folding:
  - Clicking a breadcrumb toggles fold/unfold of that YAML node’s range in the editor.
- Editing:
  - Only the Return/Enter key is intercepted.
  - When the cursor is inside a *block sequence* item, Enter inserts a new empty item (`- `) on the next line after the current item block.
  - Block map behavior is intentionally left for later.

### Breadcrumb bar (under the editor)
- Shows a path of YAML node token types from `document` down to the node that contains the cursor.
- Hovering a breadcrumb:
  - Highlights the corresponding node span in the editor.
  - Also drives the right pane’s “selected token” display (see below).

### Right pane: selected `InputToken` as YAML
- Shows a YAML serialization of the currently selected `lush-types` `InputToken`.
- The selection for this pane is driven by:
  - the cursor position, unless
  - you are hovering a breadcrumb, in which case it uses the hovered node’s start offset.
- Subtokens are omitted (only the top-level token fields are included).

## How It Works (high level)

- `yaml/lushify()` is used to generate a `TokenMultiLine` from the YAML text (the “lushified” multiline token structure).
- `yaml/parseDocument(..., { keepSourceTokens: true })` is used to get nodes with source ranges and CST token types, which are used to:
  - compute breadcrumb paths (`document -> ... -> node.type`)
  - provide `{from,to}` ranges for hover highlight and folding
- The core model/selection logic is kept outside of Svelte components so it can later be reused for a TUI.

## Key files
- `svelte-app/src/routes/+page.svelte` — layout + wiring between panes and interactions.
- `svelte-app/src/lib/components/YamlEditor.svelte` — CodeMirror editor, hover highlight, fold toggle, Enter interception.
- `svelte-app/src/lib/components/BreadcrumbBar.svelte` — breadcrumb UI with hover/click callbacks (Svelte 5 style).
- `svelte-app/src/lib/components/TokenYamlPane.svelte` — right-hand pane for displaying YAML text.
- `svelte-app/src/lib/logic/yamlAnalysis.ts` — parse + `lushify` + breadcrumbs + “selected token” extraction.
- `svelte-app/src/lib/logic/inputHandling.ts` — `add_sequence_or_map` (currently implements block sequence “insert empty item”).
- `svelte-app/src/lib/logic/yamlSample.ts` — `YAML_SAMPLE`.

