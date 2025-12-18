import type { User } from '@workos-inc/node'
import type { AuthUser } from '$lib/types/auth'

export const WORKOS_SESSION_COOKIE = 'workos_session'
export const WORKOS_OAUTH_STATE_COOKIE = 'workos_oauth_state'
export const WORKOS_PKCE_VERIFIER_COOKIE = 'workos_pkce_verifier'
export const WORKOS_RETURN_TO_COOKIE = 'workos_return_to'

export function cookieSecureFor(url: URL): boolean {
  return url.protocol === 'https:'
}

export function toAuthUser(user: User): AuthUser {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName
  }
}

