import type { LushProjectionDrv } from 'lush-types'

export class VanillaProjectionDrv implements LushProjectionDrv {
  readonly id = 'vanilla-projection'
  readonly kind = 'projection'
}
