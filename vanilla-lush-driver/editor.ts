import type { LushEditorDrv } from 'lush-types'

export class VanillaEditorDrv implements LushEditorDrv {
  readonly id = 'vanilla-editor'
  readonly kind = 'editor'
}
