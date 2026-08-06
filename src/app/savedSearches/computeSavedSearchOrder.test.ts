import { describe, expect, it } from 'vitest'
import { computeSavedSearchOrder } from './computeSavedSearchOrder'
import { createId } from '../../domain/ids'
import type { SavedSearch } from '../../domain/entities.types'

function buildSavedSearch(name: string, overrides: Partial<SavedSearch> = {}): SavedSearch {
  const now = new Date().toISOString()
  return {
    id: createId(),
    name,
    notebookId: null,
    boardId: null,
    query: '',
    filter: { mode: 'and', blocks: [] },
    order: 0,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

describe('computeSavedSearchOrder', () => {
  it('moves the dragged id to the drop target position', () => {
    const a = buildSavedSearch('A')
    const b = buildSavedSearch('B')
    const c = buildSavedSearch('C')

    expect(computeSavedSearchOrder([a, b, c], a.id, c.id)).toEqual([b.id, c.id, a.id])
    expect(computeSavedSearchOrder([a, b, c], c.id, a.id)).toEqual([c.id, a.id, b.id])
  })

  it('returns null when dropped on itself', () => {
    const a = buildSavedSearch('A')
    const b = buildSavedSearch('B')
    expect(computeSavedSearchOrder([a, b], a.id, a.id)).toBeNull()
  })

  it('returns null when either id is not found in the list', () => {
    const a = buildSavedSearch('A')
    const b = buildSavedSearch('B')
    expect(computeSavedSearchOrder([a, b], 'missing', b.id)).toBeNull()
    expect(computeSavedSearchOrder([a, b], a.id, 'missing')).toBeNull()
  })
})
