import { db } from '../../db/db'
import { createId } from '../ids'
import { createYDoc } from '../yjs/yjsDocStore'
import { deleteUpdateRows } from '../yjs/yjsUpdatesTable'
import type { Note } from '../entities.types'

export interface CreateNoteInput {
  notebookId: string | null
  boardId?: string | null
  title: string
}

export async function createNote(input: CreateNoteInput): Promise<Note> {
  const now = new Date().toISOString()
  const { docId } = createYDoc()

  const note: Note = {
    id: createId(),
    notebookId: input.notebookId,
    boardId: input.boardId ?? null,
    noteTypeId: null,
    title: input.title,
    metadata: {
      tags: [],
      createdAt: now,
      updatedAt: now,
      properties: {},
    },
    blockDocId: docId,
    createdAt: now,
    updatedAt: now,
  }

  await db.notes.add(note)
  return note
}

export async function getNote(id: string): Promise<Note | undefined> {
  return db.notes.get(id)
}

export async function listNotesByNotebook(notebookId: string): Promise<Note[]> {
  return db.notes.where('notebookId').equals(notebookId).toArray()
}

export async function renameNote(id: string, title: string): Promise<void> {
  const now = new Date().toISOString()
  await db.notes.update(id, {
    title,
    updatedAt: now,
    'metadata.updatedAt': now,
  })
}

export async function deleteNote(id: string): Promise<void> {
  await db.transaction('rw', db.notes, db.yjsUpdates, async () => {
    const note = await db.notes.get(id)
    if (!note) return

    await deleteUpdateRows(note.blockDocId)
    await db.notes.delete(id)
  })
}

export async function deleteNotesByNotebookId(notebookId: string): Promise<void> {
  await db.transaction('rw', db.notes, db.yjsUpdates, async () => {
    const notes = await db.notes.where('notebookId').equals(notebookId).toArray()

    for (const note of notes) {
      await deleteUpdateRows(note.blockDocId)
    }

    await db.notes.where('notebookId').equals(notebookId).delete()
  })
}
