import { c as cookieSecureFor, b as WORKOS_OAUTH_STATE_COOKIE, d as WORKOS_PKCE_VERIFIER_COOKIE, f as WORKOS_RETURN_TO_COOKIE, w as workos, g as workosRedirectUri, e as workosClientId } from './workos-NncfcneI.js';
import crypto from 'node:crypto';
import { redirect } from '@sveltejs/kit';
import '@workos-inc/node';
import 'node:fs';
import 'node:path';

function base64UrlEncode(buf) {
  return Buffer.from(buf).toString("base64").replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}
function randomBase64Url(bytes) {
  return base64UrlEncode(crypto.randomBytes(bytes));
}
function pkceChallengeS256(verifier) {
  const hash = crypto.createHash("sha256").update(verifier).digest();
  return base64UrlEncode(hash);
}
const OAUTH_COOKIE_MAX_AGE_SECONDS = 10 * 60;
const GET = async ({ cookies, url }) => {
  const state = randomBase64Url(32);
  const codeVerifier = randomBase64Url(32);
  const codeChallenge = pkceChallengeS256(codeVerifier);
  const secure = cookieSecureFor(url);
  cookies.set(WORKOS_OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure,
    maxAge: OAUTH_COOKIE_MAX_AGE_SECONDS
  });
  cookies.set(WORKOS_PKCE_VERIFIER_COOKIE, codeVerifier, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure,
    maxAge: OAUTH_COOKIE_MAX_AGE_SECONDS
  });
  const returnTo = url.searchParams.get("returnTo");
  if (returnTo) {
    cookies.set(WORKOS_RETURN_TO_COOKIE, returnTo, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure,
      maxAge: OAUTH_COOKIE_MAX_AGE_SECONDS
    });
  }
  const authorizationUrl = await workos().userManagement.getAuthorizationUrl({
    provider: "GitHubOAuth",
    clientId: workosClientId(),
    redirectUri: workosRedirectUri(),
    state,
    codeChallenge,
    codeChallengeMethod: "S256",
    screenHint: "sign-in"
  });
  throw redirect(302, authorizationUrl);
};

export { GET };
//# sourceMappingURL=_server.ts-WC9EybQD.js.map
