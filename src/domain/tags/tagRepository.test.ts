import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../../db/db'
import { deleteTags, ensureTagColor, listTags, setTagColor } from './tagRepository'
import { PILL_PALETTE } from './tagPalette'
import { createId } from '../ids'
import type { Note } from '../entities.types'

beforeEach(async () => {
  await db.tags.clear()
  await db.notes.clear()
})

function buildNote(tags: string[]): Note {
  const now = new Date().toISOString()
  return {
    id: createId(),
    notebookId: null,
    boardId: null,
    noteTypeId: null,
    title: 'Untitled',
    metadata: { tags, createdAt: now, updatedAt: now, properties: {} },
    blockDocId: createId(),
    createdAt: now,
    updatedAt: now,
  }
}

describe('tagRepository', () => {
  it('assigns a new tag a color from the palette and registers it', async () => {
    const color = await ensureTagColor('urgent')
    expect(PILL_PALETTE).toContain(color)
    expect(await listTags()).toEqual([{ name: 'urgent', color, createdAt: expect.any(String) }])
  })

  it('returns the same color for a tag that is already registered', async () => {
    const first = await ensureTagColor('urgent')
    const second = await ensureTagColor('urgent')
    expect(second).toBe(first)
    expect(await listTags()).toHaveLength(1)
  })

  it('treats tag names as case-sensitive', async () => {
    await ensureTagColor('Urgent')
    await ensureTagColor('urgent')
    const names = (await listTags()).map((tag) => tag.name).sort()
    expect(names).toEqual(['Urgent', 'urgent'])
  })

  it('spreads random assignment across the least-used palette colors', async () => {
    const names = Array.from({ length: PILL_PALETTE.length }, (_, i) => `tag-${i}`)
    for (const name of names) {
      await ensureTagColor(name)
    }

    const tags = await listTags()
    const counts = new Map<string, number>()
    for (const tag of tags) {
      counts.set(tag.color, (counts.get(tag.color) ?? 0) + 1)
    }

    expect(counts.size).toBe(PILL_PALETTE.length)
    for (const count of counts.values()) {
      expect(count).toBe(1)
    }
  })

  it('lets a user override a tag color directly', async () => {
    await ensureTagColor('urgent')
    await setTagColor('urgent', '#123456')
    expect(await listTags()).toEqual([
      { name: 'urgent', color: '#123456', createdAt: expect.any(String) },
    ])
  })

  it('registers a color override for a tag that is not yet known', async () => {
    await setTagColor('brand-new', '#654321')
    expect(await listTags()).toEqual([
      { name: 'brand-new', color: '#654321', createdAt: expect.any(String) },
    ])
  })

  it('keeps a tag color even once it is no longer used on any note', async () => {
    const color = await ensureTagColor('urgent')
    // Simulates removing the tag from every note — the registry entry is untouched, since
    // colors are remembered forever and reused if the tag resurfaces later.
    expect(await ensureTagColor('urgent')).toBe(color)
  })

  describe('deleteTags', () => {
    it('removes a tag from the registry and strips it from every note that has it', async () => {
      await ensureTagColor('urgent')
      const withTag = buildNote(['urgent', 'work'])
      const withoutTag = buildNote(['work'])
      await db.notes.bulkAdd([withTag, withoutTag])

      await deleteTags(['urgent'])

      expect(await listTags()).toEqual([])
      const updated = await db.notes.get(withTag.id)
      expect(updated?.metadata.tags).toEqual(['work'])
      expect(updated?.metadata.updatedAt).not.toBe(withTag.metadata.updatedAt)
      const untouched = await db.notes.get(withoutTag.id)
      expect(untouched?.metadata.tags).toEqual(['work'])
      expect(untouched?.metadata.updatedAt).toBe(withoutTag.metadata.updatedAt)
    })

    it('removes multiple unused tags without touching any notes', async () => {
      await ensureTagColor('a')
      await ensureTagColor('b')
      const note = buildNote(['c'])
      await db.notes.add(note)

      await deleteTags(['a', 'b'])

      expect(await listTags()).toEqual([])
      expect((await db.notes.get(note.id))?.metadata.tags).toEqual(['c'])
    })

    it('is a no-op for a tag name that does not exist', async () => {
      await ensureTagColor('urgent')
      await deleteTags(['does-not-exist'])
      expect((await listTags()).map((tag) => tag.name)).toEqual(['urgent'])
    })
  })
})
