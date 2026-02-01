import type { SusyLeaf, SusyNode } from './index'
import { NAKED_STRING_TYPE, SPACE_TYPE } from './token-lists'
import type { TokenTypeName } from './token-registry'

let tokenIdxCounter = 0

// Create a YAML token with a stable index.
function makeToken(text: string, type: TokenTypeName): SusyLeaf {
  const token: SusyLeaf = {
    kind: 'YAML',
    type,
    tokenIdx: tokenIdxCounter,
    text
  }
  tokenIdxCounter += 1
  return token
}

// Split a line into YAML space and text tokens.
function tokenizeYamlLine(text: string): SusyLeaf[] {
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

// Project YAML text into a Susy token tree.
export function susyYamlProjection(source: string): SusyNode {
  tokenIdxCounter = 0
  const root: SusyNode = {
    kind: 'YAML',
    type: 'document',
    tokenIdx: tokenIdxCounter++,
    kids: []
  }
  if (!source) return root
  const lines = source.split(/\r?\n/)
  for (let lineIdx = 0; lineIdx < lines.length; lineIdx += 1) {
    root.kids?.push(...tokenizeYamlLine(lines[lineIdx]))
    if (lineIdx < lines.length - 1) {
      root.kids?.push(makeToken('\n', 'newline'))
    }
  }
  return root
}
