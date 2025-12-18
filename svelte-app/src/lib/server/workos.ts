import { WorkOS } from '@workos-inc/node'
import fs from 'node:fs'
import path from 'node:path'

type WorkosKeyName =
  | 'WORKOS_API_KEY'
  | 'WORKOS_CLIENT_ID'
  | 'WORKOS_REDIRECT_URI'
  | 'WORKOS_COOKIE_PASSWORD'

type WorkosConfig = Record<WorkosKeyName, string>

function stripOuterQuotes(value: string): string {
  const trimmed = value.trim()
  const first = trimmed[0]
  const last = trimmed[trimmed.length - 1]
  if (
    trimmed.length >= 2 &&
    ((first === '"' && last === '"') || (first === "'" && last === "'"))
  ) {
    return trimmed.slice(1, -1)
  }
  return trimmed
}

function parseWorkosKeysFile(text: string): Partial<WorkosConfig> {
  const out: Partial<WorkosConfig> = {}
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue
    const eq = line.indexOf('=')
    if (eq <= 0) continue
    const k = line.slice(0, eq).trim()
    const v = stripOuterQuotes(line.slice(eq + 1))
    if (!v) continue

    if (
      k === 'WORKOS_API_KEY' ||
      k === 'WORKOS_CLIENT_ID' ||
      k === 'WORKOS_REDIRECT_URI' ||
      k === 'WORKOS_COOKIE_PASSWORD'
    ) {
      out[k] = v
    }
  }
  return out
}

function findWorkosKeysPath(): string | null {
  // Prefer `workos-keys.txt` at the repo root, but allow placing it in `svelte-app/` too.
  // We search upwards from the current working directory.
  let dir = process.cwd()
  for (let i = 0; i < 6; i++) {
    const candidate = path.join(dir, 'workos-keys.txt')
    if (fs.existsSync(candidate)) return candidate
    const parent = path.dirname(dir)
    if (parent === dir) break
    dir = parent
  }
  return null
}

function readWorkosKeysFile(): Partial<WorkosConfig> {
  const p = findWorkosKeysPath()
  if (!p) return {}
  try {
    const text = fs.readFileSync(p, 'utf8')
    return parseWorkosKeysFile(text)
  } catch {
    return {}
  }
}

const cachedFromFile = readWorkosKeysFile()

function requireKey(name: WorkosKeyName): string {
  const v = cachedFromFile[name] ?? process.env[name]
  if (typeof v !== 'string' || v.length === 0) {
    throw new Error(
      `Missing ${name}. Set it in workos-keys.txt (recommended for local dev) or in the environment.`
    )
  }
  return v
}

export function workos(): WorkOS {
  return new WorkOS(requireKey('WORKOS_API_KEY'))
}

export function workosClientId(): string {
  return requireKey('WORKOS_CLIENT_ID')
}

export function workosRedirectUri(): string {
  return requireKey('WORKOS_REDIRECT_URI')
}

export function workosCookiePassword(): string {
  return requireKey('WORKOS_COOKIE_PASSWORD')
}
