import ts from 'typescript'
import type { SusyNode } from './index'
import { NAKED_STRING_TYPE, SPACE_TYPE } from './token-lists'
import type { TokenTypeName } from './token-registry'

type ProjectionOffsets = {
  at: (sourcePos: number) => number
}

// Return the span start used for projection, including leading trivia.
function projectionStart(node: ts.Node, sourceFile: ts.SourceFile): number {
  return node === sourceFile ? sourceFile.getFullStart() : node.getFullStart()
}

// Return whether a character is horizontal whitespace.
function isLineWhitespace(char: string): boolean {
  return char === ' ' || char === '\t' || char === '\r' || char === '\f' || char === '\v'
}

// Return a token type for a plain text fragment fallback.
function tokenTypeForText(text: string): TokenTypeName {
  if (text.length > 0 && [...text].every((char) => isLineWhitespace(char))) {
    return SPACE_TYPE
  }
  return NAKED_STRING_TYPE
}

// Return whether a syntax kind is classified as an operator token.
function isOperatorKind(kind: ts.SyntaxKind): boolean {
  return (
    (kind >= ts.SyntaxKind.FirstAssignment && kind <= ts.SyntaxKind.LastAssignment) ||
    (kind >= ts.SyntaxKind.FirstBinaryOperator && kind <= ts.SyntaxKind.LastBinaryOperator) ||
    kind === ts.SyntaxKind.ExclamationToken ||
    kind === ts.SyntaxKind.TildeToken ||
    kind === ts.SyntaxKind.QuestionQuestionToken
  )
}

// Map a TypeScript token kind to a Susy token type for posh highlighting.
function tokenTypeForSyntaxKind(kind: ts.SyntaxKind, text: string): TokenTypeName {
  if (kind === ts.SyntaxKind.WhitespaceTrivia || kind === ts.SyntaxKind.NewLineTrivia) {
    return SPACE_TYPE
  }
  if (kind === ts.SyntaxKind.SingleLineCommentTrivia || kind === ts.SyntaxKind.MultiLineCommentTrivia) {
    return 'Comment' as unknown as TokenTypeName
  }
  if (kind >= ts.SyntaxKind.FirstKeyword && kind <= ts.SyntaxKind.LastKeyword) {
    return 'keyword' as unknown as TokenTypeName
  }
  if (
    kind === ts.SyntaxKind.NumericLiteral ||
    kind === ts.SyntaxKind.BigIntLiteral
  ) {
    return 'number' as unknown as TokenTypeName
  }
  if (kind === ts.SyntaxKind.Identifier) {
    return 'variable' as unknown as TokenTypeName
  }
  if (kind >= ts.SyntaxKind.FirstPunctuation && kind <= ts.SyntaxKind.LastPunctuation) {
    return 'punctuation' as unknown as TokenTypeName
  }
  if (isOperatorKind(kind)) {
    return 'operator' as unknown as TokenTypeName
  }
  return tokenTypeForText(text)
}

// Collect source positions for TypeScript comment delimiters.
function collectCommentDelimiterPositions(source: string): Set<number> {
  const removePositions = new Set<number>()
  const scanner = ts.createScanner(ts.ScriptTarget.Latest, false, ts.LanguageVariant.Standard, source)
  for (let kind = scanner.scan(); kind !== ts.SyntaxKind.EndOfFileToken; kind = scanner.scan()) {
    const tokenStart = scanner.getTokenPos()
    const tokenEnd = scanner.getTextPos()
    if (kind === ts.SyntaxKind.SingleLineCommentTrivia) {
      if (tokenStart + 1 < tokenEnd) {
        removePositions.add(tokenStart)
        removePositions.add(tokenStart + 1)
      }
      continue
    }
    if (kind === ts.SyntaxKind.MultiLineCommentTrivia) {
      if (tokenStart + 3 < tokenEnd) {
        removePositions.add(tokenStart)
        removePositions.add(tokenStart + 1)
        removePositions.add(tokenEnd - 2)
        removePositions.add(tokenEnd - 1)
      }
    }
  }
  return removePositions
}

