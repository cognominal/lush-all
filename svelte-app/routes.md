# Svelte App Routes

## Pages

- `/`: Home and entry UI.
- `/docs`: Docs viewer and search UI.
- `/editor`: Structural editor prototype page.

## Docs Query Params

- `path`: Workspace-relative markdown file path.
- `q`: Search query string.
- `scope`: `files` or `docs`.
- `mode`: `text` or `regex`.
- `case`: `sensitive` or `insensitive`.
- `daily`: `1` to limit search to `day-summary/`.

## Auth Routes

- `/login`: Starts WorkOS AuthKit login flow.
- `/logout`: Clears session and returns to the app.
- `/auth/callback`: AuthKit callback endpoint.

## API Routes

- `/api/me`: Returns the current user session info.
