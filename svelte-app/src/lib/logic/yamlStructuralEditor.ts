import {
  Scalar,
  isAlias,
  isMap,
  isNode,
  isPair,
  isScalar,
  isSeq,
  parseDocument,
  type Document,
  type Node as YamlNode,
  type Pair,
  type YAMLMap,
  type YAMLSeq
} from '@lush/yaml'

export type YamlSelection = { from: number; to: number }

export type YamlCommandId =
  | 'toggleInlineOrBlock'
  | 'addItem'
  | 'blockScalar'
  | 'nextField'
  | 'prevField'
  | 'deleteSelection'
  | 'enlargeSelection'
  | 'prevComment'
  | 'nextComment'

export type YamlCommandContext = {
  text: string
  selection: YamlSelection
}

export type YamlCommandResult = {
  changes?: { from: number; to: number; insert: string }
  selection: YamlSelection
}

// Apply a YAML structural command to the current document text.
export function applyYamlCommand(
  command: YamlCommandId,
  ctx: YamlCommandContext
): YamlCommandResult | null {
  switch (command) {
    case 'toggleInlineOrBlock':
      return toggleInlineOrBlock(ctx.text, ctx.selection)
    case 'addItem':
      return addItem(ctx.text, ctx.selection)
    case 'blockScalar':
      return blockScalar(ctx.text, ctx.selection)
    case 'nextField':
      return moveField(ctx.text, ctx.selection, 'next')
    case 'prevField':
      return moveField(ctx.text, ctx.selection, 'prev')
    case 'deleteSelection':
      return deleteSelection(ctx.text, ctx.selection)
    case 'enlargeSelection':
      return enlargeSelection(ctx.text, ctx.selection)
    case 'prevComment':
      return moveComment(ctx.text, ctx.selection, 'prev')
    case 'nextComment':
      return moveComment(ctx.text, ctx.selection, 'next')
  }
}

// Parse a YAML document while keeping source tokens.
function parseYaml(text: string): Document.Parsed | null {
  try {
    return parseDocument(text, { keepSourceTokens: true })
  } catch {
    return null
  }
}

// Clamp an offset to the document bounds.
function clampOffset(text: string, offset: number): number {
  return Math.max(0, Math.min(offset, text.length))
}

// Determine whether an offset lies within a node's range.
function containsOffset(node: YamlNode | null | undefined, offset: number): boolean {
  const r = node?.range
  if (!r) return false
  return offset >= r[0] && offset < r[2]
}

// Convert a node's range to a usable span.
function nodeRange(node: YamlNode): { from: number; to: number } | null {
  const r = node.range
  if (!r) return null
  return { from: r[0], to: r[2] }
}

// Find the first non-structural character offset within a span.
function firstNonStructuralOffset(
  text: string,
  span: { from: number; to: number }
): number {
  const structural = new Set([':', '-', '{', '}', '[', ']', ',', ' ', '\t', '\r', '\n'])
  const start = clampOffset(text, span.from)
  const end = clampOffset(text, span.to)
  for (let i = start; i < end; i += 1) {
    if (!structural.has(text[i])) return i
  }
  return start
}

// Convert a pair's key/value range into a combined span.
function pairRange(pair: Pair): { from: number; to: number } | null {
  const keyRange = pair.key && isNode(pair.key) ? nodeRange(pair.key) : null
  const valueRange = pair.value && isNode(pair.value) ? nodeRange(pair.value) : null
  if (!keyRange && !valueRange) return null
  const from = Math.min(keyRange?.from ?? Infinity, valueRange?.from ?? Infinity)
  const to = Math.max(keyRange?.to ?? -Infinity, valueRange?.to ?? -Infinity)
  return { from, to }
}

// Build the deepest node path containing an offset.
function findDeepestPathAtOffset(
  node: YamlNode,
  offset: number,
  path: YamlNode[] = []
): YamlNode[] {
  if (!containsOffset(node, offset)) return path
  const nextPath = [...path, node]

  if (isMap(node)) {
    for (const pair of (node as YAMLMap).items) {
      if (!isPair(pair)) continue
      const key = pair.key
      const value = pair.value
      if (isNode(key) && containsOffset(key, offset)) {
        return findDeepestPathAtOffset(key, offset, nextPath)
      }
      if (isNode(value) && containsOffset(value, offset)) {
        return findDeepestPathAtOffset(value, offset, nextPath)
      }
    }
  }

  if (isSeq(node)) {
    for (const item of (node as YAMLSeq).items) {
      if (isNode(item) && containsOffset(item, offset)) {
        return findDeepestPathAtOffset(item, offset, nextPath)
      }
    }
  }

  return nextPath
}

// Find the closest mapping or sequence node at the given offset.
function findCollectionAtOffset(
  root: YamlNode,
  offset: number
): YAMLMap | YAMLSeq | null {
  const path = findDeepestPathAtOffset(root, offset)
  for (let i = path.length - 1; i >= 0; i -= 1) {
    const node = path[i]
    if (isMap(node)) return node as YAMLMap
    if (isSeq(node)) return node as YAMLSeq
  }
  return null
}

