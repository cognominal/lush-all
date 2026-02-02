import {
  isAlias,
  isDocument,
  isMap,
  isPair,
  isScalar,
  isSeq,
  parseDocument,
  type Alias,
  type Document,
  type Node,
  type Pair,
  type Range,
  type Scalar,
  type YAMLMap,
  type YAMLSeq
} from 'yaml'
import type { SusyNode } from './index'
import type { YamlAstType } from './token-lists'

let tokenIdxCounter = 0

type YamlAstNode =
  | Document
  | YAMLMap
  | YAMLSeq
  | Pair
  | Scalar
  | Alias
  | Node

type RangeSlice = { start: number; end: number }

// Increment and return the next token index.
function nextTokenIdx(): number {
  const idx = tokenIdxCounter
  tokenIdxCounter += 1
  return idx
}

// Normalize a parser range into a slice.
function toRangeSlice(range?: Range | null): RangeSlice | null {
  if (!range) return null
  const [start, , end] = range
  if (typeof start !== 'number' || typeof end !== 'number') return null
  return { start, end }
}

// Create a range from child nodes.
function rangeFromChildren(children: YamlAstNode[]): RangeSlice | null {
  let start = Number.POSITIVE_INFINITY
  let end = Number.NEGATIVE_INFINITY
  for (const child of children) {
    const range = getNodeRange(child)
    if (!range) continue
    start = Math.min(start, range.start)
    end = Math.max(end, range.end)
  }
  if (!Number.isFinite(start) || !Number.isFinite(end)) return null
  return { start, end }
}

// Resolve a node's source range.
function getNodeRange(node: YamlAstNode): RangeSlice | null {
  if (isDocument(node)) return toRangeSlice(node.range)
  if (isPair(node)) {
    const children = pairChildren(node)
    return rangeFromChildren(children)
  }
  const withRange = node as { range?: Range | null }
  return toRangeSlice(withRange.range)
}

// Read the source text for a node.
function getNodeText(node: YamlAstNode, source: string): string | undefined {
  const range = getNodeRange(node)
  if (!range) return undefined
  return source.slice(range.start, range.end)
}

// Resolve a YAML AST type name from a node.
function getYamlAstType(node: YamlAstNode): YamlAstType {
  if (isDocument(node)) return 'Document'
  if (isMap(node)) return 'YAMLMap'
  if (isSeq(node)) return 'YAMLSeq'
  if (isPair(node)) return 'Pair'
  if (isScalar(node)) return 'Scalar'
  if (isAlias(node)) return 'Alias'
  return 'Scalar'
}

// Resolve children for a YAML node.
function mapChildren(node: YamlAstNode): YamlAstNode[] {
  if (isDocument(node)) return node.contents ? [node.contents] : []
  if (isMap(node)) return node.items
  if (isSeq(node)) return node.items
  if (isPair(node)) return pairChildren(node)
  return []
}

// Resolve pair key/value nodes.
function pairChildren(node: Pair): YamlAstNode[] {
  const children: YamlAstNode[] = []
  if (node.key) children.push(node.key as YamlAstNode)
  if (node.value) children.push(node.value as YamlAstNode)
  return children
}

// Convert a YAML AST node into a Susy tree.
function buildSusyNode(node: YamlAstNode, source: string): SusyNode {
  const type = getYamlAstType(node)
  const kids = mapChildren(node)
  const susyKids = kids.map((child) => buildSusyNode(child, source))
  const text = kids.length === 0 ? getNodeText(node, source) : undefined
  const range = getNodeRange(node)
  return {
    kind: 'YAML',
    type,
    tokenIdx: nextTokenIdx(),
    kids: susyKids.length > 0 ? susyKids : undefined,
    text,
    x: range?.start
  }
}

// Project YAML text into a Susy AST token tree.
export function susyYamlProjection(source: string): SusyNode {
  tokenIdxCounter = 0
  const doc = parseDocument(source, { keepSourceTokens: true })
  return buildSusyNode(doc, source)
}
