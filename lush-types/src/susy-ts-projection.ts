import { Parser } from 'acorn'
import { Parser } from 'acorn'
import { tsPlugin } from '@sveltejs/acorn-typescript'
import type { LushTokenKind, SusyNode, TokenTypeName } from 'lush-types'

type AstNode = {
  type: string
  start?: number
  end?: number
  [key: string]: unknown
}

type BuiltNode = {
  susy: SusyNode
  start: number
  end: number
}

const TS_KIND: LushTokenKind = 'js'

// Check for a non-null object.
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

// Narrow unknown to a TS AST node with spans.
const isAstNode = (value: unknown): value is AstNode => {
  if (!isRecord(value)) return false
  const type = value.type
  const start = value.start
  const end = value.end
  return typeof type === 'string' && typeof start === 'number' && typeof end === 'number'
}

// Normalize an AST node span to concrete offsets.
const getSpan = (node: AstNode): { start: number; end: number } => {
  const start = typeof node.start === 'number' ? node.start : 0
  const end = typeof node.end === 'number' ? node.end : start
  return { start, end }
}

// Collect child AST nodes with their parent key names.
const collectChildren = (node: AstNode): { child: AstNode; nameAsSon: string }[] => {
  const children: { child: AstNode; nameAsSon: string }[] = []
  for (const [key, value] of Object.entries(node)) {
    if (Array.isArray(value)) {
      for (const entry of value) {
        if (isAstNode(entry)) children.push({ child: entry, nameAsSon: key })
      }
      continue
    }
    if (isAstNode(value)) {
      children.push({ child: value, nameAsSon: key })
    }
  }
  return children
}

// Create a Susy space node spanning a gap.
const makeSpaceNode = (source: string, start: number, end: number): BuiltNode => {
  const text = source.slice(start, end)
  return {
    susy: {
      kind: TS_KIND,
      type: 'Space' as TokenTypeName,
      tokenIdx: 0,
      text,
      x: start
    },
    start,
    end
  }
}

// Convert a TS AST node into a Susy subtree.
const buildSusy = (node: AstNode, source: string, nameAsSon?: string): BuiltNode => {
  const { start, end } = getSpan(node)
  const children = collectChildren(node).map((entry) =>
    buildSusy(entry.child, source, entry.nameAsSon)
  )

  children.sort((a, b) => a.start - b.start || a.end - b.end)

  const kids: SusyNode[] = []
  let prevEnd: number | undefined
  for (const current of children) {
    if (typeof prevEnd === 'number' && current.start > prevEnd) {
      const space = makeSpaceNode(source, prevEnd, current.start)
      kids.push(space.susy)
    }
    kids.push(current.susy)
    prevEnd = current.end
  }

  const susy: SusyNode = {
    kind: TS_KIND,
    type: (node.type ?? 'Program') as TokenTypeName,
    tokenIdx: 0
  }

  if (typeof nameAsSon === 'string') susy.nameAsSon = nameAsSon
  if (kids.length > 0) susy.kids = kids
  if (!susy.kids) susy.text = source.slice(start, end)
  if (typeof start === 'number') susy.x = start

  return { susy, start, end }
}

// Assign sequential token indices across a Susy tree.
const assignTokenIdx = (node: SusyNode, tokenIdxRef: { value: number }) => {
  node.tokenIdx = tokenIdxRef.value++
  if (Array.isArray(node.kids)) {
    for (const kid of node.kids) assignTokenIdx(kid, tokenIdxRef)
  }
}

// Build a TS-enabled Acorn parser.
const TypeScriptParser = Parser.extend(tsPlugin({ jsx: false }))

// Project TS source into a SusyNode tree.
export const susyTsProjection = (source: string, filename = 'source.ts'): SusyNode => {
  const ast = TypeScriptParser.parse(source, {
    ecmaVersion: 'latest',
    sourceType: 'module',
    locations: true,
    sourceFile: filename
  }) as AstNode
  const root = buildSusy(ast, source).susy
  assignTokenIdx(root, { value: 0 })
  return root
}