// Add opening and closing brace positions for a block-like AST node.
function addBlockBracePositions(
  source: string,
  openPos: number,
  closePos: number,
  removePositions: Set<number>
): void {
  if (openPos >= 0 && openPos < source.length && source[openPos] === '{') {
    removePositions.add(openPos)
  }
  if (closePos >= 0 && closePos < source.length && source[closePos] === '}') {
    removePositions.add(closePos)
  }
}

// Collect source positions of braces that belong to statement-like blocks.
function collectBlockBracePositions(sourceFile: ts.SourceFile, source: string): Set<number> {
  const removePositions = new Set<number>()

  // Visit descendants and collect brace offsets for block forms.
  const visit = (node: ts.Node): void => {
    if (ts.isBlock(node) || ts.isModuleBlock(node) || ts.isCaseBlock(node)) {
      const openPos = node.getStart(sourceFile)
      const closePos = node.getEnd() - 1
      addBlockBracePositions(source, openPos, closePos, removePositions)
    }
    ts.forEachChild(node, visit)
  }

  visit(sourceFile)
  return removePositions
}

// Find the first balanced parenthesis pair in a source subrange.
function findFirstBalancedParens(
  source: string,
  start: number,
  end: number
): { open: number; close: number } | null {
  if (start < 0 || end <= start || start >= source.length) return null
  const sliceEnd = Math.min(end, source.length)
  const slice = source.slice(start, sliceEnd)
  const scanner = ts.createScanner(ts.ScriptTarget.Latest, false, ts.LanguageVariant.Standard, slice)

  let depth = 0
  let openPos: number | null = null
  for (let token = scanner.scan(); token !== ts.SyntaxKind.EndOfFileToken; token = scanner.scan()) {
    const tokenPos = start + scanner.getTokenPos()
    if (token === ts.SyntaxKind.OpenParenToken) {
      if (openPos === null) openPos = tokenPos
      depth += 1
      continue
    }
    if (token === ts.SyntaxKind.CloseParenToken && openPos !== null) {
      depth -= 1
      if (depth === 0) {
        return { open: openPos, close: tokenPos }
      }
    }
  }
  return null
}

// Add the outer predicate parentheses for a statement header range.
function addPredicateParensInRange(
  source: string,
  rangeStart: number,
  rangeEnd: number,
  removePositions: Set<number>
): void {
  const pair = findFirstBalancedParens(source, rangeStart, rangeEnd)
  if (!pair) return
  removePositions.add(pair.open)
  removePositions.add(pair.close)
}

// Collect source positions of outer statement predicate parentheses.
function collectPredicateParenPositions(
  sourceFile: ts.SourceFile,
  source: string
): Set<number> {
  const removePositions = new Set<number>()

  // Visit descendants and collect statement predicate paren offsets.
  const visit = (node: ts.Node): void => {
    if (ts.isIfStatement(node)) {
      addPredicateParensInRange(
        source,
        node.getStart(sourceFile),
        node.thenStatement.getStart(sourceFile),
        removePositions
      )
    } else if (ts.isWhileStatement(node)) {
      addPredicateParensInRange(
        source,
        node.getStart(sourceFile),
        node.statement.getStart(sourceFile),
        removePositions
      )
    } else if (ts.isDoStatement(node)) {
      addPredicateParensInRange(
        source,
        node.statement.getEnd(),
        node.getEnd(),
        removePositions
      )
    } else if (ts.isForStatement(node) || ts.isForInStatement(node) || ts.isForOfStatement(node)) {
      addPredicateParensInRange(
        source,
        node.getStart(sourceFile),
        node.statement.getStart(sourceFile),
        removePositions
      )
    } else if (ts.isSwitchStatement(node)) {
      addPredicateParensInRange(
        source,
        node.getStart(sourceFile),
        node.caseBlock.getStart(sourceFile),
        removePositions
      )
    } else if (ts.isWithStatement(node)) {
      addPredicateParensInRange(
        source,
        node.getStart(sourceFile),
        node.statement.getStart(sourceFile),
        removePositions
      )
    }
    ts.forEachChild(node, visit)
  }

  visit(sourceFile)
  return removePositions
}

