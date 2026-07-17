import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../../db/db'
import {
  createNotebook,
  deleteNotebook,
  getNotebook,
  listNotebooksByFolder,
  renameNotebook,
} from './notebookRepository'
import { createNote } from '../notes/noteRepository'
import { createFolder } from '../folders/folderRepository'

beforeEach(async () => {
  await db.notebooks.clear()
  await db.notes.clear()
  await db.folders.clear()
  await db.yjsUpdates.clear()
})

describe('notebookRepository', () => {
  it('creates a notebook with no default note type or encryption', async () => {
    const folder = await createFolder({ parentFolderId: null, title: 'Folder' })
    const notebook = await createNotebook({ folderId: folder.id, title: 'Notebook' })

    expect(notebook.folderId).toBe(folder.id)
    expect(notebook.defaultNoteTypeId).toBeNull()
    expect(notebook.encryption).toBeNull()
    expect(await getNotebook(notebook.id)).toEqual(notebook)
  })

  it('lists notebooks scoped to a folder, including root (null) notebooks', async () => {
    const folder = await createFolder({ parentFolderId: null, title: 'Folder' })
    await createNotebook({ folderId: folder.id, title: 'In folder' })
    await createNotebook({ folderId: null, title: 'At root' })

    expect((await listNotebooksByFolder(folder.id)).map((n) => n.title)).toEqual(['In folder'])
    expect((await listNotebooksByFolder(null)).map((n) => n.title)).toEqual(['At root'])
  })

  it('renames a notebook', async () => {
    const notebook = await createNotebook({ folderId: null, title: 'Old' })
    await renameNotebook(notebook.id, 'New')
    expect((await getNotebook(notebook.id))?.title).toBe('New')
  })

  it('cascades delete to the notebook’s notes and their yjsUpdates rows', async () => {
    const notebook = await createNotebook({ folderId: null, title: 'Notebook' })
    const note1 = await createNote({ notebookId: notebook.id, title: 'Note 1' })
    const note2 = await createNote({ notebookId: notebook.id, title: 'Note 2' })

    await deleteNotebook(notebook.id)

    expect(await getNotebook(notebook.id)).toBeUndefined()
    expect(await db.notes.get(note1.id)).toBeUndefined()
    expect(await db.notes.get(note2.id)).toBeUndefined()
    expect(await db.yjsUpdates.where('docId').equals(note1.blockDocId).count()).toBe(0)
    expect(await db.yjsUpdates.where('docId').equals(note2.blockDocId).count()).toBe(0)
  })
})
