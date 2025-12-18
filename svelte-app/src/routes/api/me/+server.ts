import type { RequestHandler } from '@sveltejs/kit'
import { json } from '@sveltejs/kit'

export const GET: RequestHandler = async ({ locals }) => {
  if (!locals.user) {
    return json({ authenticated: false })
  }
  return json({
    authenticated: true,
    user: locals.user
  })
}

