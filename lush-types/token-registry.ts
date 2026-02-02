import type {
  JsTokenType,
  SyntheticTokenType,
  YamlAstType,
  YamlTokenType
} from './token-lists'

export type BuiltinTokenKind = 'Lush' | 'YAML' | 'jq' | 'js' | 'svelte'
export type BuiltinTokenType =
  | YamlTokenType
  | YamlAstType
  | SyntheticTokenType
  | JsTokenType

export interface TokenKindMap extends Record<BuiltinTokenKind, true> {}
export interface TokenTypeMap extends Record<BuiltinTokenType, true> {}

export type TokenKindName = keyof TokenKindMap
export type TokenTypeName = keyof TokenTypeMap
export type TokenKindTypeName = `${TokenKindName}.${TokenTypeName}`

const tokenKinds = new Set<string>()
const tokenTypes = new Set<string>()
const tokenKindTypes = new Set<string>()

// Parse a Kind.Type token name into its parts.
function parseTokenKindType(name: string): { kind: string; type: string } {
  const trimmed = name.trim()
  const firstDot = trimmed.indexOf('.')
  const lastDot = trimmed.lastIndexOf('.')
  if (firstDot <= 0 || firstDot !== lastDot || firstDot >= trimmed.length - 1) {
    throw new Error(`Invalid token kind/type: ${name}`)
  }
  const kind = trimmed.slice(0, firstDot)
  const type = trimmed.slice(firstDot + 1)
  if (!kind || !type) {
    throw new Error(`Invalid token kind/type: ${name}`)
  }
  return { kind, type }
}

// Register a Kind.Type token entry plus its kind and type.
export function registerTokenType(name: TokenKindTypeName): TokenKindTypeName {
  const { kind, type } = parseTokenKindType(name)
  tokenKinds.add(kind)
  tokenTypes.add(type)
  tokenKindTypes.add(`${kind}.${type}`)
  return name
}

// Check whether a token kind is registered.
export function hasTokenKind(name: TokenKindName): boolean {
  return tokenKinds.has(name)
}

// Check whether a token type is registered.
export function hasTokenType(name: TokenTypeName): boolean {
  return tokenTypes.has(name)
}

// Check whether a Kind.Type pair is registered.
export function hasTokenKindType(name: TokenKindTypeName): boolean {
  return tokenKindTypes.has(name)
}
