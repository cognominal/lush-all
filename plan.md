# Plan: SvelteKit YAML + Lush Breadcrumb Prototype

## Goal

Create a SvelteKit app in `svelte-app/` that:

- Shows a CodeMirror editor containing `YAML_SAMPLE`.
- Uses `yaml/lushify` to transform the YAML into the multiline “lush” structure defined in `lush-types/`.
- Displays a breadcrumb bar under the editor showing the **type path** from the root document node to the **currently selected item**.
- Keeps core logic UI-agnostic so the same logic can later be reused in a TUI.

## End Goal

create a language called lush.
It will be edited with our structural editor which update the underlying `Multiline` structure.
A lush file will be saved as `.lush.yaml` file using a new function `LushAsYaml`
which will call `tokenInutAsYaml` on the root token. So tokenInputAsYaml will below
adapted to accept a InputToken as well as parameter.

## Approach

1. **Scaffold SvelteKit in `svelte-app/`**
   - Minimal SvelteKit project (Vite-based).
   - Add dependencies for CodeMirror 6 + YAML language support.

2. **Create a UI-agnostic “selection → breadcrumbs” logic module**
   - New module (no Svelte imports) responsible for:
     - Loading `YAML_SAMPLE`.
     - Parsing YAML and building a mapping from YAML positions → semantic “selected node”.
     - Calling `lushify` to produce the lush structure.
     - Producing breadcrumbs: array of `{ type, label? }` from root → selected node.
   - Expose a small API usable from web UI or future TUI, e.g.:
     - `createModel(yamlText)`
     - `updateSelection(model, cursorOffset)`
     - `getBreadcrumbs(model)`

3. **Wire the logic into the Svelte UI**
   - A page that renders:
     - CodeMirror editor (YAML mode) with `YAML_SAMPLE`.
     - A breadcrumb bar component below it.
   - On editor cursor/selection change:
     - Convert `{line, ch}` → absolute offset.
     - Update model selection and re-render breadcrumbs.

4. **Validation**
   - Typecheck/build `svelte-app/` locally.
   - Ensure breadcrumbs update when moving the cursor through YAML (root → nested).

## Deliverables / Key Files

- `svelte-app/` SvelteKit project (app + dependencies).
- `svelte-app/src/lib/logic/…` UI-agnostic logic module(s).
- `svelte-app/src/routes/+page.svelte` UI that uses the logic module.
- `svelte-app/src/lib/components/BreadcrumbBar.svelte` (pure UI).

5. wrap up as svelte-app/ in tauri-svelte-app/ making it a tauri app.  Explain it in tauri-svelte-app/plan.md

<--- THIS THE CURRENT TASK

6. Support javascript variables

They are supported using a new token kind YAMLVARIABLE.
With three types `scalar`, `array` and `map`.

Currently the value are wrapped :  
  $scalar = 42
  
Note : the lush name has a sigil that denote the types $ for scalar,
@ for array and % for map.

The lushify function will be used only when starting from a plain yaml file.
Next we will deal with lush.yaml files.

.lush.yaml is the form
