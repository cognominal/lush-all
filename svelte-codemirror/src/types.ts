import type { InputToken } from '../../lush-types/index.ts'

export type { InputToken } from '../../lush-types/index.ts'

export type Mode = 'normal' | 'insert'

export type Span = {
  from: number
  to: number
  textFrom?: number
  textTo?: number
}

export interface StructuralEditorState {
  mode: Mode
  root: InputToken
  currentPath: number[]
  currentInputPath: number[]
  cursorOffset: number
  projectionText: string
  spansByPath: Map<string, Span>
}
