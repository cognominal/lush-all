import type { SusyLeaf, SusyNode } from './index'
import { NAKED_STRING_TYPE, SPACE_TYPE } from './token-lists'
import type { TokenTypeName } from './token-registry'

let tokenIdxCounter = 0

// Create a TS token with a stable index.
function makeToken(text: string, type: TokenTypeName): SusyLeaf {
  const token: SusyLeaf = {
    kind: 'ts',
    type,
    tokenIdx: tokenIdxCounter,
    text
  }
  tokenIdxCounter += 1
  return token
}

// Split a line into TS space and text tokens.
function tokenizeTsLine(text: string): SusyLeaf[] {
  if (!text) return []
  const tokens: SusyLeaf[] = []
  let idx = 0
  while (idx < text.length) {
    const start = idx
    const isSpace = text[start] === ' '
    while (idx < text.length && (text[idx] === ' ') === isSpace) idx += 1
    const segment = text.slice(start, idx)
    tokens.push(makeToken(segment, isSpace ? SPACE_TYPE : NAKED_STRING_TYPE))
  }
  return tokens
}

// Project TS text into a Susy token tree.
export function susyTsProjection(source: string): SusyNode {
  tokenIdxCounter = 0
  const root: SusyNode = {
    kind: 'ts',
    type: 'document',
    tokenIdx: tokenIdxCounter++,
    kids: []
  }
  if (!source) return root
  const lines = source.split(/\r?\n/)
  for (let lineIdx = 0; lineIdx < lines.length; lineIdx += 1) {
    root.kids?.push(...tokenizeTsLine(lines[lineIdx]))
    if (lineIdx < lines.length - 1) {
      root.kids?.push(makeToken('\n', NAKED_STRING_TYPE))
    }
  }
  return root
}
