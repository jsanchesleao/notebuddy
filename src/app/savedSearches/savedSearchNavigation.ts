import type { FilterState } from '../../domain/notes/noteFilter.types'
import type { SavedSearch } from '../../domain/entities.types'

// Shape handed to react-router's Link/navigate `state` when running a saved search — read back
// via useLocation().state on NotebookPage/BoardPage/SearchPage to pre-fill their own quick-search
// + filter UI, since none of them persist a query/filter combination in the URL on their own.
export interface SavedSearchNavigationState {
  query?: string
  filter?: FilterState
}

// notebookId/boardId set -> that page's own quick-search + filter UI, pre-filled via router
// state (neither page persists its search/filter in the URL); both null (global) -> /search,
// whose query does round-trip through ?q= — filter still travels via state either way.
export function runPathAndState(savedSearch: SavedSearch): {
  to: string
  state: SavedSearchNavigationState
} {
  if (savedSearch.notebookId) {
    return {
      to: `/notebooks/${savedSearch.notebookId}`,
      state: { query: savedSearch.query, filter: savedSearch.filter },
    }
  }
  if (savedSearch.boardId) {
    return {
      to: `/boards/${savedSearch.boardId}`,
      state: { query: savedSearch.query, filter: savedSearch.filter },
    }
  }
  return {
    to: `/search?q=${encodeURIComponent(savedSearch.query)}`,
    state: { filter: savedSearch.filter },
  }
}
