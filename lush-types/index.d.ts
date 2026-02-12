export type YamlTokenType =
  | 'byte-order-mark'
  | 'doc-mode'
  | 'doc-start'
  | 'space'
  | 'comment'
  | 'newline'
  | 'directive-line'
  | 'directive'
  | 'error'
  | 'anchor'
  | 'tag'
  | 'seq-item-ind'
  | 'explicit-key-ind'
  | 'map-value-ind'
  | 'flow-map-start'
  | 'flow-map-end'
  | 'flow-seq-start'
  | 'flow-seq-end'
  | 'flow-error-end'
  | 'comma'
  | 'block-scalar-header'
  | 'doc-end'
  | 'alias'
  | 'scalar'
  | 'single-quoted-scalar'
  | 'double-quoted-scalar'
  | 'block-scalar'
  | 'block-map'
  | 'block-seq'
  | 'flow-collection'
  | 'document'

export const YAML_TOKEN_TYPES: readonly YamlTokenType[]

export const YAML_AST_TYPES: readonly YamlAstType[]

export const SPACE_TYPE: 'Space'
export const NAKED_STRING_TYPE: 'NakedString'

export type SyntheticTokenType = typeof SPACE_TYPE | typeof NAKED_STRING_TYPE
export type JsTokenType =
  | 'keyword'
  | 'variable'
  | 'operator'
  | 'punctuation'
  | 'number'
  | 'Comment'

export const JS_TOKEN_TYPES: readonly JsTokenType[]

export type YamlAstType =
  | 'Document'
  | 'YAMLMap'
  | 'YAMLSeq'
  | 'Pair'
  | 'Scalar'
  | 'Alias'

export type BuiltinTokenKind =
  | 'Lush'
  | 'YAML'
  | 'jq'
  | 'js'
  | 'svelte'
  | 'leste'
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

export function registerTokenType(name: TokenKindTypeName): TokenKindTypeName
export function hasTokenKind(name: TokenKindName): boolean
export function hasTokenType(name: TokenTypeName): boolean
export function hasTokenKindType(name: TokenKindTypeName): boolean
export function registerYamlTokenTypes(): void
export function registerLesteTokenTypes(): void

export type CompletionTokenKind =
  | 'Folder'
  | 'Builtin'
  | 'Command'
  | 'SnippetTrigger'
  | 'TypeScriptSymbol'

type CompletionMetadataBase<Kind extends CompletionTokenKind> = {
  kind: Kind
  label: string
  description?: string
}

type FolderCompletionMetadata = CompletionMetadataBase<'Folder'> & {
  path?: string
  previewEntry?: string
}

type BuiltinCompletionMetadata = CompletionMetadataBase<'Builtin'> & {
  helpText?: string
}

type CommandCompletionMetadata = CompletionMetadataBase<'Command'> & {
  summary?: string
}

type SnippetTriggerCompletionMetadata =
  CompletionMetadataBase<'SnippetTrigger'> & {
    snippetName?: string
  }

type TypeScriptSymbolCompletionMetadata =
  CompletionMetadataBase<'TypeScriptSymbol'> & {
    symbolType?: string
    modulePath?: string
  }

export type LushTokenKind = TokenKindName

export type CompletionTokenMetadata =
  | FolderCompletionMetadata
  | BuiltinCompletionMetadata
  | CommandCompletionMetadata
  | SnippetTriggerCompletionMetadata
  | TypeScriptSymbolCompletionMetadata

export interface SusyINode {
  kind: LushTokenKind
  type: TokenTypeName
  tokenIdx: number
  text?: string
  kids?: SusyNode[]
  x?: number
  ast?: any
  completion?: CompletionTokenMetadata
  stemCell?: boolean
  isCstToken?: boolean
}

export type SusyLeaf = SusyINode & { text: string }
export type SusyNode = SusyINode | SusyLeaf
export type SusyTok = SusyLeaf

export type SusyPlaceholderKind = 'key' | 'value' | 'entry' | 'scalar'

