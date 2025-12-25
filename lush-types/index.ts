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

export const SPACE_TYPE = 'Space'
export const NAKED_STRING_TYPE = 'NakedString'

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


// Distinguish kinds so we can tell YAML tokens apart from future kinds.
export type LushTokenKind = 'Lush' | 'YAML' | 'jq' | 'js' | 'svelte'

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
  ast?: unknown // ast node, for svelte, that would be an augmented tree
  completion?: CompletionTokenMetadata
}

export type SusyLeaf = SusyINode & { text: string }
export type SusyNode = SusyINode | SusyLeaf
export type SusyTok = SusyLeaf

export type SusyLine = SusyNode[]
export type SusyLines = SusyLine[]

export interface SusyEd {
  root: SusyNode
  lines: SusyLines
}


export function susyText(token: SusyNode | undefined): string {
  if (!token) return ''
  if (typeof token.text === 'string') return token.text
  if (Array.isArray(token.kids)) {
    return token.kids.map(susyText).join('')
  }
  return ''
}

export function tokenizeSusyLine(text: string): SusyLine {
  if (!text) return []
  const tokens: SusyLine = []
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

export function stringToSusyLines(input: string): SusyLines {
  if (typeof input !== 'string' || input.length === 0) return []
  return input.split(/\r?\n/).map(tokenizeSusyLine)
}

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
