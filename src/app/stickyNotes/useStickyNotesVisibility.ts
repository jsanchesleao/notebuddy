import { useCallback, useState } from 'react'

const STORAGE_KEY = 'notebuddy:stickyNotes:visibleEntityIds'

function readStoredIds(): Set<string> {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set()
  } catch {
    return new Set()
  }
}

function persist(ids: Set<string>): void {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]))
}

// Per-entity (note/board/notebook id) show/hide toggle for the sticky-note overlay,
// defaulting to hidden until first toggled on for that entity — mirrors
// useExpandedFolders.ts's plain-localStorage id-set approach.
export function useStickyNotesVisibility(entityId: string) {
  const [visibleIds, setVisibleIds] = useState<Set<string>>(readStoredIds)

  const toggleVisibility = useCallback(() => {
    setVisibleIds((prev) => {
      const next = new Set(prev)
      if (next.has(entityId)) next.delete(entityId)
      else next.add(entityId)
      persist(next)
      return next
    })
  }, [entityId])

  return { visible: visibleIds.has(entityId), toggleVisibility }
}
