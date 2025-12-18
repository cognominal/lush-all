import { b as WORKOS_OAUTH_STATE_COOKIE, d as WORKOS_PKCE_VERIFIER_COOKIE, w as workos, a as workosCookiePassword, e as workosClientId, c as cookieSecureFor, W as WORKOS_SESSION_COOKIE, f as WORKOS_RETURN_TO_COOKIE } from './workos-NncfcneI.js';
import { error, redirect } from '@sveltejs/kit';
import '@workos-inc/node';
import 'node:fs';
import 'node:path';

const SESSION_COOKIE_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;
const GET = async (event) => {
  const { url, cookies, request } = event;
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  if (!code) throw error(400, "Missing `code`");
  if (!state) throw error(400, "Missing `state`");
  const expectedState = cookies.get(WORKOS_OAUTH_STATE_COOKIE);
  if (!expectedState || expectedState !== state) throw error(400, "Invalid OAuth state");
  const codeVerifier = cookies.get(WORKOS_PKCE_VERIFIER_COOKIE);
  if (!codeVerifier) throw error(400, "Missing PKCE verifier");
  const userAgent = request.headers.get("user-agent") ?? void 0;
  const ipAddress = event.getClientAddress?.();
  const auth = await workos().userManagement.authenticateWithCode({
    clientId: workosClientId(),
    code,
    codeVerifier,
    ipAddress,
    userAgent,
    session: {
      sealSession: true,
      cookiePassword: workosCookiePassword()
    }
  });
  if (!auth.sealedSession) throw error(500, "Missing sealed session");
  const secure = cookieSecureFor(url);
  cookies.set(WORKOS_SESSION_COOKIE, auth.sealedSession, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure,
    maxAge: SESSION_COOKIE_MAX_AGE_SECONDS
  });
  cookies.delete(WORKOS_OAUTH_STATE_COOKIE, { path: "/", secure });
  cookies.delete(WORKOS_PKCE_VERIFIER_COOKIE, { path: "/", secure });
  const returnTo = cookies.get(WORKOS_RETURN_TO_COOKIE);
  if (returnTo) cookies.delete(WORKOS_RETURN_TO_COOKIE, { path: "/", secure });
  throw redirect(302, returnTo ?? "/");
};

export { GET };
//# sourceMappingURL=_server.ts-B8v-s1k1.js.map
