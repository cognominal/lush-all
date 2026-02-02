export const SPACE_TYPE = 'Space'
export const NAKED_STRING_TYPE = 'NakedString'

export const YAML_TOKEN_TYPES = [
  'byte-order-mark',
  'doc-mode',
  'doc-start',
  'space',
  'comment',
  'newline',
  'directive-line',
  'directive',
  'error',
  'anchor',
  'tag',
  'seq-item-ind',
  'explicit-key-ind',
  'map-value-ind',
  'flow-map-start',
  'flow-map-end',
  'flow-seq-start',
  'flow-seq-end',
  'flow-error-end',
  'comma',
  'block-scalar-header',
  'doc-end',
  'alias',
  'scalar',
  'single-quoted-scalar',
  'double-quoted-scalar',
  'block-scalar',
  'block-map',
  'block-seq',
  'flow-collection',
  'document'
]

export const YAML_AST_TYPES = [
  'Document',
  'YAMLMap',
  'YAMLSeq',
  'Pair',
  'Scalar',
  'Alias'
]

export const JS_TOKEN_TYPES = [
  'keyword',
  'variable',
  'operator',
  'punctuation',
  'number'
]

const tokenKinds = new Set()
const tokenTypes = new Set()
const tokenKindTypes = new Set()

// Parse a Kind.Type token name into its parts.
function parseTokenKindType(name) {
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
export function registerTokenType(name) {
  const { kind, type } = parseTokenKindType(name)
  tokenKinds.add(kind)
  tokenTypes.add(type)
  tokenKindTypes.add(`${kind}.${type}`)
  return name
}

// Check whether a token kind is registered.
export function hasTokenKind(name) {
  return tokenKinds.has(name)
}

// Check whether a token type is registered.
export function hasTokenType(name) {
  return tokenTypes.has(name)
}

// Check whether a Kind.Type pair is registered.
export function hasTokenKindType(name) {
  return tokenKindTypes.has(name)
}

export { susySvelteProjection } from './susy-svelte-projection'
export { susyJsProjection } from './susy-js-projection'
export { susyTsProjection } from './susy-ts-projection'
export { susyYamlProjection } from './susy-yaml-projection'
export { findSusyYamlPathAtPos, projectSusyYamlView } from './susy-yaml-view'

export function susyText(token) {
  if (!token) return ''
  if (typeof token.text === 'string') return token.text
  if (Array.isArray(token.kids)) {
    return token.kids.map(susyText).join('')
  }
  return ''
}

export function tokenizeSusyLine(text) {
  if (!text) return []
  const tokens = []
  let idx = 0
  while (idx < text.length) {
    const start = idx
    const isSpace = text[start] === ' '
    while (idx < text.length && (text[idx] === ' ') === isSpace) idx += 1
    const segment = text.slice(start, idx)
    tokens.push({
      kind: 'YAML',
      type: isSpace ? SPACE_TYPE : NAKED_STRING_TYPE,
      tokenIdx: tokens.length,
      text: segment,
      x: start
    })
  }
  return tokens
}

export function stringToSusyLines(input) {
  if (typeof input !== 'string' || input.length === 0) return []
  return input.split(/\r?\n/).map(tokenizeSusyLine)
}

// Register YAML token types using the YAML.* prefix.
export function registerYamlTokenTypes() {
  for (const tokenType of YAML_TOKEN_TYPES) {
    registerTokenType(`YAML.${tokenType}`)
  }
  for (const tokenType of YAML_AST_TYPES) {
    registerTokenType(`YAML.${tokenType}`)
  }
}

registerYamlTokenTypes()
