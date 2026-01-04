import { readFileSync } from 'node:fs'
import { compile } from 'svelte/compiler'
import { parse as yamlParse, stringify as yamlStringify } from 'yaml'

const PATH_PATTERN = /^[/.\\w-]+$/
const PICKER_SEPARATOR = '.'

type UnknownRecord = Record<string, unknown>
type KeySource<T> = Map<string, T> | Record<string, T>

export type Picker = string

function isPathLike(value: string): boolean {
  return PATH_PATTERN.test(value)
}

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null
}

// Read a value from a Map or record by key.
function readKeyValue<T>(source: KeySource<T>, key: string): T | undefined {
  if (source instanceof Map) return source.get(key)
  if (Object.prototype.hasOwnProperty.call(source, key)) return source[key]
  return undefined
}

// Parse a dotted key while honoring single-quoted segments.
function parseKeyParts(key: string): string[] {
  const parts: string[] = []
  let current = ''
  let inQuote = false
  let escape = false
  for (const char of key) {
    if (escape) {
      current += char
      escape = false
      continue
    }
    if (char === '\\' && inQuote) {
      escape = true
      continue
    }
    if (char === "'") {
      inQuote = !inQuote
      continue
    }
    if (char === '.' && !inQuote) {
      parts.push(current)
      current = ''
      continue
    }
    current += char
  }
  parts.push(current)
  return parts
}

// Format a key part with quotes when it contains separators.
function formatKeyPart(part: string): string {
  if (part === '*') return part
  if (!/[.'*]/.test(part)) return part
  const escaped = part.replace(/\\/g, '\\\\').replace(/'/g, "\\'")
  return `'${escaped}'`
}

// Build a normalized dotted key from parsed parts.
function formatKey(parts: string[]): string {
  return parts.map(formatKeyPart).join('.')
}

function pickValue(root: unknown, picker: string): unknown {
  const parts = picker === '' ? [] : picker.split(PICKER_SEPARATOR)
  let current: unknown = root
  for (const part of parts) {
    if (current === null || current === undefined) return undefined
    if (/^\d+$/.test(part)) {
      if (!Array.isArray(current)) return undefined
      current = current[Number.parseInt(part, 10)]
      continue
    }
    if (!isRecord(current)) return undefined
    current = current[part]
  }
  return current
}

function weedoutKeys(value: unknown, keys: Set<string>): unknown {
  if (Array.isArray(value)) {
    return value.map((entry) => weedoutKeys(entry, keys))
  }
  if (isRecord(value)) {
    const result: UnknownRecord = {}
    for (const [key, entry] of Object.entries(value)) {
      if (keys.has(key)) continue
      result[key] = weedoutKeys(entry, keys)
    }
    return result
  }
  return value
}

// Remove selected keys from a YAML value and stringify.
export function yaml_weedout(input: unknown, keys: string[] | string): string {
  const source = typeof input === 'string' ? yamlParse(input) : input
  const keyList =
    typeof keys === 'string'
      ? keys.split(/\s+/).filter(Boolean)
      : keys
  const stripped = weedoutKeys(source, new Set(keyList))
  return yamlStringify(stripped)
}

// Pick a value from a compiled Svelte AST path.
export function sveltePick(
  codeOrPath: string,
  picker: Picker,
  yaml = false
): unknown {
  const source = isPathLike(codeOrPath)
    ? readFileSync(codeOrPath, 'utf8')
    : codeOrPath
  const compiled = compile(source, isPathLike(codeOrPath) ? { filename: codeOrPath } : {})
  const picked = pickValue(compiled, picker)
  return yaml ? yamlStringify(picked) : picked
}

// Resolve a key with foo.bar, *.bar, foo.*, and * fallbacks.
export function lookupPatternValue<T>(
  source: KeySource<T>,
  key: string
): T | undefined {
  const parts = parseKeyParts(key)
  const normalizedKey = formatKey(parts)
  const direct = readKeyValue(source, key)
  if (direct !== undefined) return direct
  if (normalizedKey !== key) {
    const normalized = readKeyValue(source, normalizedKey)
    if (normalized !== undefined) return normalized
  }
  if (parts.length === 2) {
    const wildcardLeft = readKeyValue(source, formatKey(['*', parts[1]]))
    if (wildcardLeft !== undefined) return wildcardLeft
    const wildcardRight = readKeyValue(source, formatKey([parts[0], '*']))
    if (wildcardRight !== undefined) return wildcardRight
  }
  return readKeyValue(source, '*')
}
