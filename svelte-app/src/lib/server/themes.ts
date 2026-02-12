import { copyFile, mkdir, readdir, readFile, stat, unlink } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// Resolve the repository root path for theme assets.
export function getRepoRoot(): string {
  return fileURLToPath(new URL('../../../..', import.meta.url))
}

// Resolve the repository themes directory.
export function getRepoThemesDir(): string {
  return path.join(getRepoRoot(), 'svelte-codemirror', 'src', 'themes')
}

// Resolve the user-level themes directory.
export function getUserThemesDir(): string {
  return path.join(os.homedir(), '.config', 'lush', 'themes')
}

// Normalize a theme name for file access.
export function normalizeThemeName(value: string): string {
  return value.trim().replace(/[^a-z0-9-_]/gi, '').toLowerCase()
}

// Parse a simple YAML map (key: value) into a normalized string map.
function parseThemeYamlMap(text: string): Map<string, string> {
  const map = new Map<string, string>()
  const lines = text.split(/\r?\n/)
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const colon = trimmed.indexOf(':')
    if (colon <= 0) continue
    const key = trimmed.slice(0, colon).trim().toLowerCase()
    const value = trimmed.slice(colon + 1).trim()
    if (!key || !value) continue
    map.set(key, value)
  }
  return map
}

// Serialize a normalized theme map as sorted YAML key/value lines.
function serializeThemeYamlMap(map: Map<string, string>): string {
  const entries = Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b))
  if (entries.length === 0) return ''
  return `${entries.map(([key, value]) => `${key}: ${value}`).join('\n')}\n`
}

// Merge missing keys from the repo theme into the user theme without overrides.
async function mergeMissingThemeDefaults(repoPath: string, userPath: string): Promise<void> {
  const [repoText, userText] = await Promise.all([
    readFile(repoPath, 'utf8'),
    readFile(userPath, 'utf8')
  ])
  const repoMap = parseThemeYamlMap(repoText)
  if (repoMap.size === 0) return
  const userMap = parseThemeYamlMap(userText)
  let changed = false
  for (const [key, value] of repoMap.entries()) {
    if (userMap.has(key)) continue
    userMap.set(key, value)
    changed = true
  }
  if (!changed) return
  await import('node:fs/promises').then(({ writeFile }) =>
    writeFile(userPath, serializeThemeYamlMap(userMap), 'utf8')
  )
}

// Ensure the user themes directory exists and has defaults.
export async function ensureThemesDir(): Promise<void> {
  const userDir = getUserThemesDir()
  await mkdir(userDir, { recursive: true })
  const repoDir = getRepoThemesDir()
  const repoEntries = await readdir(repoDir).catch(() => [])
  const themeFiles = repoEntries.filter((entry) => entry.endsWith('.yaml'))
  await Promise.all(
    themeFiles.map(async (entry) => {
      const repoPath = path.join(repoDir, entry)
      const userPath = path.join(userDir, entry)
      try {
        await stat(userPath)
        await mergeMissingThemeDefaults(repoPath, userPath)
      } catch {
        await copyFile(repoPath, userPath)
      }
    })
  )
}

// Resolve a theme file path in the user directory.
export function getThemePath(themeName: string): string {
  const safeName = normalizeThemeName(themeName) || 'default'
  return path.join(getUserThemesDir(), `${safeName}.yaml`)
}

// Ensure a named theme file exists in the user directory.
export async function ensureThemeFile(themeName: string): Promise<boolean> {
  const safeName = normalizeThemeName(themeName) || 'default'
  const userPath = getThemePath(safeName)
  const repoPath = path.join(getRepoThemesDir(), `${safeName}.yaml`)
  try {
    await stat(userPath)
    await mergeMissingThemeDefaults(repoPath, userPath).catch(() => {})
    return true
  } catch {
    // fall through
  }
  try {
    await copyFile(repoPath, userPath)
    return true
  } catch {
    return false
  }
}

// Read the text for a named theme in the user directory.
export async function readThemeText(themeName: string): Promise<string | null> {
  const safeName = normalizeThemeName(themeName) || 'default'
  const exists = await ensureThemeFile(safeName)
  if (!exists) return null
  return readFile(getThemePath(safeName), 'utf8')
}

// List available theme names in the user directory.
export async function listThemeNames(): Promise<string[]> {
  await ensureThemesDir()
  const entries = await readdir(getUserThemesDir()).catch(() => [])
  return entries
    .filter((entry) => entry.endsWith('.yaml'))
    .map((entry) => entry.replace(/\.yaml$/i, ''))
    .sort((a, b) => a.localeCompare(b))
}

// Delete user theme yaml files from the user themes directory.
export async function eraseUserThemes(): Promise<number> {
  await ensureThemesDir()
  const userDir = getUserThemesDir()
  const entries = await readdir(userDir).catch(() => [])
  const themeFiles = entries.filter((entry) => entry.endsWith('.yaml'))
  await Promise.all(themeFiles.map((entry) => unlink(path.join(userDir, entry))))
  return themeFiles.length
}
