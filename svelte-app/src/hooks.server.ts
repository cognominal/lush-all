import type { Handle } from '@sveltejs/kit'
import { workos, workosCookiePassword } from '$lib/server/workos'
import { WORKOS_SESSION_COOKIE, cookieSecureFor, toAuthUser } from '$lib/server/auth'

export const handle: Handle = async ({ event, resolve }) => {
  const sealedSession = event.cookies.get(WORKOS_SESSION_COOKIE)
  if (!sealedSession) {
    event.locals.user = null
    event.locals.sessionId = null
    return resolve(event)
  }

  try {
    const session = await workos().userManagement.loadSealedSession({
      sessionData: sealedSession,
      cookiePassword: workosCookiePassword()
    })
    const auth = await session.authenticate()

    if (!auth.authenticated) {
      event.cookies.delete(WORKOS_SESSION_COOKIE, { path: '/', secure: cookieSecureFor(event.url) })
      event.locals.user = null
      event.locals.sessionId = null
      return resolve(event)
    }

    event.locals.user = toAuthUser(auth.user)
    event.locals.sessionId = auth.sessionId
  } catch {
    event.cookies.delete(WORKOS_SESSION_COOKIE, { path: '/', secure: cookieSecureFor(event.url) })
    event.locals.user = null
    event.locals.sessionId = null
  }

  return resolve(event)
}

