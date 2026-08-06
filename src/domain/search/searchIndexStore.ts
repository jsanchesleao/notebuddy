import { Document } from 'flexsearch'
import { db } from '../../db/db'
import { loadNoteBlocks } from '../blocks/noteBlocksStore'
import type { Note, PropertyValueData } from '../entities.types'
import { extractBlocksText } from './extractBlockText'
import { loadSearchIndexSnapshot, scheduleSearchIndexPersist } from './searchIndexPersistence'
import type { SearchDocument } from './searchIndex.types'

function createIndex(): Document<SearchDocument> {
  return new Document<SearchDocument>({
    // 'forward' enables prefix matching (e.g. "plan" finds "Planning") — FlexSearch's default
    // ('strict') only matches whole tokenized words, which reads as broken search quality
    // compared to the substring-based quick search/title filter this replaces.
    tokenize: 'forward',
    document: {
      id: 'noteId',
      index: ['title', 'tags', 'content'],
    },
  })
}

let index = createIndex()

// A note's block text lives in Yjs, not Dexie, so the Dexie-hook-driven sync path
// (searchIndexSync.ts) has no access to it on create/update. This cache remembers the last
// known block text per note (populated by rebuild and by NotePage's own effect) so a
// metadata-only update doesn't blank out previously-indexed block content.
const blockTextCache = new Map<string, string>()

function stringifyPropertyValue(value: PropertyValueData): string {
  if (value === null) return ''
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  if (Array.isArray(value)) return value.map(stringifyPropertyValue).join(' ')
  return Object.values(value).map(stringifyPropertyValue).join(' ')
}

function buildSearchDocument(note: Note, blockText: string): SearchDocument {
  const propertyText = Object.values(note.metadata.properties)
    .map((property) => stringifyPropertyValue(property.value))
    .join(' ')

  return {
    noteId: note.id,
    title: note.title,
    tags: note.metadata.tags.join(' '),
    content: [propertyText, blockText].filter(Boolean).join(' '),
  }
}

// `blockText` omitted means "unknown at this call site" (e.g. the Dexie create/update hooks,
// which only see metadata) — falls back to whatever was last cached for this note, rather than
// wiping it out. Pass an explicit blockText (including '') whenever it's actually known.
export function indexNote(note: Note, blockText?: string): void {
  if (blockText !== undefined) {
    blockTextCache.set(note.id, blockText)
  }

  const document = buildSearchDocument(note, blockTextCache.get(note.id) ?? '')
  if (index.contain(note.id)) {
    index.update(document)
  } else {
    index.add(document)
  }
  scheduleSearchIndexPersist(index)
}

export function removeNoteFromIndex(noteId: string): void {
  blockTextCache.delete(noteId)
  index.remove(noteId)
  scheduleSearchIndexPersist(index)
}

export async function rebuildSearchIndex(): Promise<void> {
  index = createIndex()
  blockTextCache.clear()

  const notes = await db.notes.toArray()
  for (const note of notes) {
    const { blocks } = await loadNoteBlocks(note.blockDocId)
    indexNote(note, extractBlocksText(blocks))
  }
}

export async function initSearchIndex(): Promise<void> {
  const loaded = await loadSearchIndexSnapshot(index)
  if (loaded) return

  await rebuildSearchIndex()
}

// Empty/whitespace query means "no text filter" — distinct from "no results" — so callers can
// preserve the existing quick-search convention where an empty query matches every note.
export async function searchNotes(
  query: string,
  scope?: { notebookId?: string; boardId?: string },
): Promise<string[] | null> {
  const trimmed = query.trim()
  if (trimmed === '') return null

  const results = index.search(trimmed, { enrich: false, merge: true } as const)
  const ids = results.map((result) => String(result.id))

  if (!scope?.notebookId && !scope?.boardId) return ids

  // Direct Dexie queries rather than noteRepository's listNotesByNotebook/listNotesByBoardId —
  // that module transitively imports tagRepository, and this store is imported eagerly from
  // main.tsx/test setup, which would otherwise load tagSearchIndexClient before any test's
  // vi.mock('./tagSearchIndexClient', ...) can intercept it.
  const scopedNotes = scope.notebookId
    ? await db.notes.where('notebookId').equals(scope.notebookId).toArray()
    : await db.notes
        .where('boardId')
        .equals(scope.boardId as string)
        .toArray()
  const scopedIds = new Set(scopedNotes.map((note) => note.id))
  return ids.filter((id) => scopedIds.has(id))
}

export function resetSearchIndexForTests(): void {
  index = createIndex()
  blockTextCache.clear()
}
