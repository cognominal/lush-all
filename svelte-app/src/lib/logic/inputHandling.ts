import { isNode, isSeq, parseDocument, type Node as YamlNode } from '@lush/yaml'

export type EditResult =
  | {
      changes: { from: number; to: number; insert: string }
      selectionOffset: number
    }
  | null

function containsOffset(node: YamlNode | null | undefined, offset: number): boolean {
  const r = node?.range
  if (!r) return false
  return offset >= r[0] && offset < r[2]
}

function findDeepestPathAtOffset(
  node: YamlNode,
  offset: number,
  path: YamlNode[] = []
): YamlNode[] {
  if (!containsOffset(node, offset)) return path
  const nextPath = [...path, node]

  if (isSeq(node)) {
    for (const item of node.items as any[]) {
      if (isNode(item) && containsOffset(item, offset)) {
        return findDeepestPathAtOffset(item, offset, nextPath)
      }
    }
  }

  const maybeMapItems = (node as any)?.items
  if (Array.isArray(maybeMapItems)) {
    for (const pair of maybeMapItems) {
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

  return nextPath
}

function lineAt(text: string, offset: number): { from: number; to: number; text: string } {
  const pos = Math.max(0, Math.min(offset, text.length))
  let from = pos
  while (from > 0 && text.charCodeAt(from - 1) !== 10) from -= 1
  let to = pos
  while (to < text.length && text.charCodeAt(to) !== 10) to += 1
  return { from, to, text: text.slice(from, to) }
}

function indentForSeqItemLine(lineText: string): string | null {
  const m = /^(\s*)-/.exec(lineText)
  return m ? m[1] : null
}

function addEmptyBlockSeqItem(yamlText: string, seq: any, offset: number): EditResult {
  const items: any[] = Array.isArray(seq?.items) ? seq.items : []
  const currentItem = items.find(it => isNode(it) && containsOffset(it, offset))
  if (!currentItem) return null

  const startLine = lineAt(yamlText, currentItem.range?.[0] ?? offset)
  const indent = indentForSeqItemLine(startLine.text)
  if (indent == null) return null

  const endLine = lineAt(yamlText, currentItem.range?.[2] ?? offset)
  const insert = `\n${indent}- `
  const selectionOffset = endLine.to + insert.length

  return {
    changes: { from: endLine.to, to: endLine.to, insert },
    selectionOffset
  }
}

export function add_sequence_or_map(yamlText: string, cursorOffset: number): EditResult {
  const doc = parseDocument(yamlText, { keepSourceTokens: true })
  const root = doc?.contents
  if (!root || !isNode(root)) return null

  const path = findDeepestPathAtOffset(root, cursorOffset)
  for (let i = path.length - 1; i >= 0; i--) {
    const node = path[i]
    if (isSeq(node) && (node as any)?.srcToken?.type === 'block-seq') {
      return addEmptyBlockSeqItem(yamlText, node, cursorOffset)
    }
    if ((node as any)?.srcToken?.type === 'block-map') {
      return null
    }
  }

  return null
}

