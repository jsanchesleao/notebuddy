import { beforeEach, describe, expect, it } from 'vitest'
import { createOpfsMemoryDriver } from './opfsMemoryDriver'
import { buildAssetPath, sanitizeFileName } from './opfsPaths'
import type { OpfsDriver } from './opfsDriver.types'

// The real navigator.storage.getDirectory()-backed driver (opfsDriver.ts) has no jsdom
// equivalent, so these contract tests run against the in-memory fake. The real driver's
// correctness is verified manually in the browser devtools console per spec.md §12.
describe('OpfsDriver contract', () => {
  let driver: OpfsDriver

  beforeEach(() => {
    driver = createOpfsMemoryDriver()
  })

  it('reads back exactly what was written', async () => {
    const blob = new Blob(['hello world'], { type: 'text/plain' })
    await driver.writeFile('notes/n1/asset.txt', blob)

    const read = await driver.readFile('notes/n1/asset.txt')
    expect(read).not.toBeNull()
    expect(await read!.text()).toBe('hello world')
  })

  it('returns null when reading a path that was never written', async () => {
    expect(await driver.readFile('notes/missing/asset.txt')).toBeNull()
  })

  it('reports existence correctly', async () => {
    expect(await driver.exists('notes/n1/asset.txt')).toBe(false)
    await driver.writeFile('notes/n1/asset.txt', new Blob(['x']))
    expect(await driver.exists('notes/n1/asset.txt')).toBe(true)
  })

  it('deletes a file so subsequent reads return null', async () => {
    await driver.writeFile('notes/n1/asset.txt', new Blob(['x']))
    await driver.deleteFile('notes/n1/asset.txt')

    expect(await driver.readFile('notes/n1/asset.txt')).toBeNull()
    expect(await driver.exists('notes/n1/asset.txt')).toBe(false)
  })

  it('overwrites existing content at the same path', async () => {
    await driver.writeFile('notes/n1/asset.txt', new Blob(['first']))
    await driver.writeFile('notes/n1/asset.txt', new Blob(['second']))

    const read = await driver.readFile('notes/n1/asset.txt')
    expect(await read!.text()).toBe('second')
  })
})

describe('opfsPaths', () => {
  it('builds a path scoped by note and asset id', () => {
    expect(buildAssetPath({ noteId: 'note-1', assetId: 'asset-1', fileName: 'photo.png' })).toBe(
      'notes/note-1/asset-1-photo.png',
    )
  })

  it.each(['../secret', 'a/b', 'a\\b', '', '.', '..'])(
    'rejects unsafe file name %j',
    (fileName) => {
      expect(() => sanitizeFileName(fileName)).toThrow()
    },
  )

  it('allows an ordinary file name', () => {
    expect(sanitizeFileName('photo.png')).toBe('photo.png')
  })
})
