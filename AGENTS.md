# Agent instructions (Codex)

## Stack + constraints

- TypeScript-only changes should stay `strict` and must not use `any` (prefer `unknown` + narrowing).
- Use `bun` to install and run scripts; avoid adding `npm`/`pnpm`/`yarn` workflows.
- Use `vitest` for tests; do not add new Jest tests (the `yaml/` package still has legacy Jest scripts).
- Builds must be clean: no errors and no warnings in terminal output.

## Repo layout

- `lush-types/`: shared TS types/helpers (Vitest).
- `lush-term-editor/`: editor experiments (TypeScript `strict`, Vitest).
- `yaml/`: fork/vendor of `eemeli/yaml` (has Vitest available, but also legacy Jest + ESLint + Rollup).
- `svelte-app/`: SvelteKit app (Vite build + `svelte-check`, uses `@sveltejs/adapter-node`).

## Common commands (run from repo root)

- Install: `bun run install:all`
- Tests (current root script): `bun test`
- App dev server: `bun run dev`

## Validation expectations (before considering work “done”)

- `bun test`
- `bun run --cwd lush-term-editor test`
- `bun run --cwd lush-types test`
- If changing `svelte-app/`: `bun run --cwd svelte-app check` and `bun run --cwd svelte-app build`
- If changing `yaml/`: prefer `bun run --cwd yaml test:vitest`; keep `bun run --cwd yaml build` and `bun run --cwd yaml lint` clean


## Tauri and non Tauri

The app has two versions. One standalonw which uses Tauri and a non Tauri one.
The Tauri one uses rust API to access the system menu bar, the non Tauri one 

## Current task

The current task is marked as "THIS THE CURRENT TASK" in the root `plan.md` or a `plan.md` below
