export { VanillaProjectionDrv } from './projection.ts'
export { VanillaEmbedderDrv } from './embedding.ts'
export { VanillaEditorDrv } from './editor.ts'

export const vanillaDriverSpec = {
  projection: 'vanilla-lush-drive#VanillaProjectionDrv',
  embedding: 'vanilla-lush-drive#VanillaEmbedderDrv',
  editor: 'vanilla-lush-drive#VanillaEditorDrv'
}
