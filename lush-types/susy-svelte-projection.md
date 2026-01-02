# susy-svelte-projection.ts

This module parses a Svelte file into a SusyNode tree and emits it as
YAML when run from the command line. It exports a function so other
modules can reuse the projection logic.

## Exports

- `susySvelteProjection(source, filename?)`: parses the Svelte source
  string, builds the SusyNode tree, assigns token indices, and returns
  the root node.

## CLI Usage

Run the file directly with Bun to print the YAML projection of a Svelte
file.

```
bun lush-types/susy-svelte-projection.ts path/to/file.svelte
```

If no path is provided, it uses `lk.svelte` in the current directory.
