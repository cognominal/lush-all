import type { RequestHandler } from '@sveltejs/kit'
import { WORKOS_SESSION_COOKIE, cookieSecureFor } from '$lib/server/auth'
import { workos, workosCookiePassword } from '$lib/server/workos'
import { redirect } from '@sveltejs/kit'

export const GET: RequestHandler = async ({ cookies, url }) => {
  const sealedSession = cookies.get(WORKOS_SESSION_COOKIE)
  const secure = cookieSecureFor(url)

  cookies.delete(WORKOS_SESSION_COOKIE, { path: '/', secure })

  if (!sealedSession) throw redirect(302, '/')

  try {
    const session = await workos().userManagement.loadSealedSession({
      sessionData: sealedSession,
      cookiePassword: workosCookiePassword()
    })
    const auth = await session.authenticate()
    if (!auth.authenticated) throw redirect(302, '/')

    const logoutUrl = await session.getLogoutUrl({
      returnTo: url.origin
    })

    throw redirect(302, logoutUrl)
  } catch {
    throw redirect(302, '/')
  }
}
