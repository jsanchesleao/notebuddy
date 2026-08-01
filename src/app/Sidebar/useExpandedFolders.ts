import { useCallback, useEffect, useState } from 'react'

const STORAGE_KEY = 'notebuddy:sidebar:expandedFolderIds'

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

export function useExpandedFolders() {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(readStoredIds)

  const toggle = useCallback((folderId: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(folderId)) next.delete(folderId)
      else next.add(folderId)
      persist(next)
      return next
    })
  }, [])

  // Expands every id in `folderIds` without collapsing anything already expanded —
  // used to reveal the active folder's ancestor chain when navigating directly to it.
  const expandAll = useCallback((folderIds: string[]) => {
    if (folderIds.length === 0) return
    setExpandedIds((prev) => {
      const next = new Set(prev)
      let changed = false
      for (const id of folderIds) {
        if (!next.has(id)) {
          next.add(id)
          changed = true
        }
      }
      if (!changed) return prev
      persist(next)
      return next
    })
  }, [])

  return { expandedIds, toggle, expandAll }
}

// Auto-expands `folderIds` (the active folder's ancestor chain, plus itself) once per
// distinct active-folder chain, so navigating to a folder reveals it without manual
// clicks. Keyed on a joined string rather than `folderIds` itself, since callers pass a
// fresh array every render — keying on array identity would re-fire (and re-expand) on
// every render, fighting a manual collapse of an ancestor folder.
export function useAutoExpandActiveFolder(
  expandAll: (folderIds: string[]) => void,
  folderIds: string[],
) {
  const key = folderIds.join(',')
  useEffect(() => {
    if (folderIds.length > 0) expandAll(folderIds)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally keyed on `key`, not `folderIds` identity
  }, [expandAll, key])
}
