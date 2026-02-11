import { copyFile, mkdir, readdir, readFile, stat } from 'node:fs/promises'
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

// Ensure the user themes directory exists and has defaults.
export async function ensureThemesDir(): Promise<void> {
  const userDir = getUserThemesDir()
  await mkdir(userDir, { recursive: true })
  const entries = await readdir(userDir).catch(() => [])
  const hasYaml = entries.some((entry) => entry.endsWith('.yaml'))
  if (hasYaml) return
  const repoDir = getRepoThemesDir()
  const repoEntries = await readdir(repoDir).catch(() => [])
  await Promise.all(
    repoEntries
      .filter((entry) => entry.endsWith('.yaml'))
      .map((entry) => copyFile(path.join(repoDir, entry), path.join(userDir, entry)))
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
  try {
    await stat(userPath)
    return true
  } catch {
    // fall through
  }
  const repoPath = path.join(getRepoThemesDir(), `${safeName}.yaml`)
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
