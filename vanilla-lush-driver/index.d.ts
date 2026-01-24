import type {
  LushEmbedderDrv,
  LushEditorDrv,
  LushProjectionDrv
} from 'lush-types'

export declare class VanillaProjectionDrv implements LushProjectionDrv {
  readonly id: string
  readonly kind: 'projection'
}

export declare class VanillaEmbedderDrv implements LushEmbedderDrv {
  readonly id: string
  readonly kind: 'embedding'
}

export declare class VanillaEditorDrv implements LushEditorDrv {
  readonly id: string
  readonly kind: 'editor'
}

export declare const vanillaDriverSpec: {
  readonly projection: string
  readonly embedding: string
  readonly editor: string
}
