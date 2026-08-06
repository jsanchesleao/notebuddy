import type { SavedSearch } from '../../domain/entities.types'

// Mirrors reorderBlocks.ts's computeMoveIndices convention: a pure function the drag-end
// handler can call, kept separate so the reorder math is testable without simulating a dnd-kit
// pointer gesture.
export function computeSavedSearchOrder(
  savedSearches: SavedSearch[],
  activeId: string,
  overId: string,
): string[] | null {
  if (activeId === overId) return null

  const fromIndex = savedSearches.findIndex((search) => search.id === activeId)
  const toIndex = savedSearches.findIndex((search) => search.id === overId)
  if (fromIndex === -1 || toIndex === -1) return null

  const reordered = [...savedSearches]
  const [moved] = reordered.splice(fromIndex, 1)
  reordered.splice(toIndex, 0, moved)

  return reordered.map((search) => search.id)
}
