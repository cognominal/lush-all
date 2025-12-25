export type FileNode = {
  name: string
  path: string
  type: 'dir' | 'file'
  children?: FileNode[]
}
