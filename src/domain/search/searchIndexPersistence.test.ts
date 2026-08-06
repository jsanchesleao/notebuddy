import { Document } from 'flexsearch'
import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../../db/db'
import { loadSearchIndexSnapshot, persistSearchIndex } from './searchIndexPersistence'
import type { SearchDocument } from './searchIndex.types'

function createTestIndex(): Document<SearchDocument> {
  return new Document<SearchDocument>({
    tokenize: 'forward',
    document: { id: 'noteId', index: ['title', 'tags', 'content'] },
  })
}

beforeEach(async () => {
  await db.searchIndexSnapshot.clear()
})

describe('searchIndexPersistence', () => {
  it('round-trips an index through export/import, reproducing identical search results', async () => {
    const original = createTestIndex()
    original.add({ noteId: 'note-1', title: 'Weekly Planning', tags: 'work', content: 'roadmap' })
    original.add({ noteId: 'note-2', title: 'Grocery list', tags: '', content: 'milk eggs' })

    await persistSearchIndex(original)
    expect(await db.searchIndexSnapshot.count()).toBeGreaterThan(0)

    const restored = createTestIndex()
    const loaded = await loadSearchIndexSnapshot(restored)
    expect(loaded).toBe(true)

    const results = restored.search('plan', { enrich: false, merge: true } as const)
    expect(results.map((result) => result.id)).toEqual(['note-1'])
  })

  it('returns false, leaving the index untouched, when there is no persisted snapshot', async () => {
    const index = createTestIndex()
    expect(await loadSearchIndexSnapshot(index)).toBe(false)
  })
})
