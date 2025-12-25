# Svelte.dev playground update flow

## Scope

This note summarizes how the Svelte.dev playground updates the right-hand
result panel when the left-hand code editor changes. It references code in
`~/git/sveltejs---svelte.dev/apps/svelte.dev`.

## Playground ("/playground")

The playground page uses the `Repl` component from `@sveltejs/repl`.

Key file:

- `src/routes/(authed)/playground/[id]/+page.svelte`

Flow:

- The page renders `<Repl />` and passes it the current file set via `repl.set(...)`.
- The editor lives inside the `Repl` component; edits change the REPL workspace.
- The REPL component recompiles on change and updates its internal preview
  panel (the right side) to show the new result.
- The page-level `onchange` callback tracks whether the user edited the
  example and updates the URL hash for sharing.

In other words: the left editor triggers recompilation inside `@sveltejs/repl`,
which drives the right-hand result panel for the playground.

## Tutorial ("/tutorial")

The tutorial page wires the editor to a workspace and an adapter that produces
bundled output for the viewer.

Key files:

- `src/routes/tutorial/[...slug]/+page.svelte`
- `src/routes/tutorial/[...slug]/adapter.svelte.ts`
- `src/routes/tutorial/[...slug]/OutputRollup.svelte`

Flow:

- `+page.svelte` creates a `Workspace` from `@sveltejs/repl/workspace` and
  registers `onupdate` and `onreset` handlers.
- Those handlers call `adapter.update(file)` and `adapter.reset(files)`.
- The adapter chooses a bundler (Rollup or WebContainer) and exposes a
  `bundler` object in `adapter_state`.
- `OutputRollup.svelte` renders `<Viewer />` from `@sveltejs/repl/viewer`
  using `adapter_state.bundler`.
- When the editor changes a file, the adapter triggers a rebuild, and the
  viewer updates the right-hand output.

## Summary

- Playground: `Repl` manages the editor, compilation, and preview internally.
- Tutorial: `Workspace` emits file updates, an adapter builds, and the
  `Viewer` component renders the updated bundle.

This describes the current behavior without the docs-specific processing that
Svelte.dev applies to its content pipeline.
