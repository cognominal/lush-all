import {
  createSampleJsTree,
  findFirstTokPath,
  getNodeByPath,
  isSusyTok,
  projectTree,
  serializePath,
  type SusyNode,
  type StructuralEditorState,
  type Span
} from '@lush/structural'

type ProjectionSnapshot = {
  state: StructuralEditorState
  tokPaths: number[][]
}

export type BreadcrumbItem = {
  type: string
  range: { from: number; to: number } | null
}

// Build the initial structural editor state from a sample JS tree.
export function createInitialState(): ProjectionSnapshot {
  const root = createSampleJsTree()
  const projection = projectTree(root)
  const tokPaths = projection.tokPaths

  return {
    state: {
      mode: 'normal',
      root,
      currentPath: [],
      currentTokPath: tokPaths[0] ?? [],
      cursorOffset: 0,
      projectionText: projection.text,
      spansByPath: projection.spansByPath
    },
    tokPaths
  }
}

// Recompute projection text and spans after a tree update.
export function rebuildProjection(
  nextRoot: SusyNode,
  base: StructuralEditorState
): ProjectionSnapshot {
  const projection = projectTree(nextRoot)
  return {
    state: {
      ...base,
      root: nextRoot,
      projectionText: projection.text,
      spansByPath: projection.spansByPath
    },
    tokPaths: projection.tokPaths
  }
}

// Convert a path into breadcrumb items with highlight ranges.
export function buildBreadcrumbs(
  state: StructuralEditorState,
  path: number[]
): BreadcrumbItem[] {
  const items: BreadcrumbItem[] = []
  let current: SusyNode | undefined = state.root
  const rootSpan = state.spansByPath.get(serializePath([]))
  items.push({
    type: `${current.kind}.${current.type}`,
    range: rootSpan ? { from: rootSpan.from, to: rootSpan.to } : null
  })
  for (const idx of path) {
    current = current?.kids?.[idx]
    if (!current) break
    const currentPath = items.length === 1 ? [idx] : [...path.slice(0, items.length)]
    const span = state.spansByPath.get(serializePath(currentPath))
    items.push({
      type: `${current.kind}.${current.type}`,
      range: span ? { from: span.from, to: span.to } : null
    })
  }
  return items
}

// Normalize a span into text bounds for caret placement.
export function getTextRange(span: Span | undefined): { from: number; to: number } {
  if (!span) return { from: 0, to: 0 }
  return {
    from: span.textFrom ?? span.from,
    to: span.textTo ?? span.to
  }
}

// Clamp a cursor position to the inclusive range.
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(value, max))
}

// Parse a JSON-encoded path key from the spans map.
export function parsePathKey(key: string): number[] | null {
  try {
    const parsed: unknown = JSON.parse(key)
    if (!Array.isArray(parsed)) return null
    if (!parsed.every((entry) => typeof entry === 'number')) return null
    return parsed
  } catch {
    return null
  }
}

// Locate the most specific tree path that contains a screen position.
export function findPathAtPos(
  state: StructuralEditorState,
  pos: number
): number[] | null {
  let bestPath: number[] | null = null
  let bestSpan: Span | null = null
  let bestIsInput = false

  for (const [key, span] of state.spansByPath.entries()) {
    if (pos < span.from || pos > span.to) continue
    const path = parsePathKey(key)
    if (!path) continue
    const token = getNodeByPath(state.root, path)
    if (!token) continue

    const spanSize = span.to - span.from
    const bestSize = bestSpan ? bestSpan.to - bestSpan.from : Number.POSITIVE_INFINITY
    const isInput = isSusyTok(token)

    if (spanSize < bestSize || (spanSize === bestSize && isInput && !bestIsInput)) {
      bestPath = path
      bestSpan = span
      bestIsInput = isInput
    }
  }

  return bestPath
}

// Update the text payload at a path, returning a new Susy tree.
export function updateTokenText(
  root: SusyNode,
  path: number[],
  nextText: string
): SusyNode {
  if (path.length === 0) {
    return { ...root, text: nextText }
  }
  const [idx, ...rest] = path
  const children = root.kids ?? []
  const nextChildren = children.map((child: SusyNode, childIdx: number) => {
    if (childIdx !== idx) return child
    return updateTokenText(child, rest, nextText)
  })
  return { ...root, kids: nextChildren }
}

// Resolve the current token text from a path for insert-mode editing.
export function resolveInsertTarget(
  root: SusyNode,
  path: number[]
): { path: number[]; text: string } {
  const currentToken = getNodeByPath(root, path)
  const targetPath =
    currentToken && isSusyTok(currentToken)
      ? path
      : findFirstTokPath(root, path)
  const token = getNodeByPath(root, targetPath)
  return { path: targetPath, text: token?.text ?? '' }
}
