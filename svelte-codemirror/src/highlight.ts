import { parse } from '../../yaml/src/index.ts'

export type HighlightMap = Map<string, string>

export type HighlightRegistry = {
  classFor: (kind: string, type: string) => string | null
  themeSpec: Record<string, Record<string, string>>
}

const colorMap: Record<string, string> = {
  blue: 'rgb(59, 130, 246)',
  red: 'rgb(239, 68, 68)',
  green: 'rgb(34, 197, 94)',
  yellow: 'rgb(234, 179, 8)',
  gray: 'rgb(156, 163, 175)',
  grey: 'rgb(156, 163, 175)',
  cyan: 'rgb(34, 211, 238)',
  magenta: 'rgb(217, 70, 239)',
  white: 'rgb(255, 255, 255)',
  black: 'rgb(17, 24, 39)'
}

const backgroundColorMap: Record<string, string> = {
  blue: 'rgba(59, 130, 246, 0.2)',
  red: 'rgba(239, 68, 68, 0.2)',
  green: 'rgba(34, 197, 94, 0.2)',
  yellow: 'rgba(234, 179, 8, 0.2)',
  gray: 'rgba(156, 163, 175, 0.2)',
  grey: 'rgba(156, 163, 175, 0.2)',
  cyan: 'rgba(34, 211, 238, 0.2)',
  magenta: 'rgba(217, 70, 239, 0.2)',
  white: 'rgba(255, 255, 255, 0.2)',
  black: 'rgba(17, 24, 39, 0.25)'
}

// Normalize highlight keys for consistent lookup.
function normalizeKey(key: string): string {
  return key.trim().toLowerCase()
}

// Parse highlight YAML into a normalized map.
export function parseHighlightYaml(text: string): HighlightMap {
  if (!text || !text.trim()) return new Map()
  try {
    const parsed: unknown = parse(text)
    if (!parsed || typeof parsed !== 'object') return new Map()
    const entries = Object.entries(parsed as Record<string, unknown>)
    const map = new Map<string, string>()
    for (const [key, value] of entries) {
      if (typeof value === 'string') {
        map.set(normalizeKey(key), value)
      }
    }
    return map
  } catch {
    return new Map()
  }
}

// Convert a style chain into CSS property values.
function styleForChain(chain: string): Record<string, string> {
  const style: Record<string, string> = {}
  const segments = chain
    .split('.')
    .map((segment) => segment.trim().toLowerCase())
    .filter(Boolean)

  for (const segment of segments) {
    if (segment === 'bold') {
      style.fontWeight = '700'
      continue
    }
    if (segment === 'italic') {
      style.fontStyle = 'italic'
      continue
    }
    if (segment === 'underline') {
      style.textDecoration = 'underline'
      continue
    }
    if (segment.startsWith('bg-')) {
      const bgName = segment.slice('bg-'.length)
      const background = backgroundColorMap[bgName]
      if (background) style.backgroundColor = background
      continue
    }
    const color = colorMap[segment]
    if (color) style.color = color
  }

  return style
}

// Build a registry with class lookup and theme spec generation.
export function createHighlightRegistry(map: HighlightMap): HighlightRegistry {
  const classByKey = new Map<string, string>()
  const classByChain = new Map<string, string>()
  const chainByKey = new Map<string, string>()
  const themeSpec: Record<string, Record<string, string>> = {}
  let classIdx = 0

  // Resolve or create a CSS class for a style chain.
  function classForChain(chain: string): string {
    const existing = classByChain.get(chain)
    if (existing) return existing
    const name = `cm-structural-hl-${classIdx}`
    classIdx += 1
    classByChain.set(chain, name)
    themeSpec[`.${name}`] = styleForChain(chain)
    return name
  }

  for (const [key, chain] of map.entries()) {
    const normalizedKey = normalizeKey(key)
    chainByKey.set(normalizedKey, chain)
    if (!chain.trim()) continue
    const className = classForChain(chain)
    classByKey.set(normalizedKey, className)
  }

  // Look up the class for a kind/type pair.
  function classFor(kind: string, type: string): string | null {
    const kindKey = kind.toLowerCase()
    const typeKey = type.toLowerCase()
    const candidates = [
      `${kindKey}.${typeKey}`,
      `${kindKey}.*`,
      `.${typeKey}`,
      `*.${typeKey}`,
      `js.${typeKey}`
    ]
    // Skip empty style rules so wildcard fallbacks can still apply.
    for (const key of candidates) {
      const chain = chainByKey.get(key)
      if (typeof chain === 'string' && !chain.trim()) continue
      const className = classByKey.get(key)
      if (className) return className
    }
    return null
  }

  return { classFor, themeSpec }
}
