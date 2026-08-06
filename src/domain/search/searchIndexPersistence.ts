import type { Document } from 'flexsearch'
import { db } from '../../db/db'
import type { SearchDocument } from './searchIndex.types'

// Mirrors the app layer's SAVE_DEBOUNCE_MS convention (blockEditing.constants.ts) without
// importing across the domain->app layering boundary for a single shared number.
const PERSIST_DEBOUNCE_MS = 500

let persistTimer: ReturnType<typeof setTimeout> | undefined

export function scheduleSearchIndexPersist(index: Document<SearchDocument>): void {
  if (persistTimer) clearTimeout(persistTimer)
  persistTimer = setTimeout(() => {
    void persistSearchIndex(index)
  }, PERSIST_DEBOUNCE_MS)
}

export async function persistSearchIndex(index: Document<SearchDocument>): Promise<void> {
  const chunks: { key: string; data: string }[] = []
  index.export((key: string, data: string) => {
    chunks.push({ key, data })
  })

  await db.transaction('rw', db.searchIndexSnapshot, async () => {
    await db.searchIndexSnapshot.clear()
    await db.searchIndexSnapshot.bulkPut(chunks)
  })
}

// Returns false (leaving `index` untouched) on a missing or corrupt snapshot, so the caller
// can fall back to a full rebuild.
export async function loadSearchIndexSnapshot(index: Document<SearchDocument>): Promise<boolean> {
  const rows = await db.searchIndexSnapshot.toArray()
  if (rows.length === 0) return false

  try {
    for (const row of rows) {
      index.import(row.key, row.data)
    }
    return true
  } catch {
    return false
  }
}