// Collect quote positions around string-like literals for naked-string projection.
function collectStringQuotePositions(sourceFile: ts.SourceFile, source: string): Set<number> {
  const removePositions = new Set<number>()

  // Visit descendants and collect delimiter offsets for literal wrappers.
  const visit = (node: ts.Node): void => {
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
      const start = node.getStart(sourceFile)
      const end = node.getEnd() - 1
      if (start >= 0 && start < source.length) {
        const startChar = source[start]
        if (startChar === '"' || startChar === '\'' || startChar === '`') {
          removePositions.add(start)
        }
      }
      if (end >= 0 && end < source.length && end > start) {
        const endChar = source[end]
        if (endChar === '"' || endChar === '\'' || endChar === '`') {
          removePositions.add(end)
        }
      }
    }
    ts.forEachChild(node, visit)
  }

  visit(sourceFile)
  return removePositions
}

// Collect all source positions hidden in the TS posh projection.
function collectHiddenPositions(sourceFile: ts.SourceFile, source: string): Set<number> {
  const blockPositions = collectBlockBracePositions(sourceFile, source)
  const predicatePositions = collectPredicateParenPositions(sourceFile, source)
  const quotePositions = collectStringQuotePositions(sourceFile, source)
  const commentDelimiterPositions = collectCommentDelimiterPositions(source)
  const hidden = new Set<number>([
    ...blockPositions,
    ...predicatePositions,
    ...quotePositions,
    ...commentDelimiterPositions
  ])
  return refineHiddenSyntaxWhitespace(source, hidden)
}

// Remove whitespace/newlines that would become stray artifacts after hiding braces.
function refineHiddenSyntaxWhitespace(source: string, hidden: Set<number>): Set<number> {
  const refined = new Set<number>(hidden)

  // Remove spaces before an opening brace that is followed by a line break.
  for (const idx of hidden) {
    if (source[idx] !== '{') continue
    const next = source[idx + 1]
    if (next !== '\n' && next !== '\r' && next !== undefined) continue
    let left = idx - 1
    while (left >= 0 && (source[left] === ' ' || source[left] === '\t')) {
      refined.add(left)
      left -= 1
    }
  }

  // Remove full lines that only contained hidden syntax and whitespace.
  let lineStart = 0
  while (lineStart <= source.length) {
    let lineEnd = source.indexOf('\n', lineStart)
    if (lineEnd === -1) lineEnd = source.length
    let hasVisibleNonWhitespace = false
    for (let idx = lineStart; idx < lineEnd; idx += 1) {
      if (refined.has(idx)) continue
      const char = source[idx]
      if (char !== ' ' && char !== '\t' && char !== '\r') {
        hasVisibleNonWhitespace = true
        break
      }
    }
    if (!hasVisibleNonWhitespace) {
      for (let idx = lineStart; idx < lineEnd; idx += 1) refined.add(idx)
      if (lineEnd < source.length) refined.add(lineEnd)
    }
    if (lineEnd >= source.length) break
    lineStart = lineEnd + 1
  }

  return refined
}

// Build a source-position to projected-offset mapper.
function buildProjectionOffsets(source: string, hiddenPositions: Set<number>): ProjectionOffsets {
  const offsets: number[] = new Array(source.length + 1)
  let visibleCount = 0
  for (let idx = 0; idx < source.length; idx += 1) {
    offsets[idx] = visibleCount
    if (!hiddenPositions.has(idx)) visibleCount += 1
  }
  offsets[source.length] = visibleCount
  return {
    at: (sourcePos: number) => {
      const clamped = Math.max(0, Math.min(sourcePos, source.length))
      return offsets[clamped]
    }
  }
}

