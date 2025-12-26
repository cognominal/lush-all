# Playground preview flow

## Scope

Describe how Svelte.dev renders the preview webview from the left-hand
.svelte editor panel, and outline the work needed to emulate it in a new
route in this repo.

## How Svelte.dev renders the preview

Source code lives in
`~/git/sveltejs---svelte.dev/apps/svelte.dev` and
`~/git/sveltejs---svelte.dev/packages/repl`.

High-level flow:

- The playground route renders the `Repl` component from `@sveltejs/repl`.
- `Repl` owns both editor and preview. It wires a `Workspace` to a `Bundler`.
- The `Workspace` emits `onupdate` whenever the editor changes.
- `onupdate` triggers `bundler.bundle(...)`, which compiles the current file
  set to a bundle.
- The preview uses `Viewer.svelte` to render the bundle inside an iframe.
- The iframe is created with `srcdoc` HTML and sandbox flags.
- `ReplProxy` bridges the host and iframe, injecting JS/CSS and mounting the
  compiled component into `document.body`.
- On each update, the old component is unmounted and the new bundle mounts.

Key files:

- `apps/svelte.dev/src/routes/(authed)/playground/[id]/+page.svelte`
- `packages/repl/src/lib/Repl.svelte`
- `packages/repl/src/lib/Output/Viewer.svelte`
- `packages/repl/src/lib/Output/ReplProxy.ts`

## What we need to emulate in a new route

We already have a Svelte editor component in `svelte-codemirror`, but it uses
Susy conventions. To match the Svelte.dev behavior we need a pipeline that
emits normal .svelte files and feeds them to a preview webview.

Required work:

- Add a new SvelteKit route in `svelte-app/` that provides a split layout:
  Susy editor on the left, preview webview on the right.
- Add a projection step from the Susy tree into plain .svelte source text.
- Maintain a file set (at least `App.svelte`) that mirrors the projection.
- Trigger recompilation whenever the Susy editor updates the file contents.
- Render the bundle in an iframe with a preview viewer, matching the
  `Viewer.svelte` sandbox and lifecycle rules.
- Surface compile and runtime errors in the preview panel.

## Implementation options

- Reuse `@sveltejs/repl` pieces (Workspace, Bundler, Viewer) directly and
  wire them to the Susy editor output instead of the built-in REPL editor.
- Or implement a minimal compiler + iframe bridge that mirrors the REPL:
  compile with the Svelte compiler, generate JS + CSS, inject into iframe,
  and mount/unmount on each update.

## Susy editor integration details

- The Susy editor is the input surface, but the preview expects text files.
- We need a single source of truth for the .svelte text output that can be
  rebuilt from SusyNode changes.
- Cursor and navigation remain Susy-specific; only the projection feeds the
  compiler.
- Any non-textual Susy metadata should be stripped or mapped to comments so
  the compiler receives valid .svelte content.
