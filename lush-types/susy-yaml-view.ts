import type { SusyNode } from './index'

export type Span = {
  from: number
  to: number
  textFrom?: number
  textTo?: number
}

export type SusyYamlViewProjection = {
  text: string
  spansByPath: Map<string, Span>
}

export type SusyYamlViewOptions = {
  indexer?: string
  filterKeys?: Iterable<string>
}

type ProjectionContext = {
  text: string
  spansByPath: Map<string, Span>
}

// Serialize a token path into a stable map key.
function serializePath(path: number[]): string {
  return JSON.stringify(path)
}

// Normalize filter keys into a lookup set.
function normalizeFilterKeys(input?: Iterable<string>): Set<string> {
  if (!input) return new Set()
  return new Set(input)
}

// Check whether a value is a Susy node.
function isSusyNode(value: unknown): value is SusyNode {
  return Boolean(value) && typeof value === 'object' && 'kind' in value && 'type' in value
}

// Resolve an indexer into a Susy node and its base path.
function resolveSusyPath(
  root: SusyNode,
  indexer: string | undefined
): { node: SusyNode; path: number[] } | null {
  if (!indexer?.trim()) return { node: root, path: [] }
  const parts = indexer.split('.').filter(Boolean)
  let current: SusyNode | undefined = root
  const path: number[] = []
  for (const part of parts) {
    if (!current) return null
    if (part === 'kids') continue
    if (!/^(0|[1-9]\d*)$/.test(part)) return null
    const idx = Number.parseInt(part, 10)
    const next = current.kids?.[idx]
    if (!next) return null
    path.push(idx)
    current = next
  }
  return current ? { node: current, path } : null
}

// Format a scalar YAML value for inline output.
function formatScalar(value: unknown): string {
  if (value === null) return 'null'
  if (typeof value === 'string') return JSON.stringify(value)
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  return JSON.stringify(value)
}

// Append a line to the projection text.
function appendLine(ctx: ProjectionContext, line: string): void {
  if (ctx.text.length > 0) {
    ctx.text += '\n'
  }
  ctx.text += line
}

// Compute the offset where the next line will start.
function nextLineOffset(text: string): number {
  return text.length > 0 ? text.length + 1 : 0
}

// Write a Susy node as YAML and record its span.
function writeNode(
  ctx: ProjectionContext,
  node: SusyNode,
  path: number[],
  indent: string,
  filterKeys: Set<string>,
  listPrefix: string
): void {
  const startOffset = nextLineOffset(ctx.text)
  const firstIndent = listPrefix ? `${indent}${listPrefix}` : indent
  const nextIndent = listPrefix ? `${indent}  ` : indent
  const kindType = `${node.kind}.${node.type}`

  if (!filterKeys.has('kt')) {
    appendLine(ctx, `${firstIndent}kt: ${kindType}`)
  }
  if (!filterKeys.has('tokenIdx')) {
    appendLine(ctx, `${nextIndent}tokenIdx: ${node.tokenIdx}`)
  }
  if (!filterKeys.has('text') && typeof node.text === 'string') {
    appendLine(ctx, `${nextIndent}text: ${formatScalar(node.text)}`)
  }
  if (!filterKeys.has('nameAsSon') && typeof node.nameAsSon === 'string') {
    appendLine(ctx, `${nextIndent}nameAsSon: ${formatScalar(node.nameAsSon)}`)
  }
  if (!filterKeys.has('x') && typeof node.x === 'number') {
    appendLine(ctx, `${nextIndent}x: ${node.x}`)
  }
  if (!filterKeys.has('stemCell') && typeof node.stemCell === 'boolean') {
    appendLine(ctx, `${nextIndent}stemCell: ${node.stemCell}`)
  }

  if (!filterKeys.has('kids') && Array.isArray(node.kids) && node.kids.length > 0) {
    appendLine(ctx, `${nextIndent}kids:`)
    node.kids.forEach((child, idx) => {
      writeNode(ctx, child, [...path, idx], `${nextIndent}  `, filterKeys, '- ')
    })
  }

  const endOffset = ctx.text.length
  ctx.spansByPath.set(serializePath(path), { from: startOffset, to: endOffset })
}

// Project a Susy tree into YAML text and span mappings.
export function projectSusyYamlView(
  root: SusyNode,
  options: SusyYamlViewOptions = {}
): SusyYamlViewProjection {
  const ctx: ProjectionContext = { text: '', spansByPath: new Map() }
  const filterKeys = normalizeFilterKeys(options.filterKeys)
  const resolved = resolveSusyPath(root, options.indexer)
  if (!resolved) {
    return { text: '', spansByPath: new Map() }
  }
  writeNode(ctx, resolved.node, resolved.path, '', filterKeys, '')
  return { text: ctx.text, spansByPath: ctx.spansByPath }
}

// Find the most specific Susy path for a YAML cursor position.
export function findSusyYamlPathAtPos(
  spansByPath: Map<string, Span>,
  pos: number
): number[] | null {
  let bestPath: number[] | null = null
  let bestSpan: Span | null = null
  for (const [key, span] of spansByPath.entries()) {
    if (pos < span.from || pos > span.to) continue
    const path = JSON.parse(key) as unknown
    if (!Array.isArray(path) || !path.every((entry) => typeof entry === 'number')) {
      continue
    }
    const spanSize = span.to - span.from
    const bestSize = bestSpan ? bestSpan.to - bestSpan.from : Number.POSITIVE_INFINITY
    if (spanSize < bestSize) {
      bestPath = path
      bestSpan = span
    }
  }
  return bestPath
}
