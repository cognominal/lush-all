import { parse } from 'svelte/compiler'
import { NAKED_STRING_TYPE, SPACE_TYPE } from './token-lists'
import type { LushTokenKind, SusyNode, TokenTypeName } from './index'
import type { EmitExpr, MatchValue, RuleprojRule } from './ruleproj'
import { parseRuleproj } from './ruleproj'

type AstreNode = {
  type: string
  name?: string
  data?: string
  children?: AstreNode[]
}

type CaptureMap = Record<string, unknown>

type LesteToken = {
  kind: LushTokenKind
  type: TokenTypeName
  text: string
  x?: number
}

type LesteLine = LesteToken[]
type LesteLines = LesteLine[]

const LESTE_KIND = 'leste' as LushTokenKind
const INLINE_TAGS = new Set<string>(['b'])

// Check for a non-null object.
const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

// Normalize a Svelte AST node into the minimal astre shape.
function normalizeSvelteNode(node: unknown): AstreNode | null {
  if (!isObject(node)) return null
  const type = node.type
  if (typeof type !== 'string') return null
  if (type === 'Element') {
    const name = typeof node.name === 'string' ? node.name : undefined
    const children = Array.isArray(node.children)
      ? node.children.map(normalizeSvelteNode).filter(Boolean)
      : []
    return { type, name, children: children as AstreNode[] }
  }
  if (type === 'Text') {
    const data = typeof node.data === 'string' ? node.data : ''
    return { type, data }
  }
  if (type === 'Fragment') {
    const children = Array.isArray(node.children)
      ? node.children.map(normalizeSvelteNode).filter(Boolean)
      : []
    return { type, children: children as AstreNode[] }
  }
  return null
}

// Extract the HTML fragment from a Svelte parse result.
function getSvelteHtmlAstre(ast: unknown): AstreNode {
  if (!isObject(ast)) return { type: 'Fragment', children: [] }
  const html = (ast as Record<string, unknown>).html
  const normalized = normalizeSvelteNode(html)
  return normalized ?? { type: 'Fragment', children: [] }
}

