# Root package.json

## Purpose

Defines root scripts for multi-package workflows and Tauri builds, and declares workspace packages.

## Scripts

- `test`: Runs the test suites for `yaml`, `lush-types`, and `lush-term-editor` from the repo root.
- `install:all`: Installs dependencies for `yaml`, `lush-types`, and `lush-term-editor`.
- `dev`: Starts the SvelteKit app dev server in `svelte-app/`.
- `preview`: Runs the SvelteKit preview server for `svelte-app/`.
- `playright-tests`: Runs the Playwright E2E suite in `svelte-app/`.
- `dev:tauri`: Starts the Tauri dev workflow via `scripts/tauri.ts`.
- `build:tauri`: Builds the Tauri app via `scripts/tauri.ts`.
- `build:tauri:auth`: Builds the auth-specific Tauri target via `scripts/tauri-auth.ts`.
- `build:tauri:mac:arm64`: Builds the Tauri app for macOS ARM64.
- `build:tauri:mac:x64`: Builds the Tauri app for macOS x64.
- `build:tauri:win:x64`: Builds the Tauri app for Windows x64.
- `build:tauri:win:arm64`: Builds the Tauri app for Windows ARM64.
- `build:tauri:linux:x64`: Builds the Tauri app for Linux x64.
- `build:tauri:linux:arm64`: Builds the Tauri app for Linux ARM64.

## Workspaces

- `yaml`: YAML fork with tests and tooling.
- `lush-types`: Shared Susy types and helpers.
- `lush-term-editor`: Experimental editor logic and tests.
