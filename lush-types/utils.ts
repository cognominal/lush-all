import { readFileSync } from 'node:fs'
import { compile } from 'svelte/compiler'
import { parse as yamlParse, stringify as yamlStringify } from 'yaml'

const PATH_PATTERN = /^[/.\\w-]+$/
const PICKER_SEPARATOR = '.'

type UnknownRecord = Record<string, unknown>

export type Picker = string

function isPathLike(value: string): boolean {
  return PATH_PATTERN.test(value)
}

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null
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