export type SusyYamlMeta = {
  yamlKind: 'mapping' | 'sequence' | 'scalar'
  yamlStyle: 'inline' | 'block'
  yamlScalarStyle: 'plain' | 'single' | 'double' | 'block'
  yamlBlockIndent: number
  yamlAnchors?: string
  yamlTags?: string
  yamlComments?: { before: string[]; inline: string[]; after: string[] }
}

export type SusyYamlNode = SusyNode & {
  kind: 'YAML'
  isPlaceHolder?: boolean
  placeholderKind?: SusyPlaceholderKind
  meta?: SusyYamlMeta
}

export type SusyLine = SusyNode[]
export type SusyLines = SusyLine[]

export interface SusyEd {
  root: SusyNode
  lines: SusyLines
}

export function susySvelteProjection(
  source: string,
  filename?: string
): SusyNode

export function susySvelteLesteProjection(
  source: string,
  ruleproj: string
): SusyNode

export function susyRuleprojProjection(source: string): SusyNode

export function susyJsProjection(
  source: string,
  filename?: string
): SusyNode

export function susyTsProjection(
  source: string,
  filename?: string
): SusyNode

export function susyYamlProjection(source: string): SusyNode

export type RuleprojRule = {
  name: string
  match: {
    type?: { kind: 'literal'; value: string } | { kind: 'capture'; name: string }
    name?: { kind: 'literal'; value: string } | { kind: 'capture'; name: string }
    data?: { kind: 'literal'; value: string } | { kind: 'capture'; name: string }
    children?: { kind: 'literal'; value: string } | { kind: 'capture'; name: string }
    where?:
      | { kind: 'inlineTag'; arg: string }
      | { kind: 'blockTag'; arg: string }
  }
  emit:
    | { kind: 'line'; line: { kind: 'tag' | 'text'; arg: string } | { kind: 'inlineTag'; name: string; kids: string } }
    | { kind: 'block'; line: { kind: 'tag' | 'text'; arg: string } | { kind: 'inlineTag'; name: string; kids: string }; each: string }
}

export function parseRuleproj(text: string): RuleprojRule[]

export type Span = {
  from: number
  to: number
  textFrom?: number
  textTo?: number
}

export type SusyYamlViewProjection = {
  text: string
  spansByPath: Map<string, Span>
}

export function projectSusyYamlView(
  root: SusyNode,
  options?: { indexer?: string; filterKeys?: Iterable<string> }
): SusyYamlViewProjection

export function findSusyYamlPathAtPos(
  spansByPath: Map<string, Span>,
  pos: number
): number[] | null

export function susyText(token: SusyNode | undefined): string
export function isSusyYamlNode(token: SusyNode): token is SusyYamlNode
export function isSusyPlaceholder(token: SusyNode | undefined): boolean
export function defaultYamlPlaceholder(kind: SusyPlaceholderKind): string
export function tokenizeSusyLine(text: string): SusyLine
export function stringToSusyLines(input: string): SusyLines

export type MenuActionId =
  | 'about'
  | 'login'
  | 'logout'
  | 'open-yaml-file'
  | 'open-editor'
  | 'open-yaml-sample'
  | 'open-docs'

export type KeyModifier = 'Alt' | 'Control' | 'Meta' | 'Shift'
export type MenuAccelerator = {
  key: string
  modifiers?: readonly KeyModifier[]
}

export type MenuItem =
  | {
      kind: 'action'
      id: string
      label: string
      action: MenuActionId
      accelerator?: MenuAccelerator
      disabled?: boolean
    }
  | {
      kind: 'separator'
      id: string
    }
  | {
      kind: 'submenu'
      id: string
      label: string
      items: readonly MenuItem[]
      disabled?: boolean
    }

export type MenuMenu = Extract<MenuItem, { kind: 'submenu' }>

export type MenuBarSpec = {
  menus: readonly MenuMenu[]
}

export type MenuActionEventDetail =
  | {
    action: 'about'
  }
  | {
    action: 'login'
  }
  | {
    action: 'logout'
  }
  | {
    action: 'open-docs'
  }
  | {
    action: 'open-editor'
  }
  | {
      action: 'open-yaml-sample'
    }
  | {
      action: 'open-yaml-file'
      path?: string
      content?: string
    }
