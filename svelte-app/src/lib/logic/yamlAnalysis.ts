import type { TokenMultiLine } from 'lush-types'
import { tokenText, type InputToken } from 'lush-types'
import {
  Document,
  isMap,
  isNode,
  isSeq,
  lushify,
  parse,
  parseDocument,
  stringify,
  type Node as YamlNode
} from '@lush/yaml'
import { inspect } from 'util'

export type BreadcrumbItem = { type: string; range: { from: number; to: number } | null }

export type YamlAnalysis = {
  yamlText: string
  lush: TokenMultiLine | undefined
  doc: Document.Parsed | null
  jsView: string
  errors: string[]
}

export type SelectedTokenInput =
  | {
      token: InputToken
      lineIdx: number
      tokenIdx: number
    }
  | null

export function analyzeYaml(yamlText: string): YamlAnalysis {
  let doc: Document.Parsed | null = null
  const errors: string[] = []

  try {
    doc = parseDocument(yamlText, { keepSourceTokens: true })
    if (doc.errors?.length) errors.push(String(doc.errors[0]))
  } catch (err) {
    errors.push(err instanceof Error ? err.message : String(err))
  }

  let lush: TokenMultiLine | undefined = undefined
  try {
    lush = lushify(yamlText)
  } catch {
    lush = undefined
  }

  let jsView = ''
  try {
    const jsVal = parse(yamlText)
    jsView = inspect(jsVal, { depth: Infinity, colors: false, compact: false })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    jsView = `! invalid YAML: ${msg}`
  }

  return { yamlText, lush, doc, jsView, errors }
}

function offsetToLineCol(text: string, offset: number): { lineIdx: number; colIdx: number } {
  const clamped = Math.max(0, Math.min(offset, text.length))
  let lineIdx = 0
  let lineStart = 0
  for (let i = 0; i < clamped; i++) {
    if (text.charCodeAt(i) === 10) {
      lineIdx += 1
      lineStart = i + 1
    }
  }
  return { lineIdx, colIdx: clamped - lineStart }
}

function normalizeTokenPositions(line: InputToken[]): void {
  let cursor = 0
  for (let i = 0; i < line.length; i++) {
    const tok = line[i]
    if (!tok) continue
    tok.tokenIdx = i
    tok.x = cursor
    cursor += tokenText(tok).length
  }
}

export function selectedTokenInputAtOffset(
  analysis: YamlAnalysis,
  offset: number
): SelectedTokenInput {
  const lush = analysis.lush
  if (!lush || lush.length === 0) return null

  const { lineIdx, colIdx } = offsetToLineCol(analysis.yamlText, offset)
  const line = lush[lineIdx]
  if (!line) return null

  if (line.some(t => typeof t?.x !== 'number')) normalizeTokenPositions(line as any)

  for (let i = 0; i < line.length; i++) {
    const tok = line[i]
    if (!tok) continue
    const x = typeof tok.x === 'number' ? tok.x : 0
    const w = tokenText(tok).length
    if (colIdx >= x && colIdx < x + w) return { token: tok, lineIdx, tokenIdx: i }
  }
  return null
}

export function tokenInputAsYaml(selected: SelectedTokenInput): string {
  if (!selected) return ''
  const t = selected.token
  const withoutSubtokens: Partial<InputToken> = {
    kind: t.kind,
    type: t.type,
    tokenIdx: t.tokenIdx,
    x: t.x,
    text: t.text,
    completion: t.completion
  }
  return stringify(withoutSubtokens).trimEnd()
}

function containsOffset(
  node: YamlNode | null | undefined,
  offset: number
): boolean {
  const r = node?.range
  if (!r) return false
  return offset >= r[0] && offset < r[2]
}

function nodeTokenType(node: YamlNode): string | null {
  const t = (node as any)?.srcToken?.type
  return typeof t === 'string' ? t : null
}

function findDeepestPathAtOffset(
  node: YamlNode,
  offset: number,
  path: YamlNode[] = []
): YamlNode[] {
  if (!containsOffset(node, offset)) return path

  const nextPath = [...path, node]

  if (isMap(node)) {
    for (const pair of node.items) {
      const key = (pair as any)?.key
      const value = (pair as any)?.value

      if (isNode(key) && containsOffset(key, offset)) {
        return findDeepestPathAtOffset(key, offset, nextPath)
      }
      if (isNode(value) && containsOffset(value, offset)) {
        return findDeepestPathAtOffset(value, offset, nextPath)
      }
    }
  }

  if (isSeq(node)) {
    for (const item of node.items as any[]) {
      if (isNode(item) && containsOffset(item, offset)) {
        return findDeepestPathAtOffset(item, offset, nextPath)
      }
    }
  }

  return nextPath
}

export function breadcrumbsAtOffset(
  analysis: YamlAnalysis,
  offset: number
): BreadcrumbItem[] {
  const doc = analysis.doc
  const docRange =
    doc?.range ? { from: doc.range[0], to: doc.range[2] } : null
  const crumbs: BreadcrumbItem[] = [{ type: 'document', range: docRange }]
  const root = doc?.contents
  if (!doc || !root || !isNode(root)) return crumbs

  const path = findDeepestPathAtOffset(root, offset)
  for (const node of path) {
    const type = nodeTokenType(node)
    if (!type) continue
    const r = node.range
    const range = r ? { from: r[0], to: r[2] } : null
    crumbs.push({ type, range })
  }
  return crumbs
}
