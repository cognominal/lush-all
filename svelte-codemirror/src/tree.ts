import type { SusyLeaf, SusyNode } from '../../lush-types/index.ts'

// Serialize a node path into a stable string key.
export function serializePath(path: number[]): string {
  return JSON.stringify(path)
}

// Walk the tree to find the node at a path.
export function getNodeByPath(
  root: SusyNode,
  path: number[]
): SusyNode | undefined {
  let current: SusyNode | undefined = root
  for (const idx of path) {
    const next: SusyNode | undefined = current?.kids?.[idx]
    if (!next) return undefined
    current = next
  }
  return current
}

// Narrow a SusyNode to a leaf token.
export function isSusyLeaf(token: SusyNode): token is SusyLeaf {
  return typeof token.text === 'string' && (!token.kids || token.kids.length === 0)
}

// Alias leaf detection for token guards.
export function isSusyTok(token: SusyNode): token is SusyLeaf {
  return isSusyLeaf(token)
}
