# Agent instructions (Codex)

## Stack + constraints

- TypeScript-only changes should stay `strict` and must not use `any` (prefer `unknown` + narrowing).
- Use `bun` to install and run scripts; avoid adding `npm`/`pnpm`/`yarn` workflows.
- Use `bun test` for tests; do not add new Jest tests.
- Builds must be clean: no errors and no warnings.
- For Markdown, ensure blank lines around headings and lists to avoid nvim lint errors.
- When creating or modifying `.md` files, normalize blank lines around headings and lists in the changed Markdown files.
- Use Svelte 5 runes style (`$state`, `$derived`, `$effect`) and avoid `$:` reactivity blocks.
- Follow Svelte agent documentation (svelte.dev docs/llms) for Svelte changes.
- Non-trivial UI changes should be implemented as separate components or by reusing Svelte Skeleton components.
- As a rule of thumb, pages or components should stay at or under 300 lines; split them when they grow larger.
- Generated `.md` output should keep lines under 80 characters.
- When necessary access code from ~/git/sveltejs--svelte for the svelte
  compiler or ~/git/sveltejs-svelte.dev for codes examples usising svelte io

= Use tailwind css for new code.

## Repo layout

- `lush-types/`: shared TS types/helpers (Vitest). Our code is build around trees
  of SusyNode, and SusyLines.
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

Find the current task by locating a "CURRENT TASK" marker in the root `plan.md`
or any nested `plan.md`. If no such marker exists, append "CURRENT TASK" and the
latest user prompt to the end of the `plan.md` that contains "CURRENT PLAN".
Itemize the task if not already done. Mark an item task with a checkbox when done and inform. You can add items or even subitems as go.

## Session summaries

- Write a session summary after each run in `summaries/yy/mm/dd-hh:mm.md`.
- Don't do it when there is no code change or minor changes on .md file
- Use the current local time for the path; keep the summary concise and Unicode.
- Write a daily summary in `day-summary/yy/mm/dd.md` (not gitignored) that rolls up the day's session summaries.
- When asked to "generate progress.md", produce 5-20 lines per day using the
  daily summaries in `day-summary/`. If a day has very few entries, fewer
  than 5 lines is acceptable.
