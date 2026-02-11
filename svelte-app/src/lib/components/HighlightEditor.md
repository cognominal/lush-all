# HighlightEditor

## Purpose

`HighlightEditor` renders the highlight input and manages draft edits
without tearing focus during parent updates.

## Usage

```svelte
<script lang="ts">
  import HighlightEditor from '$lib/components/HighlightEditor.svelte'
</script>

<HighlightEditor value={line} onCommit={handleCommit} />
```

## Behavior

- Keeps a local draft while focused and syncs from `value` when idle.
- Debounces commits while typing and commits on blur.
- Emits commits via `onCommit`.
