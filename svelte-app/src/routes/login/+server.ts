import type { RequestHandler } from '@sveltejs/kit'
import {
  WORKOS_OAUTH_STATE_COOKIE,
  WORKOS_PKCE_VERIFIER_COOKIE,
  WORKOS_RETURN_TO_COOKIE,
  cookieSecureFor
} from '$lib/server/auth'
import { pkceChallengeS256, randomBase64Url } from '$lib/server/pkce'
import { workos, workosClientId, workosRedirectUri } from '$lib/server/workos'
import { redirect } from '@sveltejs/kit'

const OAUTH_COOKIE_MAX_AGE_SECONDS = 10 * 60

export const GET: RequestHandler = async ({ cookies, url }) => {
  const state = randomBase64Url(32)
  const codeVerifier = randomBase64Url(32)
  const codeChallenge = pkceChallengeS256(codeVerifier)

  const secure = cookieSecureFor(url)
  cookies.set(WORKOS_OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    secure,
    maxAge: OAUTH_COOKIE_MAX_AGE_SECONDS
  })
  cookies.set(WORKOS_PKCE_VERIFIER_COOKIE, codeVerifier, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    secure,
    maxAge: OAUTH_COOKIE_MAX_AGE_SECONDS
  })

  const returnTo = url.searchParams.get('returnTo')
  if (returnTo) {
    cookies.set(WORKOS_RETURN_TO_COOKIE, returnTo, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      secure,
      maxAge: OAUTH_COOKIE_MAX_AGE_SECONDS
    })
  }

  const authorizationUrl = await workos().userManagement.getAuthorizationUrl({
    provider: 'GitHubOAuth',
    clientId: workosClientId(),
    redirectUri: workosRedirectUri(),
    state,
    codeChallenge,
    codeChallengeMethod: 'S256',
    screenHint: 'sign-in'
  })

  throw redirect(302, authorizationUrl)
}

