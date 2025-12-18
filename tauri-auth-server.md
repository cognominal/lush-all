# Tauri “AuthKit production server” build

Tauri normally bundles a **static** frontend (files) and loads them directly inside the webview.
That is great for offline apps, but it breaks OAuth-style auth flows that require server endpoints like:

- `/login` (redirect to WorkOS)
- `/auth/callback` (exchange `code` for session cookie)

Those endpoints only exist when the app runs with a **server** (SvelteKit adapter-node).

This repo supports a special build that bundles a local server inside the Tauri app so AuthKit works in the packaged `.app`.

## How it works

### Build time

`bun run build:tauri:auth` does:

1. Build `svelte-app` with `TAURI_SERVER=1` so SvelteKit uses **adapter-node** even for a Tauri build.
2. Copy `svelte-app/build/` (self-contained Node server bundle) into:
   - `tauri-svelte-app/src-tauri/gen/appserver/`
3. Write `tauri-svelte-app/src-tauri/gen/appserver/package.json` with `{ "type": "module" }`
   - required so `node index.js` treats the server as ESM.
4. Copy `workos-keys.txt` into the same folder (so the embedded server can read secrets).
5. Run `cargo tauri build --bundles app`

Script: `scripts/tauri-auth.ts`

### Runtime

In release builds, Tauri:

1. Locates the bundled resource dir (inside the `.app` bundle)
2. Spawns a local server:
   - `node appserver/index.js`
   - `HOST=127.0.0.1`
   - `PORT=3210`
   - `WORKOS_REDIRECT_URI=http://127.0.0.1:3210/auth/callback`
3. Navigates the webview to `http://127.0.0.1:3210/`

Code: `tauri-svelte-app/src-tauri/src/main.rs`

## Requirements

- WorkOS redirect URIs must include:
  - `http://localhost:5173/auth/callback` (dev)
  - `http://127.0.0.1:3210/auth/callback` (packaged app)
- `node` must be installed on the machine running the packaged app.

## Security note

This build currently bundles `workos-keys.txt` into the app so the local server can exchange OAuth codes.
That is convenient for developer builds, but it is **not appropriate for distributing a public app**, because it includes secrets.

For distribution, the recommended approach is:

- run the auth callback + session endpoints on a remote backend you control, and
- configure the Tauri app to use that backend for login/session.

