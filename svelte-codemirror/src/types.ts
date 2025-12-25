import type { SusyNode } from '../../lush-types/index.ts'

export type { SusyNode } from '../../lush-types/index.ts'

export type Mode = 'normal' | 'insert'

export type Span = {
  from: number
  to: number
  textFrom?: number
  textTo?: number
}

export interface StructuralEditorState {
  mode: Mode
  root: SusyNode
  currentPath: number[]
  currentTokPath: number[]
  cursorOffset: number
  projectionText: string
  spansByPath: Map<string, Span>
}
