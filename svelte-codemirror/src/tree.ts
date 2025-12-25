import type { SusyLeaf, SusyNode } from '../../lush-types/index.ts'

export function serializePath(path: number[]): string {
  return JSON.stringify(path)
}

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

export function isSusyLeaf(token: SusyNode): token is SusyLeaf {
  return typeof token.text === 'string'
}

export function isSusyTok(token: SusyNode): token is SusyLeaf {
  return isSusyLeaf(token)
}
