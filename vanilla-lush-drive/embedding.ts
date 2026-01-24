import type { LushEmbedderDrv } from 'lush-types'

export class VanillaEmbedderDrv implements LushEmbedderDrv {
  readonly id = 'vanilla-embedder'
  readonly kind = 'embedding'
}