// Produce source text for a half-open range while dropping hidden positions.
function filteredRangeText(
  source: string,
  start: number,
  end: number,
  hiddenPositions: Set<number>
): string {
  let text = ''
  const rangeStart = Math.max(0, start)
  const rangeEnd = Math.min(end, source.length)
  for (let idx = rangeStart; idx < rangeEnd; idx += 1) {
    if (hiddenPositions.has(idx)) continue
    text += source[idx]
  }
  return text
}

// Build scanner-based text leaves from a source range when text remains visible.
function buildTextLeaves(
  source: string,
  start: number,
  end: number,
  hiddenPositions: Set<number>,
  offsets: ProjectionOffsets
): SusyNode[] {
  if (end <= start) return []
  const slice = source.slice(start, end)
  if (!slice) return []
  const scanner = ts.createScanner(ts.ScriptTarget.Latest, false, ts.LanguageVariant.Standard, slice)
  const leaves: SusyNode[] = []
  for (let kind = scanner.scan(); kind !== ts.SyntaxKind.EndOfFileToken; kind = scanner.scan()) {
    const tokenStart = start + scanner.getTokenPos()
    const tokenEnd = start + scanner.getTextPos()
    const text = filteredRangeText(source, tokenStart, tokenEnd, hiddenPositions)
    if (!text) continue
    leaves.push({
      kind: 'ts',
      type: tokenTypeForSyntaxKind(kind, text),
      tokenIdx: 0,
      text,
      x: offsets.at(tokenStart)
    })
  }
  return leaves
}

// Build a Susy subtree mirroring one TypeScript AST node.
function buildAstNodeSusy(
  node: ts.Node,
  sourceFile: ts.SourceFile,
  source: string,
  hiddenPositions: Set<number>,
  offsets: ProjectionOffsets
): SusyNode {
  const nodeStart = projectionStart(node, sourceFile)
  const nodeEnd = node.getEnd()
  const kids: SusyNode[] = []
  const childNodes: ts.Node[] = []
  ts.forEachChild(node, (child) => {
    childNodes.push(child)
  })
  childNodes.sort((left, right) => projectionStart(left, sourceFile) - projectionStart(right, sourceFile))

  let cursor = nodeStart
  for (const child of childNodes) {
    const childStart = projectionStart(child, sourceFile)
    if (childStart > cursor) {
      kids.push(...buildTextLeaves(source, cursor, childStart, hiddenPositions, offsets))
    }
    kids.push(buildAstNodeSusy(child, sourceFile, source, hiddenPositions, offsets))
    cursor = child.getEnd()
  }

  if (cursor < nodeEnd) {
    kids.push(...buildTextLeaves(source, cursor, nodeEnd, hiddenPositions, offsets))
  }

  const nodeText = filteredRangeText(source, nodeStart, nodeEnd, hiddenPositions)
  const susyNode: SusyNode = {
    kind: 'ts',
    type: ts.SyntaxKind[node.kind] as unknown as TokenTypeName,
    tokenIdx: 0,
    ast: node,
    x: offsets.at(nodeStart),
    text: nodeText
  }
  if (kids.length > 0) {
    susyNode.kids = kids
  }
  return susyNode
}

// Assign token indexes across the final Susy tree.
function assignTokenIdx(root: SusyNode): void {
  let tokenIdx = 0

  // Walk depth-first and assign deterministic token indexes.
  const visit = (node: SusyNode): void => {
    node.tokenIdx = tokenIdx
    tokenIdx += 1
    if (Array.isArray(node.kids)) {
      for (const child of node.kids) visit(child)
    }
  }

  visit(root)
}

// Project TS text into an AST-mirroring Susy tree with hidden delimiters.
export function susyTsProjection(source: string): SusyNode {
  const sourceFile = ts.createSourceFile('inline.ts', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS)
  const hiddenPositions = collectHiddenPositions(sourceFile, source)
  const offsets = buildProjectionOffsets(source, hiddenPositions)
  const root = buildAstNodeSusy(sourceFile, sourceFile, source, hiddenPositions, offsets)
  assignTokenIdx(root)
  return root
}
