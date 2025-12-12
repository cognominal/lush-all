import type { TokenMultiLine } from 'lush-types'
import {
  Document,
  isMap,
  isNode,
  isSeq,
  lushify,
  parseDocument,
  type Node as YamlNode
} from '@lush/yaml'

export type BreadcrumbItem = { type: string; range: { from: number; to: number } | null }

export type YamlAnalysis = {
  yamlText: string
  lush: TokenMultiLine | undefined
  doc: Document.Parsed | null
  errors: string[]
}

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

  return { yamlText, lush, doc, errors }
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
