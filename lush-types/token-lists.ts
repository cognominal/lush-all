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
] as const

export type YamlTokenType = (typeof YAML_TOKEN_TYPES)[number]

export const YAML_AST_TYPES = [
  'Document',
  'YAMLMap',
  'YAMLSeq',
  'Pair',
  'Scalar',
  'Alias'
] as const

export type YamlAstType = (typeof YAML_AST_TYPES)[number]

export const SPACE_TYPE = 'Space'
export const NAKED_STRING_TYPE = 'NakedString'

export type SyntheticTokenType = typeof SPACE_TYPE | typeof NAKED_STRING_TYPE

export const JS_TOKEN_TYPES = [
  'keyword',
  'variable',
  'operator',
  'punctuation',
  'number',
  'Comment'
] as const

export type JsTokenType = (typeof JS_TOKEN_TYPES)[number]
