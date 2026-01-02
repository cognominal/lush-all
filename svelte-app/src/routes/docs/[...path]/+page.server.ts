import { redirect } from '@sveltejs/kit'
import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ params }) => {
  const rawPath = params.path
  const normalized = rawPath.endsWith('.md') ? rawPath : `${rawPath}.md`
  const docPath = normalized.startsWith('docs/') ? normalized : `docs/${normalized}`
  throw redirect(307, `/docs?path=${encodeURIComponent(docPath)}`)
}
