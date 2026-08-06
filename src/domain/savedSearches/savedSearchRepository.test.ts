import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../../db/db'
import {
  createSavedSearch,
  deleteSavedSearch,
  listSavedSearches,
  renameSavedSearch,
  reorderSavedSearches,
  updateSavedSearchQuery,
} from './savedSearchRepository'
import type { FilterState } from '../notes/noteFilter.types'
import type { SavedSearch } from '../entities.types'

const EMPTY_FILTER: FilterState = { mode: 'and', blocks: [] }

beforeEach(async () => {
  await db.savedSearches.clear()
})

describe('savedSearchRepository', () => {
  it('creates a global saved search with an incrementing order', async () => {
    const first = await createSavedSearch({
      name: 'Everything urgent',
      notebookId: null,
      boardId: null,
      query: 'urgent',
      filter: EMPTY_FILTER,
      selectedTags: [],
    })
    const second = await createSavedSearch({
      name: 'Another one',
      notebookId: null,
      boardId: null,
      query: '',
      filter: EMPTY_FILTER,
      selectedTags: [],
    })

    expect(first.order).toBe(0)
    expect(second.order).toBe(1)
    expect(first.notebookId).toBeNull()
    expect(first.boardId).toBeNull()
  })

  it('creates a saved search scoped to a notebook or board', async () => {
    const scopedToNotebook = await createSavedSearch({
      name: 'Notebook search',
      notebookId: 'notebook-1',
      boardId: null,
      query: '',
      filter: EMPTY_FILTER,
      selectedTags: [],
    })
    const scopedToBoard = await createSavedSearch({
      name: 'Board search',
      notebookId: null,
      boardId: 'board-1',
      query: '',
      filter: EMPTY_FILTER,
      selectedTags: [],
    })

    expect(scopedToNotebook.notebookId).toBe('notebook-1')
    expect(scopedToBoard.boardId).toBe('board-1')
  })

  it('lists saved searches sorted by order', async () => {
    const a = await createSavedSearch({
      name: 'A',
      notebookId: null,
      boardId: null,
      query: '',
      filter: EMPTY_FILTER,
      selectedTags: [],
    })
    const b = await createSavedSearch({
      name: 'B',
      notebookId: null,
      boardId: null,
      query: '',
      filter: EMPTY_FILTER,
      selectedTags: [],
    })

    await reorderSavedSearches([b.id, a.id])

    expect((await listSavedSearches()).map((s) => s.name)).toEqual(['B', 'A'])
  })

  it('renames a saved search', async () => {
    const search = await createSavedSearch({
      name: 'Original',
      notebookId: null,
      boardId: null,
      query: '',
      filter: EMPTY_FILTER,
      selectedTags: [],
    })

    await renameSavedSearch(search.id, 'Renamed')

    const [updated] = await listSavedSearches()
    expect(updated.name).toBe('Renamed')
  })

  it('updates the query and filter of a saved search', async () => {
    const search = await createSavedSearch({
      name: 'Search',
      notebookId: null,
      boardId: null,
      query: 'old',
      filter: EMPTY_FILTER,
      selectedTags: [],
    })
    const newFilter: FilterState = {
      mode: 'and',
      blocks: [{ id: 'block-1', criteria: [{ id: 'crit-1', kind: 'tag', tag: 'work' }] }],
    }

    await updateSavedSearchQuery(search.id, {
      query: 'new',
      filter: newFilter,
      selectedTags: ['work'],
    })

    const [updated] = await listSavedSearches()
    expect(updated.query).toBe('new')
    expect(updated.filter).toEqual(newFilter)
    expect(updated.selectedTags).toEqual(['work'])
  })

  it('persists selected tags on a saved search', async () => {
    const search = await createSavedSearch({
      name: 'Tagged',
      notebookId: null,
      boardId: null,
      query: '',
      filter: EMPTY_FILTER,
      selectedTags: ['urgent', 'work'],
    })

    const [loaded] = await listSavedSearches()
    expect(loaded.id).toBe(search.id)
    expect(loaded.selectedTags).toEqual(['urgent', 'work'])
  })

  it('defaults selectedTags to an empty array for rows written before that field existed', async () => {
    await db.savedSearches.add({
      id: 'legacy-1',
      name: 'Legacy search',
      notebookId: null,
      boardId: null,
      query: 'old',
      filter: EMPTY_FILTER,
      order: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as unknown as SavedSearch)

    const [loaded] = await listSavedSearches()
    expect(loaded.selectedTags).toEqual([])
  })

  it('deletes a saved search', async () => {
    const search = await createSavedSearch({
      name: 'To delete',
      notebookId: null,
      boardId: null,
      query: '',
      filter: EMPTY_FILTER,
      selectedTags: [],
    })

    await deleteSavedSearch(search.id)

    expect(await listSavedSearches()).toEqual([])
  })

  it('reorders saved searches by the given id order, regardless of scope', async () => {
    const a = await createSavedSearch({
      name: 'A',
      notebookId: null,
      boardId: null,
      query: '',
      filter: EMPTY_FILTER,
      selectedTags: [],
    })
    const b = await createSavedSearch({
      name: 'B',
      notebookId: 'notebook-1',
      boardId: null,
      query: '',
      filter: EMPTY_FILTER,
      selectedTags: [],
    })
    const c = await createSavedSearch({
      name: 'C',
      notebookId: null,
      boardId: null,
      query: '',
      filter: EMPTY_FILTER,
      selectedTags: [],
    })

    await reorderSavedSearches([c.id, a.id, b.id])

    const ordered = await listSavedSearches()
    expect(ordered.map((s) => s.name)).toEqual(['C', 'A', 'B'])
    expect(ordered.map((s) => s.order)).toEqual([0, 1, 2])
  })

  it('does not error when a saved search references a note type or property that no longer exists', async () => {
    const staleFilter: FilterState = {
      mode: 'and',
      blocks: [
        { id: 'block-1', criteria: [{ id: 'crit-1', kind: 'noteType', noteTypeId: 'gone' }] },
      ],
    }

    const search = await createSavedSearch({
      name: 'Stale reference',
      notebookId: null,
      boardId: null,
      query: '',
      filter: staleFilter,
      selectedTags: [],
    })

    const [loaded] = await listSavedSearches()
    expect(loaded.id).toBe(search.id)
    expect(loaded.filter).toEqual(staleFilter)
  })
})
