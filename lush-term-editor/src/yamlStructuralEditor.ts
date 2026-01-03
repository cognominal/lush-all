import { lushify, parse } from 'yaml'
import { inspect } from 'node:util'
import {
  susyText,
  stringToSusyLines,
  type SusyNode,
  type SusyLine,
  type SusyLines,
  type TokenTypeName,
  type LushTokenKind
} from 'lush-types'

export type Multiline = SusyLine
export type MultiLines = Multiline[]

const SAMPLE_YAML = `- toto
- a: b
  c: d
`

const SEQ_ITEM_TYPE: TokenTypeName = 'seq-item-ind'
const SPACE_TYPE: TokenTypeName = 'space'
const YAML_KIND: LushTokenKind = 'YAML'

function cloneToken(token: SusyNode): SusyNode {
  const clone: SusyNode = { ...token, kind: token.kind ?? YAML_KIND }
  if (token.kids?.length) {
    clone.kids = token.kids.map(cloneToken)
  } else {
    delete clone.kids
  }
  return clone
}

function cloneLine(line: Multiline): Multiline {
  return line.map(cloneToken)
}

// Join a line of tokens into its text.
export function lineToText(line: Multiline): string {
  return line.map(susyText).join('')
}

function indentForLine(line: Multiline): string {
  const text = lineToText(line)
  const match = /^(\s*)-/.exec(text)
  return match ? match[1] : ''
}

function makeToken(type: TokenTypeName, text: string, tokenIdx: number, x: number): SusyNode {
  return { kind: YAML_KIND, type, text, tokenIdx, x }
}

function buildEmptyArrayItem(indent: string): Multiline {
  const tokens: SusyNode[] = []
  let cursor = 0

  if (indent.length) {
    tokens.push(makeToken(SPACE_TYPE, indent, tokens.length, cursor))
    cursor += indent.length
  }

  tokens.push(makeToken(SEQ_ITEM_TYPE, '-', tokens.length, cursor))
  cursor += 1

  tokens.push(makeToken(SPACE_TYPE, ' ', tokens.length, cursor))

  return tokens
}

function normalizeLinePositions(line: Multiline): void {
  let cursor = 0
  for (let i = 0; i < line.length; i++) {
    const token = line[i]
    if (!token) continue
    token.tokenIdx = i
    token.x = cursor
    cursor += susyText(token).length
  }
}

function buildSampleMultiLines(yamlText = SAMPLE_YAML): MultiLines {
  const parsed = (lushify(yamlText) as SusyLines | undefined) ?? []
  if (parsed.length) {
    return parsed.map(cloneLine)
  }
  const fallback = stringToSusyLines(yamlText)
  fallback.forEach(normalizeLinePositions)
  return fallback
}

export const sampleMultiLines: MultiLines = buildSampleMultiLines()

// Insert an empty array item after a given line index.
export function insertEmptyArrayItem(lines: MultiLines, lineIndex: number): MultiLines {
  if (lineIndex < 0 || lineIndex >= lines.length) return lines
  const next = lines.map(cloneLine)
  const indent = indentForLine(next[lineIndex])
  const newLine = buildEmptyArrayItem(indent)
  normalizeLinePositions(newLine)
  next.splice(lineIndex + 1, 0, newLine)
  return next
}

export interface Cursor {
  lineIdx: number
  colIdx: number
}

export interface EditorState {
  lines: MultiLines
  jsView: MultiLines
  cursor: Cursor
}

function linesToYaml(lines: MultiLines): string {
  return lines.map(lineToText).join('\n')
}

function buildJsViewMultiline(yamlText: string): MultiLines {
  try {
    const jsVal = parse(yamlText)
    const inspected = inspect(jsVal, {
      depth: Infinity,
      colors: false,
      compact: false
    })
    return stringToSusyLines(inspected)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'parse error'
    return stringToSusyLines(`! invalid YAML: ${msg}`)
  }
}

function cloneLines(lines: MultiLines): MultiLines {
  return lines.map(cloneLine)
}

// Build initial editor state from YAML text.
export function createInitialState(yamlText = SAMPLE_YAML): EditorState {
  const initialLines = buildSampleMultiLines(yamlText)
  const jsView = buildJsViewMultiline(linesToYaml(initialLines))
  return {
    lines: cloneLines(initialLines),
    jsView,
    cursor: { lineIdx: 0, colIdx: 0 }
  }
}

function lineHasSeqItem(line: Multiline): boolean {
  return line.some(token => token?.type === SEQ_ITEM_TYPE)
}

// Handle return by inserting a new sequence item line.
export function handleReturn(state: EditorState): EditorState {
  const { lineIdx } = state.cursor
  if (lineIdx < 0 || lineIdx >= state.lines.length) return state
  if (!lineHasSeqItem(state.lines[lineIdx])) return state

  const nextLines = insertEmptyArrayItem(state.lines, lineIdx)
  const newCursor: Cursor = {
    lineIdx: lineIdx + 1,
    colIdx: lineToText(nextLines[lineIdx + 1]).length
  }
  const jsView = buildJsViewMultiline(linesToYaml(nextLines))
  return {
    lines: nextLines,
    jsView,
    cursor: newCursor
  }
}

// Render the editor state into a debug string view.
export function renderState(state: EditorState): string {
  const renderedLines = state.lines.map((line, idx) => {
    const text = lineToText(line)
    const cursorMarker =
      idx === state.cursor.lineIdx
        ? `${' '.repeat(Math.max(0, state.cursor.colIdx))}^`
        : ''
    return cursorMarker ? `${text}\n${cursorMarker}` : text
  })
  const renderedJsView = state.jsView.map(lineToText)
  return [
    'YAML:',
    ...renderedLines,
    '',
    'JS view:',
    ...renderedJsView
  ].join('\n')
}
