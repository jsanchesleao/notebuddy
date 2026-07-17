import type { OpfsDriver } from './opfsDriver.types'

function isNotFoundError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'NotFoundError'
}

function splitPath(path: string): { dirSegments: string[]; fileName: string } {
  const segments = path.split('/').filter((segment) => segment.length > 0)
  const fileName = segments.pop()
  if (!fileName) {
    throw new Error(`Invalid OPFS path: ${path}`)
  }
  return { dirSegments: segments, fileName }
}

async function resolveDirectory(
  segments: string[],
  create: boolean,
): Promise<FileSystemDirectoryHandle> {
  let dir = await navigator.storage.getDirectory()
  for (const segment of segments) {
    dir = await dir.getDirectoryHandle(segment, { create })
  }
  return dir
}

function createNativeOpfsDriver(): OpfsDriver {
  return {
    async writeFile(path, blob) {
      const { dirSegments, fileName } = splitPath(path)
      const dir = await resolveDirectory(dirSegments, true)
      const fileHandle = await dir.getFileHandle(fileName, { create: true })
      const writable = await fileHandle.createWritable()
      await writable.write(blob)
      await writable.close()
    },

    async readFile(path) {
      try {
        const { dirSegments, fileName } = splitPath(path)
        const dir = await resolveDirectory(dirSegments, false)
        const fileHandle = await dir.getFileHandle(fileName, { create: false })
        return await fileHandle.getFile()
      } catch (error) {
        if (isNotFoundError(error)) return null
        throw error
      }
    },

    async deleteFile(path) {
      try {
        const { dirSegments, fileName } = splitPath(path)
        const dir = await resolveDirectory(dirSegments, false)
        await dir.removeEntry(fileName)
      } catch (error) {
        if (isNotFoundError(error)) return
        throw error
      }
    },

    async exists(path) {
      try {
        const { dirSegments, fileName } = splitPath(path)
        const dir = await resolveDirectory(dirSegments, false)
        await dir.getFileHandle(fileName, { create: false })
        return true
      } catch (error) {
        if (isNotFoundError(error)) return false
        throw error
      }
    },
  }
}

let driver: OpfsDriver | null = null

export function getOpfsDriver(): OpfsDriver {
  if (!driver) {
    driver = createNativeOpfsDriver()
  }
  return driver
}
