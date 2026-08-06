import { db } from '../../db/db'
import { createId } from '../ids'
import type { FilterState } from '../notes/noteFilter.types'
import type { SavedSearch } from '../entities.types'

export interface CreateSavedSearchInput {
  name: string
  notebookId: string | null
  boardId: string | null
  query: string
  filter: FilterState
}

export async function createSavedSearch(input: CreateSavedSearchInput): Promise<SavedSearch> {
  const existing = await db.savedSearches.toArray()
  const now = new Date().toISOString()

  const savedSearch: SavedSearch = {
    id: createId(),
    name: input.name,
    notebookId: input.notebookId,
    boardId: input.boardId,
    query: input.query,
    filter: input.filter,
    order: existing.length,
    createdAt: now,
    updatedAt: now,
  }

  await db.savedSearches.add(savedSearch)
  return savedSearch
}

export async function listSavedSearches(): Promise<SavedSearch[]> {
  const all = await db.savedSearches.toArray()
  return all.sort((a, b) => a.order - b.order)
}

export async function renameSavedSearch(id: string, name: string): Promise<void> {
  await db.savedSearches.update(id, { name, updatedAt: new Date().toISOString() })
}

export async function updateSavedSearchQuery(
  id: string,
  input: { query: string; filter: FilterState },
): Promise<void> {
  await db.savedSearches.update(id, {
    query: input.query,
    filter: input.filter,
    updatedAt: new Date().toISOString(),
  })
}

// Persists a manually dragged reorder — orderedIds is the full list of saved search ids in
// their new display order, one flat sequence regardless of scope (matches the flat Sidebar
// list). Mirrors boardRepository.reorderColumns' index-move-and-persist semantics, but this
// reorders separate top-level rows rather than one embedded array on a single row.
export async function reorderSavedSearches(orderedIds: string[]): Promise<void> {
  await db.transaction('rw', db.savedSearches, async () => {
    await Promise.all(orderedIds.map((id, index) => db.savedSearches.update(id, { order: index })))
  })
}

export async function deleteSavedSearch(id: string): Promise<void> {
  await db.savedSearches.delete(id)
}