// Compute the line bounds for an offset.
function lineAt(text: string, offset: number): { from: number; to: number; text: string } {
  const pos = clampOffset(text, offset)
  let from = pos
  while (from > 0 && text.charCodeAt(from - 1) !== 10) from -= 1
  let to = pos
  while (to < text.length && text.charCodeAt(to) !== 10) to += 1
  return { from, to, text: text.slice(from, to) }
}

// Read the leading indentation for a line.
function indentForLine(lineText: string): string {
  const match = /^(\s*)/.exec(lineText)
  return match ? match[1] : ''
}

// Pick a unique mapping key name for a YAML map.
function uniqueMapKey(map: YAMLMap): string {
  const keys = new Set<string>()
  for (const pair of map.items) {
    if (!isPair(pair)) continue
    const key = pair.key
    if (isScalar(key)) keys.add(String(key.value))
  }
  if (!keys.has('key')) return 'key'
  let idx = 1
  while (keys.has(`key${idx}`)) idx += 1
  return `key${idx}`
}

// Insert a new sequence item after the current one.
function addSeqItem(
  text: string,
  seq: YAMLSeq,
  offset: number
): YamlCommandResult | null {
  const currentItem = seq.items.find(item => isNode(item) && containsOffset(item, offset))
  if (!currentItem || !isNode(currentItem)) return null
  const range = nodeRange(currentItem)
  if (!range) return null

  const endLine = lineAt(text, range.to)
  const indent = indentForLine(endLine.text)
  const insert = `\n${indent}- null`
  const selectionOffset = endLine.to + insert.length
  return {
    changes: { from: endLine.to, to: endLine.to, insert },
    selection: { from: selectionOffset, to: selectionOffset }
  }
}

// Insert a new mapping item after the current one.
function addMapItem(
  text: string,
  map: YAMLMap,
  offset: number
): YamlCommandResult | null {
  const currentPair = map.items.find(pair => {
    if (!isPair(pair)) return false
    const range = pairRange(pair)
    return range ? offset >= range.from && offset < range.to : false
  })
  if (!currentPair || !isPair(currentPair)) return null
  const range = pairRange(currentPair)
  if (!range) return null

  const endLine = lineAt(text, range.to)
  const indent = indentForLine(endLine.text)
  const key = uniqueMapKey(map)
  const insert = `\n${indent}${key}: null`
  const selectionOffset = endLine.to + indent.length + key.length + 3
  return {
    changes: { from: endLine.to, to: endLine.to, insert },
    selection: { from: selectionOffset, to: selectionOffset }
  }
}

// Add a mapping or sequence item after the current item.
function addItem(text: string, selection: YamlSelection): YamlCommandResult | null {
  const doc = parseYaml(text)
  if (!doc || !doc.contents || !isNode(doc.contents)) return null
  const offset = clampOffset(text, selection.to)
  const collection = findCollectionAtOffset(doc.contents, offset)
  if (!collection) return null
  if (isSeq(collection)) return addSeqItem(text, collection, offset)
  if (isMap(collection)) return addMapItem(text, collection, offset)
  return null
}

// Toggle a collection between flow and block styles with a length guard.
function toggleInlineOrBlock(
  text: string,
  selection: YamlSelection
): YamlCommandResult | null {
  const doc = parseYaml(text)
  if (!doc || !doc.contents || !isNode(doc.contents)) return null
  const offset = clampOffset(text, selection.to)
  const collection = findCollectionAtOffset(doc.contents, offset)
  if (!collection) return null

  collection.flow = !collection.flow
  const nextText = doc.toString()
  const nextDoc = parseYaml(nextText)
  if (!nextDoc || !nextDoc.contents || !isNode(nextDoc.contents)) return null

  const nextOffset = clampOffset(nextText, offset)
  const nextCollection = findCollectionAtOffset(nextDoc.contents, nextOffset)
  const span = nextCollection ? nodeRange(nextCollection) : null
  if (span) {
    const line = lineAt(nextText, span.from)
    if (line.text.length > 80) return null
  }

  return {
    changes: { from: 0, to: text.length, insert: nextText },
    selection: { from: nextOffset, to: nextOffset }
  }
}

// Convert the current scalar to a block literal style.
function blockScalar(text: string, selection: YamlSelection): YamlCommandResult | null {
  const doc = parseYaml(text)
  if (!doc || !doc.contents || !isNode(doc.contents)) return null
  const offset = clampOffset(text, selection.to)
  const path = findDeepestPathAtOffset(doc.contents, offset)
  const scalar = [...path].reverse().find(node => isScalar(node)) as
    | Scalar
    | undefined
  if (!scalar) return null

  scalar.type = Scalar.BLOCK_LITERAL
  scalar.value = typeof scalar.value === 'string' ? scalar.value : String(scalar.value ?? '')
  const nextText = doc.toString()
  const nextOffset = clampOffset(nextText, offset)

  return {
    changes: { from: 0, to: text.length, insert: nextText },
    selection: { from: nextOffset, to: nextOffset }
  }
}

