import type { InputToken } from '../../lush-types/index.ts'

export function serializePath(path: number[]): string {
  return JSON.stringify(path)
}

export function getTokenByPath(root: InputToken, path: number[]): InputToken | undefined {
  let current: InputToken | undefined = root
  for (const idx of path) {
    const next: InputToken | undefined = current?.subTokens?.[idx]
    if (!next) return undefined
    current = next
  }
  return current
}

export function isLeaf(token: InputToken): boolean {
  return !Array.isArray(token.subTokens) || token.subTokens.length === 0
}

export function isInputToken(token: InputToken): boolean {
  return isLeaf(token)
}
