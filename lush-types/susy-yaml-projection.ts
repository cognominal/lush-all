import {
  CST,
  Parser,
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
import type { YamlAstType, YamlTokenType } from './token-lists'

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

type CstToken = {
  type: YamlTokenType
  offset: number
  source: string
}

const CST_ONLY_TYPES: ReadonlySet<YamlTokenType> = new Set([
  'byte-order-mark',
  'doc-mode',
  'doc-start',
  'space',
  'comment',
  'newline',
  'directive-line',
  'directive',
  'error',
  'anchor',
  'tag',
  'seq-item-ind',
  'explicit-key-ind',
  'map-value-ind',
  'flow-map-start',
  'flow-map-end',
  'flow-seq-start',
  'flow-seq-end',
  'flow-error-end',
  'comma',
  'block-scalar-header',
  'doc-end'
])

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

// Push CST tokens into the accumulator when they match allowed types.
function pushCstTokens(
  list: CST.SourceToken[] | undefined,
  out: CstToken[]
): void {
  if (!list) return
  for (const tok of list) {
    if (CST_ONLY_TYPES.has(tok.type)) {
      out.push({ type: tok.type, offset: tok.offset, source: tok.source })
    }
  }
}

// Push a CST token if it matches the allowed types.
function pushSingleCstToken(token: CST.Token, out: CstToken[]): void {
  if (!('source' in token) || typeof token.source !== 'string') return
  if (!('offset' in token) || typeof token.offset !== 'number') return
  if (CST_ONLY_TYPES.has(token.type as YamlTokenType)) {
    out.push({
      type: token.type as YamlTokenType,
      offset: token.offset,
      source: token.source
    })
  }
}

// Flatten CST tokens with offsets for CST-specific projection leaves.
function flattenCstTokens(token: CST.Token, out: CstToken[]): void {
  switch (token.type) {
    case 'block-scalar':
      for (const prop of token.props) flattenCstTokens(prop, out)
      break
    case 'block-map':
      for (const item of token.items) {
        pushCstTokens(item.start, out)
        if (item.key) flattenCstTokens(item.key, out)
        pushCstTokens(item.sep, out)
        if (item.value) flattenCstTokens(item.value, out)
      }
      break
    case 'block-seq':
      for (const item of token.items) {
        pushCstTokens(item.start, out)
        if (item.value) flattenCstTokens(item.value, out)
      }
      break
    case 'flow-collection':
      pushSingleCstToken(token.start, out)
      for (const item of token.items) {
        pushCstTokens(item.start, out)
        if (item.key) flattenCstTokens(item.key, out)
        pushCstTokens(item.sep, out)
        if (item.value) flattenCstTokens(item.value, out)
      }
      pushCstTokens(token.end, out)
      break
    case 'document':
      pushCstTokens(token.start, out)
      if (token.value) flattenCstTokens(token.value, out)
      pushCstTokens(token.end, out)
      break
    case 'doc-end':
      pushSingleCstToken(token, out)
      pushCstTokens(token.end, out)
      break
    default:
      pushSingleCstToken(token, out)
      if ('end' in token && token.end) pushCstTokens(token.end, out)
  }
}

// Collect CST tokens from the parser output.
function collectCstTokens(source: string): CstToken[] {
  const parser = new Parser()
  const tokens: CstToken[] = []
  for (const token of parser.parse(source)) flattenCstTokens(token, tokens)
  return tokens
}

// Convert CST tokens to Susy nodes.
function buildCstNodes(tokens: CstToken[]): SusyNode[] {
  return tokens.map((token) => ({
    kind: 'YAML',
    type: token.type,
    tokenIdx: nextTokenIdx(),
    text: token.source,
    x: token.offset,
    isCstToken: true
  }))
}

// Filter CST tokens that fall within a range.
function filterTokensInRange(
  tokens: SusyNode[],
  start: number,
  end: number
): SusyNode[] {
  return tokens.filter((token) => {
    if (typeof token.x !== 'number') return false
    if (typeof token.text !== 'string') return false
    const tokenEnd = token.x + token.text.length
    return token.x >= start && tokenEnd <= end
  })
}

// Remove CST tokens that are fully inside child ranges.
function excludeChildRanges(tokens: SusyNode[], children: SusyNode[]): SusyNode[] {
  return tokens.filter((token) => {
    if (typeof token.x !== 'number' || typeof token.text !== 'string') return false
    const tokenEnd = token.x + token.text.length
    for (const child of children) {
      if (typeof child.x !== 'number' || typeof child.text !== 'string') continue
      const childEnd = child.x + child.text.length
      if (token.x >= child.x && tokenEnd <= childEnd) return false
    }
    return true
  })
}

// Merge CST tokens into the AST Susy tree.
function mergeCstTokens(node: SusyNode, cstTokens: SusyNode[]): SusyNode {
  if (!node.kids || node.kids.length === 0) return node
  if (typeof node.x !== 'number' || typeof node.text !== 'string') return node
  const start = node.x
  const end = node.x + node.text.length
  const inRange = filterTokensInRange(cstTokens, start, end)
  if (inRange.length === 0) return node

  const nextKids = node.kids.map((child) => mergeCstTokens(child, inRange))
  const remaining = excludeChildRanges(inRange, nextKids)
  if (remaining.length === 0) return { ...node, kids: nextKids }

  const merged = [...nextKids, ...remaining]
  merged.sort((a, b) => {
    const ax = typeof a.x === 'number' ? a.x : 0
    const bx = typeof b.x === 'number' ? b.x : 0
    if (ax !== bx) return ax - bx
    return (a.text?.length ?? 0) - (b.text?.length ?? 0)
  })
  return { ...node, kids: merged }
}

// Convert a YAML AST node into a Susy tree.
function buildSusyNode(node: YamlAstNode, source: string): SusyNode {
  const type = getYamlAstType(node)
  const kids = mapChildren(node)
  const susyKids = kids.map((child) => buildSusyNode(child, source))
  const range = getNodeRange(node)
  const text = isDocument(node) ? source : getNodeText(node, source)
  return {
    kind: 'YAML',
    type,
    tokenIdx: nextTokenIdx(),
    kids: susyKids.length > 0 ? susyKids : undefined,
    text,
    x: isDocument(node) ? 0 : range?.start
  }
}

// Project YAML text into a Susy AST token tree.
export function susyYamlProjection(source: string): SusyNode {
  tokenIdxCounter = 0
  const doc = parseDocument(source, { keepSourceTokens: true })
  const astRoot = buildSusyNode(doc, source)
  const cstTokens = buildCstNodes(collectCstTokens(source))
  return mergeCstTokens(astRoot, cstTokens)
}