// Collect scalar and alias nodes in document order.
function collectEditableNodes(root: YamlNode): Array<{ node: YamlNode; span: { from: number; to: number } }> {
  const items: Array<{ node: YamlNode; span: { from: number; to: number } }> = []
  const visit = (node: YamlNode): void => {
    if (isScalar(node) || isAlias(node)) {
      const span = nodeRange(node)
      if (span) items.push({ node, span })
      return
    }
    if (isMap(node)) {
      for (const pair of (node as YAMLMap).items) {
        if (!isPair(pair)) continue
        if (pair.key && isNode(pair.key)) visit(pair.key)
        if (pair.value && isNode(pair.value)) visit(pair.value)
      }
      return
    }
    if (isSeq(node)) {
      for (const item of (node as YAMLSeq).items) {
        if (isNode(item)) visit(item)
      }
    }
  }
  visit(root)
  return items
}

// Move the selection to the next or previous editable field.
function moveField(
  text: string,
  selection: YamlSelection,
  direction: 'next' | 'prev'
): YamlCommandResult | null {
  const doc = parseYaml(text)
  if (!doc || !doc.contents || !isNode(doc.contents)) return null
  const offset = clampOffset(text, selection.to)
  const nodes = collectEditableNodes(doc.contents)
  if (nodes.length === 0) return null

  const idx = nodes.findIndex(item => offset >= item.span.from && offset < item.span.to)
  let targetIdx = idx
  if (direction === 'next') {
    if (idx === -1) {
      targetIdx = nodes.findIndex(item => item.span.from > offset)
      if (targetIdx === -1) targetIdx = 0
    } else {
      targetIdx = (idx + 1) % nodes.length
    }
  } else {
    if (idx === -1) {
      targetIdx = -1
      for (let i = nodes.length - 1; i >= 0; i -= 1) {
        if (nodes[i].span.to < offset) {
          targetIdx = i
          break
        }
      }
      if (targetIdx === -1) targetIdx = nodes.length - 1
    } else {
      targetIdx = (idx - 1 + nodes.length) % nodes.length
    }
  }

  const target = nodes[targetIdx]
  const selectionOffset = firstNonStructuralOffset(text, target.span)
  return { selection: { from: selectionOffset, to: selectionOffset } }
}

// Delete text or replace the current scalar with null.
function deleteSelection(text: string, selection: YamlSelection): YamlCommandResult | null {
  const from = clampOffset(text, selection.from)
  const to = clampOffset(text, selection.to)
  if (from !== to) {
    return {
      changes: { from, to, insert: '' },
      selection: { from, to: from }
    }
  }

  const doc = parseYaml(text)
  if (!doc || !doc.contents || !isNode(doc.contents)) return null
  const path = findDeepestPathAtOffset(doc.contents, from)
  const scalar = [...path].reverse().find(node => isScalar(node)) as
    | Scalar
    | undefined
  if (!scalar) return null
  const span = nodeRange(scalar)
  if (!span) return null
  return {
    changes: { from: span.from, to: span.to, insert: 'null' },
    selection: { from: span.from, to: span.from + 4 }
  }
}

// Expand the selection to the parent node's range.
function enlargeSelection(text: string, selection: YamlSelection): YamlCommandResult | null {
  const doc = parseYaml(text)
  if (!doc || !doc.contents || !isNode(doc.contents)) return null
  const offset = clampOffset(text, selection.to)
  const path = findDeepestPathAtOffset(doc.contents, offset)
  if (path.length === 0) return null
  const parent = path.length > 1 ? path[path.length - 2] : path[0]
  const span = nodeRange(parent)
  if (!span) return null
  return { selection: { from: span.from, to: span.to } }
}

// Move the cursor to the previous or next comment marker.
function moveComment(
  text: string,
  selection: YamlSelection,
  direction: 'prev' | 'next'
): YamlCommandResult | null {
  const offset = clampOffset(text, selection.to)
  const lines = text.split(/\r?\n/)
  let cursor = 0

  if (direction === 'prev') {
    for (let i = 0; i < lines.length; i += 1) {
      const line = lines[i]
      const lineEnd = cursor + line.length
      if (lineEnd >= offset) {
        for (let j = i; j >= 0; j -= 1) {
          const targetLine = lines[j]
          const hashIdx = targetLine.indexOf('#')
          if (hashIdx !== -1) {
            const targetOffset = sumLineOffsets(lines, j) + hashIdx
            return { selection: { from: targetOffset, to: targetOffset } }
          }
        }
        break
      }
      cursor += line.length + 1
    }
    return null
  }

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i]
    const lineStart = cursor
    const lineEnd = cursor + line.length
    const hashIdx = line.indexOf('#')
    if (hashIdx !== -1) {
      const targetOffset = lineStart + hashIdx
      if (targetOffset > offset) {
        return { selection: { from: targetOffset, to: targetOffset } }
      }
    }
    cursor += line.length + 1
    if (lineEnd >= offset && hashIdx !== -1 && lineStart + hashIdx > offset) break
  }

  return null
}

// Sum line offsets up to the given line index.
function sumLineOffsets(lines: string[], index: number): number {
  let offset = 0
  for (let i = 0; i < index; i += 1) offset += lines[i].length + 1
  return offset
}
