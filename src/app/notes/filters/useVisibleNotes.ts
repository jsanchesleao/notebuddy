import { useEffect, useState } from 'react'
import { filterNotes, noteMatchesTags } from '../../../domain/notes/noteFilterMatch'
import { searchNotes } from '../../../domain/search/searchIndexStore'
import type { CustomDataType, Note } from '../../../domain/entities.types'
import type { FilterState } from '../../../domain/notes/noteFilter.types'

interface UseVisibleNotesArgs {
  notes: Note[]
  filterState: FilterState
  search: string
  selectedTags: string[]
  customTypes: CustomDataType[]
  notebookId?: string
  boardId?: string
}

// filterNotes/searchNotes are index-backed (async), so combining the advanced filter, the
// quick-search box, and the tag picker can't be a plain inline `.filter()` render-time call
// anymore — this recomputes into state whenever any input changes, guarding against a stale
// response landing after a newer one starts (e.g. notes/customTypes changing mid-flight).
export function useVisibleNotes({
  notes,
  filterState,
  search,
  selectedTags,
  customTypes,
  notebookId,
  boardId,
}: UseVisibleNotesArgs): Note[] {
  const [visibleNotes, setVisibleNotes] = useState<Note[]>([])

  useEffect(() => {
    let cancelled = false
    const resolveCustomType = (id: string) => customTypes.find((type) => type.id === id)

    async function compute() {
      const filtered = await filterNotes(notes, filterState, resolveCustomType)
      const searchIds = await searchNotes(search, { notebookId, boardId })
      const next = filtered.filter(
        (note) =>
          (searchIds === null || searchIds.includes(note.id)) &&
          noteMatchesTags(note, selectedTags),
      )
      if (!cancelled) setVisibleNotes(next)
    }

    void compute()
    return () => {
      cancelled = true
    }
  }, [notes, filterState, search, selectedTags, customTypes, notebookId, boardId])

  return visibleNotes
}
