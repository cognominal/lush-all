# Plan: SvelteKit YAML + Lush Breadcrumb Prototype

## Goal
Create a SvelteKit app in `svelte-app/` that:

- Shows a CodeMirror editor containing `YAML_SAMPLE`.
- Uses `yaml/lushify` to generate the `TokenMultiLine` structure (from `lush-types/`) from `YAML_SAMPLE`.
- Displays a breadcrumb bar under the editor showing the **type path** from the root document node to the **currently selected item** (cursor-based).
- Adds interactions:
  - Hover a breadcrumb → highlight the corresponding YAML span in the editor.
  - Click a breadcrumb → toggle fold/unfold of the corresponding YAML node range.
- Keeps core logic UI-agnostic so the same logic can later be reused in a TUI.

## Approach
1. **Scaffold SvelteKit in `svelte-app/`**
   - Minimal SvelteKit project (Vite-based).
   - Add CodeMirror 6 + YAML language support.

2. **Create a UI-agnostic model module**
   - New module (no Svelte imports) responsible for:
     - Loading `YAML_SAMPLE`.
     - Parsing YAML with source ranges enabled.
     - Calling `lushify` to produce `TokenMultiLine`.
     - Translating cursor offsets into a “deepest node path” and emitting breadcrumbs.
   - Breadcrumb items include both:
     - `type` (for display)
     - `range` (for hover highlight / fold toggle)

3. **Wire the logic into the Svelte UI**
   - Page renders:
     - CodeMirror editor (YAML mode).
     - Breadcrumb bar below.
   - Cursor movement updates breadcrumbs.
   - Breadcrumb interactions:
     - Hover → editor highlight decoration on that range.
     - Click → toggle fold/unfold for that node’s range.

4. **Validation**
   - `svelte-check` passes.
   - `vite build` passes.

## Deliverables / Key Files
- `svelte-app/src/lib/logic/yamlAnalysis.ts` (UI-agnostic: parse/lushify/breadcrumbs).
- `svelte-app/src/lib/components/YamlEditor.svelte` (CodeMirror editor + highlight + fold toggling).
- `svelte-app/src/lib/components/BreadcrumbBar.svelte` (display + hover/click events).
- `svelte-app/src/routes/+page.svelte` (wiring).

