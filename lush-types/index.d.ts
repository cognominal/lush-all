

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

export declare const SPACE_TYPE: "Space"
export declare const NAKED_STRING_TYPE: "NakedString"

export type SyntheticTokenType = typeof SPACE_TYPE | typeof NAKED_STRING_TYPE
export type JsTokenType =
  | 'keyword'
  | 'variable'
  | 'operator'
  | 'punctuation'
  | 'number'
export type TokenTypeName = YamlTokenType | SyntheticTokenType | JsTokenType

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

export type LushTokenKind = 'Lush' | 'YAML' | 'jq' | 'js'

export type CompletionTokenMetadata =
  | FolderCompletionMetadata
  | BuiltinCompletionMetadata
  | CommandCompletionMetadata
  | SnippetTriggerCompletionMetadata
  | TypeScriptSymbolCompletionMetadata

export interface InputToken {
  kind: LushTokenKind
  type: TokenTypeName
  tokenIdx: number
  text?: string
  subTokens?: InputToken[]
  x?: number
  completion?: CompletionTokenMetadata
}

export type TokenLine = InputToken[]
export type TokenMultiLine = TokenLine[]

export const SPACE_TYPE: 'Space'
export const NAKED_STRING_TYPE: 'NakedString'

export function tokenText(token: InputToken | undefined): string
export function tokenizeLine(text: string): TokenLine
export function stringToTokenMultiLine(input: string): TokenMultiLine

export type MenuActionId =
  | 'about'
  | 'login'
  | 'logout'
  | 'open-yaml-file'
  | 'open-editor'
  | 'open-yaml-sample'

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
      action: 'open-editor'
    }
  | {
      action: 'open-yaml-sample'
    }
