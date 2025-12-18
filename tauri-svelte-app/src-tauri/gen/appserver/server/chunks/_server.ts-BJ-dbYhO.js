import { W as WORKOS_SESSION_COOKIE, c as cookieSecureFor, w as workos, a as workosCookiePassword } from './workos-NncfcneI.js';
import { redirect } from '@sveltejs/kit';
import '@workos-inc/node';
import 'node:fs';
import 'node:path';

const GET = async ({ cookies, url }) => {
  const sealedSession = cookies.get(WORKOS_SESSION_COOKIE);
  const secure = cookieSecureFor(url);
  cookies.delete(WORKOS_SESSION_COOKIE, { path: "/", secure });
  if (!sealedSession) throw redirect(302, "/");
  try {
    const session = await workos().userManagement.loadSealedSession({
      sessionData: sealedSession,
      cookiePassword: workosCookiePassword()
    });
    const auth = await session.authenticate();
    if (!auth.authenticated) throw redirect(302, "/");
    const logoutUrl = await session.getLogoutUrl({
      returnTo: url.origin
    });
    throw redirect(302, logoutUrl);
  } catch {
    throw redirect(302, "/");
  }
};

export { GET };
//# sourceMappingURL=_server.ts-BJ-dbYhO.js.map
