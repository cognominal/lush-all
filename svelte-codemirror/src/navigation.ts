import type { SusyNode } from '../../lush-types/index.ts'
import { getNodeByPath, isSusyTok } from './tree'

// Walk a subtree to find the first token path.
function findFirstTokInSubtree(
  token: SusyNode,
  path: number[]
): number[] | undefined {
  if (isSusyTok(token)) return path
  const children = token.kids ?? []
  for (let idx = 0; idx < children.length; idx += 1) {
    const child = children[idx]
    const found = findFirstTokInSubtree(child, [...path, idx])
    if (found) return found
  }
  return undefined
}

// Resolve a token path from a starting path.
export function findFirstTokPath(root: SusyNode, path: number[]): number[] {
  const token = getNodeByPath(root, path)
  if (!token) return path
  if (isSusyTok(token)) return path
  return findFirstTokInSubtree(token, path) ?? path
}

// Serialize a path for lookup comparisons.
function pathKey(path: number[]): string {
  return JSON.stringify(path)
}

// Find the index of a target path within a list.
function findPathIndex(paths: number[][], target: number[]): number {
  const key = pathKey(target)
  return paths.findIndex((path) => pathKey(path) === key)
}

// Return the next token path in a list.
export function findNextTokPath(
  paths: number[][],
  current: number[]
): number[] | undefined {
  const idx = findPathIndex(paths, current)
  if (idx < 0 || idx >= paths.length - 1) return undefined
  return paths[idx + 1]
}

// Return the previous token path in a list.
export function findPrevTokPath(
  paths: number[][],
  current: number[]
): number[] | undefined {
  const idx = findPathIndex(paths, current)
  if (idx <= 0) return undefined
  return paths[idx - 1]
}

// Descend to the first child if it exists.
export function descendPath(root: SusyNode, path: number[]): number[] {
  const token = getNodeByPath(root, path)
  if (!token?.kids || token.kids.length === 0) return path
  return [...path, 0]
}
