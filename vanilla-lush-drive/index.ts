export { VanillaProjectionDrv } from './projection'
export { VanillaEmbedderDrv } from './embedding'
export { VanillaEditorDrv } from './editor'

export const vanillaDriverSpec = {
  projection: 'vanilla-lush-drive#VanillaProjectionDrv',
  embedding: 'vanilla-lush-drive#VanillaEmbedderDrv',
  editor: 'vanilla-lush-drive#VanillaEditorDrv'
} as const
