import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../../db/db'
import { createNote } from '../notes/noteRepository'
import { appendBlock } from '../blocks/noteBlocksStore'
import { loadYDoc } from '../yjs/yjsDocStore'
import { createId } from '../ids'
import {
  indexNote,
  rebuildSearchIndex,
  removeNoteFromIndex,
  resetSearchIndexForTests,
  searchNotes,
} from './searchIndexStore'
import type { Note } from '../entities.types'

function buildNote(overrides: Partial<Note> = {}): Note {
  const now = new Date().toISOString()
  return {
    id: createId(),
    notebookId: null,
    boardId: null,
    noteTypeId: null,
    title: 'Untitled',
    metadata: { tags: [], createdAt: now, updatedAt: now, properties: {} },
    blockDocId: createId(),
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

beforeEach(async () => {
  await db.notes.clear()
  await db.yjsUpdates.clear()
  resetSearchIndexForTests()
})

describe('searchNotes — empty query semantics', () => {
  it('returns null for an empty or whitespace-only query, distinct from "no results"', async () => {
    expect(await searchNotes('')).toBeNull()
    expect(await searchNotes('   ')).toBeNull()
  })
})

describe('indexNote / removeNoteFromIndex / searchNotes', () => {
  it('finds a note by title, tags, or block content after indexing', async () => {
    const note = buildNote({
      title: 'Weekly Planning',
      metadata: {
        tags: ['work'],
        createdAt: '',
        updatedAt: '',
        properties: {},
      },
    })
    indexNote(note, 'roadmap notes for the team')

    expect(await searchNotes('plan')).toEqual([note.id])
    expect(await searchNotes('work')).toEqual([note.id])
    expect(await searchNotes('roadmap')).toEqual([note.id])
    expect(await searchNotes('nonexistent')).toEqual([])
  })

  it('finds a note by stringified property values', async () => {
    const note = buildNote({
      metadata: {
        tags: [],
        createdAt: '',
        updatedAt: '',
        properties: {
          status: { typeRef: { kind: 'primitive', primitive: 'text' }, value: 'blocked' },
        },
      },
    })
    indexNote(note, '')

    expect(await searchNotes('blocked')).toEqual([note.id])
  })

  it('removes a note from the index so it no longer matches', async () => {
    const note = buildNote({ title: 'Removable' })
    indexNote(note, '')
    expect(await searchNotes('removable')).toEqual([note.id])

    removeNoteFromIndex(note.id)
    expect(await searchNotes('removable')).toEqual([])
  })

  it('re-indexing preserves previously indexed block text when blockText is omitted', async () => {
    const note = buildNote({ title: 'Original title' })
    indexNote(note, 'unique block content here')
    expect(await searchNotes('unique')).toEqual([note.id])

    const renamed = { ...note, title: 'Renamed title' }
    indexNote(renamed)

    expect(await searchNotes('unique')).toEqual([note.id])
    expect(await searchNotes('renamed')).toEqual([note.id])
  })
})

describe('searchNotes — scope filtering', () => {
  it('intersects match ids against notes in the given notebook/board', async () => {
    const inNotebook = buildNote({ title: 'Scoped match', notebookId: 'notebook-1' })
    const inOtherNotebook = buildNote({ title: 'Scoped match', notebookId: 'notebook-2' })
    const onBoard = buildNote({ title: 'Scoped match', boardId: 'board-1' })
    await db.notes.bulkAdd([inNotebook, inOtherNotebook, onBoard])
    indexNote(inNotebook, '')
    indexNote(inOtherNotebook, '')
    indexNote(onBoard, '')

    expect(await searchNotes('scoped', { notebookId: 'notebook-1' })).toEqual([inNotebook.id])
    expect(await searchNotes('scoped', { boardId: 'board-1' })).toEqual([onBoard.id])
  })
})

describe('rebuildSearchIndex', () => {
  it('rebuilds the index from Dexie notes plus their Yjs block content', async () => {
    const note = await createNote({ notebookId: null, title: 'Rebuilt note' })
    const doc = await loadYDoc(note.blockDocId)
    await appendBlock(note.blockDocId, doc, {
      type: 'code',
      id: createId(),
      language: 'text',
      code: 'distinctive block phrase',
    })

    resetSearchIndexForTests()
    expect(await searchNotes('distinctive')).toEqual([])

    await rebuildSearchIndex()

    expect(await searchNotes('rebuilt')).toEqual([note.id])
    expect(await searchNotes('distinctive')).toEqual([note.id])
  })
})