// Normalize text to a single-space form for projection.
function normalizeText(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

// Build a Space token for Leste output.
function makeSpace(text: string): LesteToken {
  return { kind: LESTE_KIND, type: SPACE_TYPE, text }
}

// Build a NakedString token for Leste output.
function makeNaked(text: string): LesteToken {
  return { kind: LESTE_KIND, type: NAKED_STRING_TYPE, text }
}

// Build a tag token for Leste output.
function makeTag(text: string): LesteToken {
  return { kind: LESTE_KIND, type: 'tag' as TokenTypeName, text }
}

// Insert a token list into a line with a single space separator when needed.
function appendTokens(line: LesteLine, tokens: LesteLine): void {
  if (tokens.length === 0) return
  if (line.length === 0) {
    line.push(...tokens)
    return
  }
  const last = line[line.length - 1]
  const first = tokens[0]
  const needsSpace =
    last.type !== SPACE_TYPE &&
    first.type !== SPACE_TYPE &&
    !last.text.endsWith('\n') &&
    !first.text.startsWith('\n')
  if (needsSpace) line.push(makeSpace(' '))
  line.push(...tokens)
}

// Convert a text node into leste tokens.
function renderTextTokens(value: string): LesteLine {
  const normalized = normalizeText(value)
  if (!normalized) return []
  const parts = normalized.split(' ')
  const tokens: LesteLine = []
  parts.forEach((part, idx) => {
    if (idx > 0) tokens.push(makeSpace(' '))
    tokens.push(makeNaked(part))
  })
  return tokens
}

// Evaluate a rule match against a node and return captures.
function matchRule(rule: RuleprojRule, node: AstreNode): CaptureMap | null {
  const captures: CaptureMap = {}
  // Check a single match entry and collect captures.
  const matchValue = (value: unknown, expected: MatchValue | undefined): boolean => {
    if (!expected) return true
    if (expected.kind === 'literal') return value === expected.value
    captures[expected.name] = value
    return true
  }
  const match = rule.match
  if (!matchValue(node.type, match.type)) return null
  if (!matchValue(node.name, match.name)) return null
  if (!matchValue(node.data, match.data)) return null
  if (!matchValue(node.children, match.children)) return null
  if (match.where) {
    const arg = captures[match.where.arg]
    const name = typeof arg === 'string' ? arg : ''
    const isInline = INLINE_TAGS.has(name)
    const ok =
      match.where.kind === 'inlineTag' ? isInline : !isInline
    if (!ok) return null
  }
  return captures
}

// Render a single emit expression into tokens.
function renderEmitExpr(
  expr: EmitExpr,
  captures: CaptureMap,
  rules: RuleprojRule[]
): LesteLine {
  if (expr.kind === 'tag') {
    const name = String(captures[expr.arg] ?? '')
    return name ? [makeTag(name)] : []
  }
  if (expr.kind === 'text') {
    const value = String(captures[expr.arg] ?? '')
    return renderTextTokens(value)
  }
  const name = String(captures[expr.name] ?? '')
  const kids = (captures[expr.kids] ?? []) as AstreNode[]
  const tokens: LesteLine = []
  if (name) tokens.push(makeTag(name))
  const inlineKids = renderInlineKids(kids, rules)
  appendTokens(tokens, inlineKids)
  if (name) appendTokens(tokens, [makeTag(`/${name}`)])
  return tokens
}

// Render a list of child nodes into inline tokens.
function renderInlineKids(kids: AstreNode[], rules: RuleprojRule[]): LesteLine {
  const line: LesteLine = []
  kids.forEach((kid) => {
    const projected = renderNode(kid, rules)
    if (projected.length === 0) return
    appendTokens(line, projected[0])
  })
  return line
}

// Render child nodes into a sequence of lines.
function renderChildLines(kids: AstreNode[], rules: RuleprojRule[]): LesteLines {
  const lines: LesteLines = []
  kids.forEach((kid) => {
    const projected = renderNode(kid, rules)
    if (projected.length === 0) return
    lines.push(...projected)
  })
  return lines
}

// Render a node using the rule set into leste lines.
function renderNode(node: AstreNode, rules?: RuleprojRule[]): LesteLines {
  const ruleSet = rules ?? []
  for (const rule of ruleSet) {
    const captures = matchRule(rule, node)
    if (!captures) continue
    if (rule.emit.kind === 'line') {
      return [renderEmitExpr(rule.emit.line, captures, ruleSet)]
    }
    const header = renderEmitExpr(rule.emit.line, captures, ruleSet)
    const kids = (captures[rule.emit.each] ?? []) as AstreNode[]
    const body = renderInlineKids(kids, ruleSet)
    if (body.length === 0) return [header]
    return [header, [makeSpace('  '), ...body]]
  }
  if (Array.isArray(node.children)) {
    return renderChildLines(node.children, ruleSet)
  }
  return []
}

// Assign token indices sequentially across a Susy tree.
function assignTokenIdx(node: SusyNode, idxRef: { value: number }): void {
  node.tokenIdx = idxRef.value++
  if (node.kids) node.kids.forEach((kid) => assignTokenIdx(kid, idxRef))
}

// Build a Susy tree from leste lines, preserving explicit whitespace.
function buildSusyFromLines(lines: LesteLines): SusyNode {
  const tokens: LesteToken[] = []
  lines.forEach((line, idx) => {
    if (idx > 0) tokens.push(makeSpace('\n'))
    tokens.push(...line)
  })
  let offset = 0
  const kids: SusyNode[] = tokens.map((token) => {
    const node: SusyNode = {
      kind: token.kind,
      type: token.type,
      tokenIdx: 0,
      text: token.text,
      x: offset
    }
    offset += token.text.length
    return node
  })
  const rootText = tokens.map((token) => token.text).join('')
  const root: SusyNode = {
    kind: LESTE_KIND,
    type: 'Root' as TokenTypeName,
    tokenIdx: 0,
    text: rootText,
    x: 0,
    kids
  }
  assignTokenIdx(root, { value: 0 })
  return root
}

// Project Svelte source into a Leste Susy tree using ruleproj text.
export function susySvelteLesteProjection(source: string, ruleproj: string): SusyNode {
  const rules = parseRuleproj(ruleproj)
  const ast = parse(source, { filename: 'simple.svelte' })
  const html = getSvelteHtmlAstre(ast)
  const lines = renderNode(html, rules)
  return buildSusyFromLines(lines)
}
