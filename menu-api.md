# Lush menu “upper API”

Goal: define one app-level menu model + one action event so both the **web (non‑Tauri)** UI menu and the **Tauri native** menu can drive the same behavior.

## Menu model

Types live in `lush-types/index.ts`:

- `MenuBarSpec`: top-level menu bar
- `MenuMenu` / `MenuItem`: nested menu structure
- `MenuActionId`: app actions (stable identifiers)
- `MenuAccelerator`: optional keyboard shortcut hint

The menu model is intentionally platform-agnostic:

- Web: rendered as an in-app menu bar UI
- Tauri: converted to a native `Menu`/`Submenu`/`MenuItem` at bundle/runtime

## Action dispatch

When a menu item is activated, it dispatches a single DOM event:

- Event name: `lush:menu-action`
- `event.detail` type: `MenuActionEventDetail` (from `lush-types/index.ts`)

Example (web):

```ts
window.dispatchEvent(
  new CustomEvent('lush:menu-action', { detail: { action: 'about' } })
)
```

Example (Tauri):

- Emit the same payload from native → webview (e.g. via `tauri::AppHandle::emit` / `Window::emit`), and the Svelte app listens in one place.

## Current action IDs

- `about`: open the About dialog
- `login`: open the login modal (UI action), which then redirects to `/login`
- `logout`: reserved for later (will clear session + redirect through WorkOS logout)
- `open-yaml-file`: open a YAML file (payload fields reserved for later)

## Current wiring

- Web menu bar UI: `svelte-app/src/lib/components/SvelteDevMenuBar.svelte` emits `lush:menu-action`
- App listener: `svelte-app/src/routes/+layout.svelte` listens for `lush:menu-action` and performs the action
- Legacy: `lush:about` is still listened to (for existing Tauri wiring)
