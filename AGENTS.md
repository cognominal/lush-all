# Agent instructions (Codex)

## Stack + constraints

- TypeScript-only changes should stay `strict` and must not use `any`
  (prefer `unknown` + narrowing).
- Use `bun` to install and run scripts; avoid adding `npm`/`pnpm`/`yarn`
  workflows.
- Use `bun test` for tests; do not add new Jest tests.
- Each time you add code, run `bun test`. Each time you add tests, run
  `bun test` after adding them.
- Builds must be clean: no errors and no warnings.
- For Markdown, ensure blank lines around headings and lists to avoid nvim
  lint errors.
- When creating or modifying `.md` files, normalize blank lines around
  headings and lists in the changed Markdown files.
- Use Svelte 5 runes style (`$state`, `$derived`, `$effect`), no `:`
  in event  handlers and avoid `$:`
  reactivity blocks.
- Follow Svelte agent documentation (svelte.dev docs/llms) for Svelte
  changes.
- Non-trivial UI changes should be implemented as separate components or by
  reusing Svelte Skeleton components.
- As a rule of thumb, pages or components should stay at or under 300 lines;
  split them when they grow larger.
- Generated `.md` output should keep lines under 80 characters.
- When necessary access code from `~/git/sveltejs--svelte` for the svelte
  compiler or ``~/git/sveltejs-svelte.dev`` for codes examples using svelte i/o
= Use tailwind css for new code.

## Acting on prompt

Always reformulate before acting.

## Repo layout

- `lush-types/`: shared TS types/helpers (Vitest). Our code is build around
  trees of SusyNode, and SusyLines.
- `lush-term-editor/`: editor experiments (TypeScript `strict`, Vitest).
- `yaml/`: fork/vendor of `eemeli/yaml` (has Vitest available, but also
  legacy Jest + ESLint + Rollup).
- `svelte-app/`: SvelteKit app (Vite build + `svelte-check`, uses
  `@sveltejs/adapter-node`).

## Common commands (run from repo root)

- Install: `bun run install:all`
- Tests (current root script): `bun test`
- App dev server: `bun run dev`

## Validation expectations (before considering work “done”)

- `bun test`
- `bun run --cwd lush-term-editor test`
- `bun run --cwd lush-types test`
- If changing `svelte-app/`: `bun run --cwd svelte-app check` and
  `bun run --cwd svelte-app build`
- If changing `yaml/`: prefer `bun run --cwd yaml test:vitest`; keep
  `bun run --cwd yaml build` and `bun run --cwd yaml lint` clean
- one line comment for each function created/changed

## Tauri and non Tauri

The app has two versions. One standalone which uses Tauri and a non Tauri
one. The Tauri one uses rust API to access the system menu bar, the non
Tauri one

## Current task

- When a prompt starts with `T:` and a markdown file path, treat it as a
  task$ request and write it to that file, prefixed by a `CURRENT TASK` line.
- Ensure `plan.md` includes a `CURRENT PLAN:` line followed by the path to the
  current `*.md` that contains a `CURRENT TASK` (if any).
- If a prompt starts with `Q:`, ignore any current task.
- If a prompt starts with `T?`, print the current task or `no task`.
- Ensure the task is itemized; add checkboxes if missing.
- When a task item is completed, check it off and mention it.
- If all items are checked, remove the `CURRENT TASK` marker.
- You may add items or sub items as needed.

## Session summaries

- Write a session summary after each run in
  `summaries/yy-mm-dd-hh:mm.md`.
- Don't do it when there is no code change or minor changes on .md file
- Use the current local time for the path; keep the summary concise and Unicode.
- Write a daily summary in `day-summary/detailled-yy-mm-dd.md` only for the
  previous day when missing that rolls up the day's session summaries.
- When asked to `day-summary/brief-yy-mm-dd.md`, produce 5-20 lines for the
  previous day (or days if missing), using the daily summaries in
  `day-summary/`. If a day has very few entries, fewer than 5 lines is
  acceptable. If no entries, just say so.
