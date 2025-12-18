# GitHub authentication via WorkOS (AuthKit) — Lush

This repo uses **WorkOS AuthKit** for authentication, with **GitHub** as the initial OAuth provider.

The implementation is **server-side** (SvelteKit endpoints + HTTP-only cookie session), which works for:

- `svelte-app/` when running with the SvelteKit server (adapter-node, `bun run --cwd svelte-app dev`)
- the **Tauri wrapper in dev mode** (because it points at `http://localhost:5173`)

Important limitation:

- The current Tauri **production** build uses a **static** SvelteKit build (`build:tauri`), so there is no server process to perform the OAuth code exchange. This means **AuthKit login will not work in the bundled Tauri app** until we introduce a server (remote or embedded) for the callback/session endpoints.

Workaround implemented:

- Use `bun run build:tauri:auth` to build a Tauri bundle that includes an **embedded local app server** (SvelteKit adapter-node) and starts it on `http://127.0.0.1:3210` when the app launches.
- This requires `node` to be available on the machine running the app.

## What gets added

### Routes

- `GET /login` → redirects to WorkOS hosted AuthKit / GitHub login (includes PKCE + state)
- `GET /auth/callback` → exchanges the authorization code for a WorkOS session and sets a cookie
- `GET /logout` → clears cookie and redirects through WorkOS logout
- `GET /api/me` → returns `{ authenticated, user? }` for the client

### Cookies

- `workos_session` (HTTP-only) — WorkOS **sealed session** string
- `workos_oauth_state` (HTTP-only) — CSRF state for the login redirect (10 minute TTL)
- `workos_pkce_verifier` (HTTP-only) — PKCE verifier for the callback (10 minute TTL)
- `workos_return_to` (HTTP-only) — optional post-login redirect target (10 minute TTL)

Cookie behavior:

- `HttpOnly` + `SameSite=Lax`
- `Secure` only when the current URL is `https:`

## Setup (local dev)

### 1) WorkOS Dashboard

In the WorkOS Dashboard:

1. Enable **AuthKit**
2. Enable **GitHub** as a **Social Login** provider
3. Add a **redirect URI** for local dev:
   - `http://localhost:5173/auth/callback`
4. Add a **redirect URI** for the packaged Tauri bundle (AuthKit in production):
   - `http://127.0.0.1:3210/auth/callback`

### 2) Local keys file (recommended)

Create a local file `workos-keys.txt` (repo root) or `svelte-app/workos-keys.txt` with:

- `WORKOS_API_KEY` — WorkOS API key
- `WORKOS_CLIENT_ID` — WorkOS client id
- `WORKOS_REDIRECT_URI` — `http://localhost:5173/auth/callback`
- `WORKOS_COOKIE_PASSWORD` — encryption password for sealed sessions (keep secret)

Example `workos-keys.txt`:

```bash
WORKOS_API_KEY='sk_example_...'
WORKOS_CLIENT_ID='client_...'
WORKOS_REDIRECT_URI='http://localhost:5173/auth/callback'
WORKOS_COOKIE_PASSWORD='a-long-random-secret-at-least-32-chars'
```

This file is ignored by git via `.gitignore`.

### 3) Environment variables (optional)

If you prefer, you can set the same keys via environment variables instead. The app reads `workos-keys.txt` first and falls back to env vars.

## How the flow works

### Login redirect (`/login`)

`GET /login`:

1. Generates:
   - `state` (CSRF protection)
   - PKCE `code_verifier` and `code_challenge` (`S256`)
2. Stores `state` + `code_verifier` in short-lived HTTP-only cookies
3. Calls `workos.userManagement.getAuthorizationUrl({ ... })` with:
   - `provider: 'GitHubOAuth'`
   - `clientId`, `redirectUri`
   - `state`
   - `codeChallenge`, `codeChallengeMethod: 'S256'`
4. Redirects (302) to the WorkOS-hosted login URL

Code: `svelte-app/src/routes/login/+server.ts`

### Callback (`/auth/callback`)

`GET /auth/callback`:

1. Validates required query params:
   - `code`
   - `state` (must match `workos_oauth_state` cookie)
2. Exchanges the code:
   - `workos.userManagement.authenticateWithCode({ clientId, code, codeVerifier, session: { sealSession: true, cookiePassword } })`
3. Receives:
   - `sealedSession` (string)
   - `user` (WorkOS user)
4. Writes the sealed session to the HTTP-only cookie `workos_session`
5. Clears the temporary cookies and redirects to `/` (or `returnTo`)

Code: `svelte-app/src/routes/auth/callback/+server.ts`

### Session validation (hook)

`svelte-app/src/hooks.server.ts` runs for server requests (notably for endpoints like `/api/me`):

1. Reads `workos_session`
2. Uses `workos.userManagement.loadSealedSession({ sessionData, cookiePassword })`
3. Calls `session.authenticate()` to validate and read the current user
4. Populates:
   - `event.locals.user`
   - `event.locals.sessionId`
5. If invalid, clears the cookie

### Logout (`/logout`)

`GET /logout`:

1. Clears the local cookie
2. If a session existed and is valid, redirects through `session.getLogoutUrl({ returnTo })`

Code: `svelte-app/src/routes/logout/+server.ts`

## Using auth in the app

### Read the current user (client side)

Because `svelte-app/src/routes/+layout.ts` sets `ssr = false`, pages are rendered client-side.

The recommended way to read auth state in the UI is:

- fetch `GET /api/me`
- if `{ authenticated: true }`, render user UI; otherwise render “Sign in”

Endpoint: `svelte-app/src/routes/api/me/+server.ts`

### Protecting endpoints

In any `+server.ts` endpoint:

- check `locals.user` and return `401` if missing

Example:

```ts
if (!locals.user) throw error(401, 'Unauthenticated')
```

## Adding GitHub API access later

Right now we only use GitHub for **identity**.

When you need GitHub API access, you typically need one of:

1. Ask WorkOS to request additional GitHub scopes:
   - pass `providerScopes` to `getAuthorizationUrl({ providerScopes: [...] })`
2. Use the `oauthTokens` returned by `authenticateWithCode` (when enabled) to call GitHub

Implementation notes:

- Don’t store GitHub access tokens in the browser (keep them server-side).
- Decide whether tokens are per-user or per-organization, and how they map to your Lush model.

## File map

- WorkOS client + env: `svelte-app/src/lib/server/workos.ts`
- PKCE helpers: `svelte-app/src/lib/server/pkce.ts`
- Cookie/constants + user mapping: `svelte-app/src/lib/server/auth.ts`
- Session hook: `svelte-app/src/hooks.server.ts`
- Routes: `svelte-app/src/routes/login/+server.ts`, `svelte-app/src/routes/auth/callback/+server.ts`, `svelte-app/src/routes/logout/+server.ts`, `svelte-app/src/routes/api/me/+server.ts`
