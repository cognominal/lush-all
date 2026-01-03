import { EditorSelection, type StateEffect } from '@codemirror/state'
import {
  Decoration,
  type DecorationSet,
  type EditorView,
  type Range,
  type WidgetType
} from '@codemirror/view'
import {
  createSampleJsTree,
  descendPath,
  findFirstTokPath,
  findNextTokPath,
  findPrevTokPath,
  getNodeByPath,
  isSusyTok,
  projectTree,
  serializePath,
  type HighlightRegistry,
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

export type KeyHandlerResult = {
  handled: boolean
  state: StructuralEditorState
  tokPaths: number[][]
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

// Fetch a span for a path from the current editor state.
export function getSpan(
  state: StructuralEditorState,
  path: number[]
): Span | undefined {
  return state.spansByPath.get(serializePath(path))
}

// Build a selection that matches the current editor mode.
export function buildSelection(state: StructuralEditorState): EditorSelection {
  if (state.mode === 'insert') {
    const span = getSpan(state, state.currentTokPath)
    const range = getTextRange(span)
    const caret = clamp(range.from + state.cursorOffset, range.from, range.to)
    return EditorSelection.single(caret)
  }

  const span = getSpan(state, state.currentPath)
  if (!span) return EditorSelection.single(0)
  const caret = span.textFrom ?? span.from
  return EditorSelection.single(caret)
}

// Build CodeMirror decorations for syntax and focus styling.
export function buildDecorations(
  state: StructuralEditorState,
  highlightRegistry: HighlightRegistry,
  focusWidget: WidgetType
): DecorationSet {
  const decorations: Array<Range<Decoration>> = []

  // Walk the tree and collect decoration ranges.
  const visit = (token: SusyNode, path: number[]) => {
    const span = getSpan(state, path)
    if (span) {
      const className = highlightRegistry.classFor(token.kind, token.type)
      if (className && span.from < span.to) {
        decorations.push(Decoration.mark({ class: className }).range(span.from, span.to))
      }
    }
    token.kids?.forEach((child: SusyNode, idx: number) =>
      visit(child, [...path, idx])
    )
  }

  visit(state.root, [])

  if (state.mode === 'normal') {
    const focusSpan = getSpan(state, state.currentPath)
    if (focusSpan) {
      if (focusSpan.from === focusSpan.to) {
        decorations.push(
          Decoration.widget({ widget: focusWidget, side: 1 }).range(focusSpan.from)
        )
      } else {
        decorations.push(
          Decoration.mark({ class: 'cm-structural-focus' }).range(
            focusSpan.from,
            focusSpan.to
          )
        )
      }
    }
  }

  return Decoration.set(decorations, true)
}

// Sync CodeMirror view state with the structural editor state.
export function syncView(
  view: EditorView | null,
  state: StructuralEditorState,
  setDecorations: StateEffect<DecorationSet>,
  highlightRegistry: HighlightRegistry,
  focusWidget: WidgetType
): void {
  if (!view) return
  const currentDoc = view.state.doc.toString()
  const effects = [setDecorations.of(buildDecorations(state, highlightRegistry, focusWidget))]
  const selection = buildSelection(state)
  const changes =
    currentDoc === state.projectionText
      ? undefined
      : { from: 0, to: view.state.doc.length, insert: state.projectionText }

  view.dispatch({ changes, selection, effects })
}

// Apply a new editor state and sync the CodeMirror view.
export function setStateAndSync(
  next: StructuralEditorState,
  view: EditorView | null,
  setDecorations: StateEffect<DecorationSet>,
  highlightRegistry: HighlightRegistry,
  focusWidget: WidgetType
): StructuralEditorState {
  syncView(view, next, setDecorations, highlightRegistry, focusWidget)
  return next
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

// Enter insert mode at the resolved target path.
export function enterInsertMode(state: StructuralEditorState): StructuralEditorState {
  const target = resolveInsertTarget(state.root, state.currentPath)
  return {
    ...state,
    mode: 'insert',
    currentPath: target.path,
    currentTokPath: target.path,
    cursorOffset: target.text.length
  }
}

// Enter normal mode and align focus to the current token.
export function enterNormalMode(state: StructuralEditorState): StructuralEditorState {
  return {
    ...state,
    mode: 'normal',
    currentPath: state.currentTokPath
  }
}

// Focus a new input path in both current path fields.
export function focusInputPath(
  state: StructuralEditorState,
  path: number[]
): StructuralEditorState {
  return {
    ...state,
    currentPath: path,
    currentTokPath: path
  }
}

// Move focus down to the first child when available.
export function descend(state: StructuralEditorState): StructuralEditorState {
  const nextPath = descendPath(state.root, state.currentPath)
  if (serializePath(nextPath) === serializePath(state.currentPath)) return state
  return {
    ...state,
    currentPath: nextPath
  }
}

// Move focus to the next token path if available.
export function moveToNextInput(
  state: StructuralEditorState,
  tokPaths: number[][]
): StructuralEditorState {
  const nextPath = findNextTokPath(tokPaths, state.currentTokPath)
  if (!nextPath) return state
  return focusInputPath(state, nextPath)
}

// Move focus to the previous token path if available.
export function moveToPrevInput(
  state: StructuralEditorState,
  tokPaths: number[][]
): StructuralEditorState {
  const prevPath = findPrevTokPath(tokPaths, state.currentTokPath)
  if (!prevPath) return state
  return focusInputPath(state, prevPath)
}

// Insert a character into the current token and rebuild projection.
export function insertChar(
  state: StructuralEditorState,
  tokPaths: number[][],
  char: string
): { state: StructuralEditorState; tokPaths: number[][] } {
  const path = state.currentTokPath
  const token = getNodeByPath(state.root, path)
  if (!token) return { state, tokPaths }
  const text = token.text ?? ''
  const offset = clamp(state.cursorOffset, 0, text.length)
  const nextText = text.slice(0, offset) + char + text.slice(offset)
  const nextRoot = updateTokenText(state.root, path, nextText)
  const baseState: StructuralEditorState = {
    ...state,
    mode: 'insert',
    currentPath: path,
    currentTokPath: path,
    cursorOffset: offset + char.length
  }
  const rebuilt = rebuildProjection(nextRoot, baseState)
  return { state: rebuilt.state, tokPaths: rebuilt.tokPaths }
}

// Decide whether a key event should insert a character.
export function isPrintable(event: KeyboardEvent): boolean {
  if (event.ctrlKey || event.metaKey || event.altKey) return false
  if (event.key.length !== 1) return false
  return true
}

// Handle key events and return updated state plus whether it was handled.
export function handleKey(
  event: KeyboardEvent,
  state: StructuralEditorState,
  tokPaths: number[][]
): KeyHandlerResult {
  if (state.mode === 'normal') {
    if (event.key === 'i' && !event.shiftKey) {
      return { handled: true, state: enterInsertMode(state), tokPaths }
    }
    if (event.key === 'Enter' && event.shiftKey) {
      return { handled: true, state: descend(state), tokPaths }
    }
    if (event.key === 'Enter') {
      return { handled: true, state: descend(state), tokPaths }
    }
    if (event.key === 'Tab') {
      const nextState = event.shiftKey
        ? moveToPrevInput(state, tokPaths)
        : moveToNextInput(state, tokPaths)
      return { handled: true, state: nextState, tokPaths }
    }
    if (event.key === 'Escape') return { handled: true, state, tokPaths }
    return { handled: true, state, tokPaths }
  }

  if (state.mode === 'insert') {
    if (event.key === 'Escape') {
      return { handled: true, state: enterNormalMode(state), tokPaths }
    }
    if (event.key === 'Enter') return { handled: true, state, tokPaths }
    if (isPrintable(event)) {
      const updated = insertChar(state, tokPaths, event.key)
      return { handled: true, state: updated.state, tokPaths: updated.tokPaths }
    }
    return { handled: true, state, tokPaths }
  }

  return { handled: false, state, tokPaths }
}
