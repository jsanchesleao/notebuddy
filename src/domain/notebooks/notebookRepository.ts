import { db } from '../../db/db'
import { createId } from '../ids'
import { deleteNotesByNotebookId } from '../notes/noteRepository'
import { runCascadeDelete } from '../cascadeDelete'
import { createYDoc } from '../yjs/yjsDocStore'
import { deleteUpdateRows } from '../yjs/yjsUpdatesTable'
import type { Notebook } from '../entities.types'

export interface CreateNotebookInput {
  folderId: string | null
  title: string
}

export async function createNotebook(input: CreateNotebookInput): Promise<Notebook> {
  const { docId: stickyNotesDocId } = createYDoc()
  const notebook: Notebook = {
    id: createId(),
    folderId: input.folderId,
    title: input.title,
    defaultNoteTypeId: null,
    encryption: null,
    stickyNotesDocId,
  }

  await db.notebooks.add(notebook)
  return notebook
}

export async function getNotebook(id: string): Promise<Notebook | undefined> {
  return db.notebooks.get(id)
}

// IndexedDB cannot index `null` values, so `.where().equals(null)` would throw for
// root-level notebooks. A table-scan filter keeps the `string | null` type from spec.md
// without a sentinel-value workaround; fine at Phase 1 scale (indexed .where() is still
// used below for cascade deletes, which are always scoped to a concrete folder id).
export async function listNotebooksByFolder(folderId: string | null): Promise<Notebook[]> {
  return db.notebooks.filter((notebook) => notebook.folderId === folderId).toArray()
}

export async function renameNotebook(id: string, title: string): Promise<void> {
  await db.notebooks.update(id, { title })
}

export async function deleteNotebook(id: string): Promise<void> {
  await runCascadeDelete({
    tables: [db.notebooks, db.notes, db.yjsUpdates],
    run: async () => {
      const notebook = await db.notebooks.get(id)
      await deleteNotesByNotebookId(id)
      if (notebook) await deleteUpdateRows(notebook.stickyNotesDocId)
      await db.notebooks.delete(id)
    },
  })
}

export async function deleteNotebooksByFolderId(folderId: string): Promise<void> {
  await runCascadeDelete({
    tables: [db.notebooks, db.notes, db.yjsUpdates],
    run: async () => {
      const notebooks = await db.notebooks.where('folderId').equals(folderId).toArray()

      for (const notebook of notebooks) {
        await deleteNotesByNotebookId(notebook.id)
        await deleteUpdateRows(notebook.stickyNotesDocId)
      }

      await db.notebooks.where('folderId').equals(folderId).delete()
    },
  })
}
