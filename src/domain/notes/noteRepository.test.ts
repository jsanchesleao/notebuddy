import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../../db/db'
import { createNote, deleteNote, getNote, listNotesByNotebook, renameNote } from './noteRepository'
import { createNotebook } from '../notebooks/notebookRepository'
import { appendYDocUpdate, loadYDoc } from '../yjs/yjsDocStore'
import * as Y from 'yjs'

beforeEach(async () => {
  await db.notes.clear()
  await db.notebooks.clear()
  await db.yjsUpdates.clear()
})

describe('noteRepository', () => {
  it('creates a note with default metadata and a fresh blockDocId', async () => {
    const notebook = await createNotebook({ folderId: null, title: 'Notebook' })
    const note = await createNote({ notebookId: notebook.id, title: 'My note' })

    expect(note.title).toBe('My note')
    expect(note.notebookId).toBe(notebook.id)
    expect(note.boardId).toBeNull()
    expect(note.noteTypeId).toBeNull()
    expect(note.metadata).toEqual({
      tags: [],
      createdAt: note.createdAt,
      updatedAt: note.updatedAt,
      properties: {},
    })
    expect(note.blockDocId).toBeTruthy()

    const stored = await getNote(note.id)
    expect(stored).toEqual(note)
  })

  it('lists notes scoped to a notebook', async () => {
    const notebookA = await createNotebook({ folderId: null, title: 'A' })
    const notebookB = await createNotebook({ folderId: null, title: 'B' })
    await createNote({ notebookId: notebookA.id, title: 'A1' })
    await createNote({ notebookId: notebookA.id, title: 'A2' })
    await createNote({ notebookId: notebookB.id, title: 'B1' })

    const notesInA = await listNotesByNotebook(notebookA.id)
    expect(notesInA.map((note) => note.title).sort()).toEqual(['A1', 'A2'])
  })

  it('renames a note and bumps updatedAt', async () => {
    const notebook = await createNotebook({ folderId: null, title: 'Notebook' })
    const note = await createNote({ notebookId: notebook.id, title: 'Old title' })

    await renameNote(note.id, 'New title')

    const updated = await getNote(note.id)
    expect(updated?.title).toBe('New title')
    expect(updated?.metadata.updatedAt).toBe(updated?.updatedAt)
  })

  it('deletes a note along with its yjsUpdates rows', async () => {
    const notebook = await createNotebook({ folderId: null, title: 'Notebook' })
    const note = await createNote({ notebookId: notebook.id, title: 'Note' })

    const doc = await loadYDoc(note.blockDocId)
    doc.getMap('meta').set('title', 'content')
    await appendYDocUpdate(note.blockDocId, doc, Y.encodeStateAsUpdate(doc))

    expect(await db.yjsUpdates.where('docId').equals(note.blockDocId).count()).toBeGreaterThan(0)

    await deleteNote(note.id)

    expect(await getNote(note.id)).toBeUndefined()
    expect(await db.yjsUpdates.where('docId').equals(note.blockDocId).count()).toBe(0)
  })
})
