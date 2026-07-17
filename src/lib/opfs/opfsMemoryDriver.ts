import type { OpfsDriver } from './opfsDriver.types'

export function createOpfsMemoryDriver(): OpfsDriver {
  const files = new Map<string, Blob>()

  return {
    async writeFile(path, blob) {
      files.set(path, blob)
    },
    async readFile(path) {
      return files.get(path) ?? null
    },
    async deleteFile(path) {
      files.delete(path)
    },
    async exists(path) {
      return files.has(path)
    },
  }
}
