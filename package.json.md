# Root package.json

## Purpose

Defines root scripts for multi-package workflows and Tauri builds, and
declares workspace packages.

## Scripts

- `test`: Runs tests for `yaml`, `lush-types`, and `lush-term-editor`.
- `install:all`: Installs deps for `yaml`, `lush-types`, and
  `lush-term-editor`.
- `dev`: Starts the SvelteKit dev server in `svelte-app/`.
- `preview`: Runs the SvelteKit preview server in `svelte-app/`.
- `playright-tests`: Runs Playwright E2E tests in `svelte-app/`.
- `dev:tauri`: Starts the Tauri dev workflow via `scripts/tauri.ts`.
- `build:tauri`: Builds the Tauri app via `scripts/tauri.ts`.
- `build:tauri:auth`: Builds auth Tauri target via `scripts/tauri-auth.ts`.
- `build:tauri:mac:arm64`: Builds Tauri for macOS ARM64.
- `build:tauri:mac:x64`: Builds Tauri for macOS x64.
- `build:tauri:win:x64`: Builds Tauri for Windows x64.
- `build:tauri:win:arm64`: Builds Tauri for Windows ARM64.
- `build:tauri:linux:x64`: Builds Tauri for Linux x64.
- `build:tauri:linux:arm64`: Builds Tauri for Linux ARM64.

## Package purposes

- `package.json`: Root scripts for multi-package workflows.
- `lush-types/package.json`: Shared Susy types/helpers used across packages.
- `lush-term-editor/package.json`: Editor experiments using Susy structures
  and YAML parsing.
- `svelte-app/package.json`: SvelteKit app for the UI and docs.
- `svelte-codemirror/package.json`: Svelte CodeMirror adapter package.
- `tauri-svelte-app/src-tauri/gen/appserver/package.json`: Generated Tauri
  appserver metadata.
- `yaml/package.json`: YAML fork with build/test tooling.
- `yaml/browser/package.json`: Browser build metadata for the YAML fork.
- `yaml/playground/package.json`: YAML playground site build/test tooling.

## Dependencies by package.json

### `package.json`

- No dependencies or devDependencies.

### `lush-types/package.json`

- `svelte` (dep): Svelte runtime types and helpers used by `lush-types`.
- `yaml` (dep): YAML parsing helpers used by shared types/helpers.
- `vitest` (dev): Test runner for `lush-types`.

### `lush-term-editor/package.json`

- `lush-types` (dep): Shared Susy types used by the editor experiments.
- `yaml` (dep): YAML parsing utilities for editor experiments.
- `typescript` (dev): Type checking and TS tooling for this package.
- `vitest` (dev): Test runner for editor experiments.

### `svelte-app/package.json`

- `@codemirror/lang-yaml` (dep): YAML language support for CodeMirror.
- `@codemirror/theme-one-dark` (dep): CodeMirror theme.
- `@rich_harris/svelte-split-pane` (dep): Split pane UI layout component.
- `@sveltejs/kit` (dep): SvelteKit app framework.
- `@workos-inc/node` (dep): WorkOS API client for auth/integration.
- `buffer` (dep): Node buffer shim for browser usage.
- `codemirror` (dep): CodeMirror 6 editor core.
- `lush-types` (dep): Shared Susy types in the app.
- `marked` (dep): Markdown parsing/rendering.
- `process` (dep): Node process shim for browser usage.
- `svelte` (dep): Svelte runtime.
- `util` (dep): Node util shim for browser usage.
- `yaml` (dep): YAML parser fork used by the app.
- `@playwright/test` (dev): Playwright test runner.
- `@skeletonlabs/tw-plugin` (dev): Skeleton Tailwind plugin.
- `@sveltejs/adapter-auto` (dev): SvelteKit auto adapter.
- `@sveltejs/adapter-node` (dev): SvelteKit Node adapter.
- `@sveltejs/adapter-static` (dev): SvelteKit static adapter.
- `@sveltejs/vite-plugin-svelte` (dev): Vite plugin for Svelte.
- `@types/node` (dev): Node.js type definitions.
- `autoprefixer` (dev): PostCSS vendor prefixing.
- `postcss` (dev): CSS processing pipeline.
- `svelte-check` (dev): Svelte diagnostics and type checks.
- `tailwindcss` (dev): Tailwind CSS framework.
- `typescript` (dev): Type checking and TS tooling.
- `vite` (dev): Vite dev server and build tooling.

### `yaml/package.json`

- `lush-types` (dep): Shared Susy types used in the YAML fork.
- `@babel/core` (dev): Babel core for transpilation.
- `@babel/plugin-transform-typescript` (dev): Babel TS transform.
- `@babel/preset-env` (dev): Babel preset for target environments.
- `@eslint/js` (dev): ESLint base rules.
- `@rollup/plugin-babel` (dev): Rollup Babel integration.
- `@rollup/plugin-replace` (dev): Rollup string replacement.
- `@rollup/plugin-typescript` (dev): Rollup TS integration.
- `@types/jest` (dev): Jest type definitions.
- `@types/node` (dev): Node.js type definitions.
- `babel-jest` (dev): Babel support for Jest.
- `cross-env` (dev): Cross-platform env var handling.
- `eslint` (dev): Linting.
- `eslint-config-prettier` (dev): Prettier-compatible ESLint config.
- `fast-check` (dev): Property-based testing.
- `jest` (dev): Jest test runner.
- `jest-resolve` (dev): Jest module resolution utilities.
- `jest-ts-webcompat-resolver` (dev): TS-aware Jest resolver.
- `prettier` (dev): Code formatter.
- `rollup` (dev): Bundler for node/browser builds.
- `tslib` (dev): TS runtime helpers.
- `typescript` (dev): Type checking and TS tooling.
- `typescript-eslint` (dev): TypeScript ESLint tooling.
- `vitest` (dev): Vitest test runner.

### `yaml/playground/package.json`

- `@rollup/plugin-terser` (dev): Minifies the playground bundle.
- `browserstack-node-sdk` (dev): BrowserStack integration for tests.
- `http-server` (dev): Static server for the playground site.
- `jest` (dev): Test runner for playground tests.
- `prettier` (dev): Code formatter.
- `rollup` (dev): Bundler for the playground build.
- `selenium-webdriver` (dev): Browser automation for tests.

### `yaml/browser/package.json`

- No dependencies or devDependencies.

### `svelte-codemirror/package.json`

- No dependencies or devDependencies.

### `tauri-svelte-app/src-tauri/gen/appserver/package.json`

- No dependencies or devDependencies.
