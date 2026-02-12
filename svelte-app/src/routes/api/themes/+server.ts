import type { RequestHandler } from '@sveltejs/kit'
import { json } from '@sveltejs/kit'
import {
  eraseUserThemes,
  ensureThemesDir,
  listThemeNames,
  normalizeThemeName,
  readThemeText
} from '$lib/server/themes'

// List available themes or return a single theme payload.
export const GET: RequestHandler = async ({ url }) => {
  await ensureThemesDir()
  const nameParam = url.searchParams.get('name')
  if (nameParam) {
    const themeName = normalizeThemeName(nameParam) || 'default'
    const yaml = await readThemeText(themeName)
    if (!yaml) {
      return json({ error: 'Theme not found.' }, { status: 404 })
    }
    return json({ name: themeName, yaml })
  }
  const themes = await listThemeNames()
  return json({ themes })
}

// Delete all user theme files under ~/.config/lush/themes.
export const DELETE: RequestHandler = async () => {
  try {
    const deleted = await eraseUserThemes()
    return json({ ok: true, deleted })
  } catch {
    return json({ error: 'Failed to erase user themes.' }, { status: 500 })
  }
}
