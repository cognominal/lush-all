# StructuralEditor

## Purpose

`StructuralEditor` renders the structural editor UI and manages the
CodeMirror view, selection, and breadcrumb updates for the sample
projection.

## Usage

```svelte
<script lang="ts">
  import StructuralEditor from '$lib/components/StructuralEditor.svelte'
</script>

<StructuralEditor />
```

## Behavior

- Projects the current source text into a Susy tree and renders the
  projection in the structural view.
- Derives language options from sample file extensions.
- Disables samples that do not have a matching projection.
- Drives CodeMirror state updates for selection, decorations, and
  content sync.
- Tracks the current structural path and token path to support normal
  and insert modes.
- Builds breadcrumbs from the root to the focused node.

## Keyboard controls

Normal mode:

- `i` enters insert mode.
- `Tab` and `Shift+Tab` move between input tokens.
- `Enter` descends into the next child path.
- `Esc` enlarges selection to the parent path.

Insert mode:

- `Esc` returns to normal mode.
- Printable characters insert into the current token.

## Cross-panel sync

- Focus path changes are emitted through `onFocusPath`.
- The breadcrumb bar updates from `currentPath`.
- The Susy YAML panel follows the emitted focus path.

## Notes

- The editor view is created on mount and destroyed on unmount.
- The component uses Svelte 5 runes for state and derived values.
