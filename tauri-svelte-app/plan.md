# Plan: Wrap `svelte-app/` in a Tauri shell

## Goal

Make the existing SvelteKit UI in `svelte-app/` runnable as a desktop app by adding a Tauri project in `tauri-svelte-app/`.

This is a “wrapper”: the frontend code stays in `svelte-app/`; Tauri just hosts it in a native window.

## What was added

- `tauri-svelte-app/src-tauri/` (Rust + Tauri config)
  - `Cargo.toml`, `build.rs`, `src/main.rs`
  - `tauri.conf.json` wired to the existing SvelteKit app
- `tauri-svelte-app/.gitignore` for Rust build outputs

## Frontend changes (to support Tauri)

Tauri needs a static `index.html` + assets folder for production builds.

`svelte-app/` now supports a “Tauri build mode”:

- `svelte-app/svelte.config.js` switches adapters based on `TAURI=1`:
  - default: the existing Node adapter
  - `TAURI=1`: `@sveltejs/adapter-static` with `fallback: "200.html"`
- `svelte-app/src/routes/+layout.ts` sets:
  - `export const prerender = true` (so `index.html` is generated)
  - `export const ssr = false` (avoid SSR/prerender issues with browser-only modules)
- `svelte-app/package.json` adds:
  - `build` → `vite build`
  - `build:tauri` → `TAURI=1 vite build`

## How the Tauri wrapper is wired

In `tauri-svelte-app/src-tauri/tauri.conf.json`:

- Dev:
  - `beforeDevCommand`: starts the SvelteKit dev server in `../../svelte-app`
  - `devUrl`: loads `http://127.0.0.1:5173` inside the Tauri window
- Build:
  - `beforeBuildCommand`: runs `bun run --cwd ../../svelte-app build:tauri`
  - `frontendDist`: points at `../../svelte-app/build`

## How to run

Prereqs:

- Rust toolchain installed (`rustup`, `cargo`)
- Tauri CLI available (v2): `cargo install tauri-cli`

Then:

- Dev: `cd tauri-svelte-app/src-tauri && cargo tauri dev`
- Build: `cd tauri-svelte-app/src-tauri && cargo tauri build`

If `bun install` is needed after pulling changes:

- `bun install --cwd svelte-app`
