import type { SusyLeaf, SusyNode, TokenTypeName } from '../../lush-types/index.ts'

let tokenIdxCounter = 0

// Create a leaf token with a stable index.
function makeToken(text: string, type: TokenTypeName): SusyLeaf {
  const token: SusyLeaf = {
    kind: 'js',
    type,
    tokenIdx: tokenIdxCounter,
    text
  }
  tokenIdxCounter += 1
  return token
}

// Build a line node and append a newline token.
function makeLine(tokens: SusyNode[]): SusyNode {
  return {
    kind: 'js',
    type: 'block-seq',
    tokenIdx: tokenIdxCounter++,
    kids: [...tokens, makeToken('\n', 'punctuation')]
  }
}

// Create an empty tree for the initial editor state.
export function createSampleJsTree(): SusyNode {
  tokenIdxCounter = 0
  return {
    kind: 'js',
    type: 'document',
    tokenIdx: tokenIdxCounter++,
    kids: []
  }
}
