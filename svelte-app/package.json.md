# svelte-app package.json

## Purpose

Defines scripts, dependencies, and devDependencies for the SvelteKit app.

## Scripts

- `dev`: Syncs SvelteKit and starts Vite dev server.
- `build`: Syncs SvelteKit and builds the app with Vite.
- `build:tauri`: Builds a Tauri-targeted bundle (uses `TAURI=1`).
- `preview`: Previews the production build with Vite.
- `sync`: Runs `svelte-kit sync` to refresh generated types.
- `check`: Runs SvelteKit sync and `svelte-check` type diagnostics.
- `playwright:install`: Installs Playwright browser binaries.
- `test:e2e`: Runs Playwright end-to-end tests.
- `postinstall`: Ensures SvelteKit is synced after install.

## Dependencies

- `@codemirror/lang-yaml`: YAML language support for CodeMirror 6.
- `@codemirror/theme-one-dark`: CodeMirror theme used by the editor.
- `@rich_harris/svelte-split-pane`: Split-pane layout for the docs/editor view.
- `@sveltejs/kit`: SvelteKit framework runtime.
- `@workos-inc/node`: WorkOS AuthKit integration for server routes.
- `buffer`: Buffer polyfill for browser usage.
- `codemirror`: CodeMirror 6 core editor packages.
- `lush-types`: Workspace dependency for Susy types and helpers.
- `marked`: Markdown parser for docs rendering.
- `process`: Process polyfill for browser usage.
- `svelte`: Svelte runtime and compiler.
- `util`: Node util polyfill used by the app.
- `yaml`: Workspace dependency for YAML parsing and CST tokens.

## DevDependencies

- `@playwright/test`: Playwright test runner for E2E tests.
- `@skeletonlabs/tw-plugin`: Skeleton Tailwind plugin for UI primitives.
- `@sveltejs/adapter-auto`: Default adapter for local dev.
- `@sveltejs/adapter-node`: Node adapter used in builds.
- `@sveltejs/adapter-static`: Static adapter for static builds when needed.
- `@sveltejs/vite-plugin-svelte`: Vite plugin for Svelte 5.
- `@types/node`: Node.js type definitions.
- `autoprefixer`: PostCSS vendor prefixing.
- `postcss`: CSS transformation pipeline used by Tailwind.
- `svelte-check`: Type checker for Svelte and TS.
- `tailwindcss`: Tailwind CSS framework.
- `typescript`: TypeScript compiler for type checking.
- `vite`: Build tool and dev server.
