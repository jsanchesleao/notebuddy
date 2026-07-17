export interface OpfsDriver {
  writeFile(path: string, blob: Blob): Promise<void>
  readFile(path: string): Promise<Blob | null>
  deleteFile(path: string): Promise<void>
  exists(path: string): Promise<boolean>
}
