import type { InputToken } from '../../lush-types/index.ts'
import { getTokenByPath, isInputToken } from './tree'

function findFirstInputInSubtree(token: InputToken, path: number[]): number[] | undefined {
  if (isInputToken(token)) return path
  const children = token.subTokens ?? []
  for (let idx = 0; idx < children.length; idx += 1) {
    const child = children[idx]
    const found = findFirstInputInSubtree(child, [...path, idx])
    if (found) return found
  }
  return undefined
}

export function findFirstInputPath(root: InputToken, path: number[]): number[] {
  const token = getTokenByPath(root, path)
  if (!token) return path
  if (isInputToken(token)) return path
  return findFirstInputInSubtree(token, path) ?? path
}

function pathKey(path: number[]): string {
  return JSON.stringify(path)
}

function findPathIndex(paths: number[][], target: number[]): number {
  const key = pathKey(target)
  return paths.findIndex((path) => pathKey(path) === key)
}

export function findNextInputPath(
  paths: number[][],
  current: number[]
): number[] | undefined {
  const idx = findPathIndex(paths, current)
  if (idx < 0 || idx >= paths.length - 1) return undefined
  return paths[idx + 1]
}

export function findPrevInputPath(
  paths: number[][],
  current: number[]
): number[] | undefined {
  const idx = findPathIndex(paths, current)
  if (idx <= 0) return undefined
  return paths[idx - 1]
}

export function descendPath(root: InputToken, path: number[]): number[] {
  const token = getTokenByPath(root, path)
  if (!token?.subTokens || token.subTokens.length === 0) return path
  return [...path, 0]
}
