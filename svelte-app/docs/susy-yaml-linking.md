# Susy Editor <-> YAML Panel Linking Spec

## Goal

Provide bidirectional linking between the Susy structural editor pane and
the Susy YAML panel. Clicking a token in one pane highlights the matching
range in the other, mirroring the Svelte playground behavior for source
and AST panels.

## Terminology

- Susy editor pane: the token-tree projection editor.
- Susy YAML panel: the YAML view of the Susy tree.
- Token path: the array path used by the Susy tree (`number[]`).
- Span: the projected text range for a token in a pane.

## Data Model

### Shared Identity

Every token is identified by a stable token path from the Susy root. This
path is already used in the structural editor and should be the linkage key.

### YAML Spans

When the Susy YAML panel renders the tree, it should produce a map of token
paths to YAML text spans, similar to `spansByPath` used in the editor.

Proposed shape:

```ts
type Span = { from: number; to: number; textFrom?: number; textTo?: number }

type SusyYamlProjection = {
  text: string
  spansByPath: Map<string, Span>
}
```

The map key should be `serializePath(path)` to match existing editor logic.

## Rendering Pipeline

### Susy Editor Pane

- Already has `spansByPath` for the projection text.
- Exposes a selection path when the user clicks a token.

### Susy YAML Panel

- Add a projection step that renders the Susy tree to YAML text and a
  `spansByPath` map for YAML ranges.
- Use the YAML projection output as the panel document.

## Interaction Flow

### Click in Susy Editor

1. Determine the selected token path (already available).
2. Emit `focusPath` event with the path.
3. YAML panel receives `focusPath` and highlights the YAML span for that
   path.

### Click in YAML Panel

1. On click, convert the YAML cursor position to a token path by scanning
   `spansByPath` for the smallest enclosing span.
2. Emit `focusPath` event with that path.
3. Susy editor receives `focusPath` and moves focus to that token.

## Highlighting Rules

- Use the smallest enclosing span when multiple spans contain the position.
- For empty spans, use a visible placeholder range as in the editor.
- In both panes, maintain only one focused token at a time.

## Component Responsibilities

- `StructuralEditorTreePane.svelte`
  - Emits `focusPath` on click.
  - Accepts external `focusPath` to move editor focus.

- `SusyYamlPanel.svelte` (or `SusyYamlInspector.svelte`)
  - Renders YAML projection + spans.
  - Emits `focusPath` on click.
  - Accepts external `focusPath` to highlight YAML span.

- Parent container (e.g. `StructuralEditor.svelte`)
  - Holds `activePath` state.
  - Wires events between panes.

## Public API Sketch

```svelte
<StructuralEditorTreePane
  bind:activePath
  on:focusPath={(e) => (activePath = e.detail)}
/>

<SusyYamlPanel
  {activePath}
  on:focusPath={(e) => (activePath = e.detail)}
/>
```

## Edge Cases

- If a path has no YAML span, do not change selection.
- If YAML text is stale, ignore clicks until projection is rebuilt.
- If the tree is empty, disable linking.

## Telemetry

- Log missing span lookups in dev mode only.
- Do not log for normal empty selection changes.

## Testing Plan

- Click a token in the editor and verify YAML highlight.
- Click a YAML token and verify editor focus moves.
- Verify behavior for empty tokens and root selection.
