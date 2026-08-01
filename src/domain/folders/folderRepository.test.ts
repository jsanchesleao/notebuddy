import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../../db/db'
import {
  createFolder,
  deleteFolder,
  FolderMoveError,
  getFolder,
  listFolderAncestors,
  listFoldersByParent,
  moveFolder,
  renameFolder,
} from './folderRepository'
import { createNotebook } from '../notebooks/notebookRepository'
import { createNote } from '../notes/noteRepository'
import { createId } from '../ids'
import { createYDoc } from '../yjs/yjsDocStore'
import type { Board } from '../entities.types'

beforeEach(async () => {
  await db.folders.clear()
  await db.notebooks.clear()
  await db.notes.clear()
  await db.boards.clear()
  await db.yjsUpdates.clear()
})

describe('folderRepository', () => {
  it('creates root and nested folders', async () => {
    const root = await createFolder({ parentFolderId: null, title: 'Root' })
    const child = await createFolder({ parentFolderId: root.id, title: 'Child' })

    expect(await getFolder(root.id)).toEqual(root)
    expect(child.parentFolderId).toBe(root.id)
  })

  it('lists folders scoped to a parent, including root (null) folders', async () => {
    const root = await createFolder({ parentFolderId: null, title: 'Root' })
    await createFolder({ parentFolderId: root.id, title: 'Child' })
    await createFolder({ parentFolderId: null, title: 'Other root' })

    expect((await listFoldersByParent(root.id)).map((f) => f.title)).toEqual(['Child'])
    expect((await listFoldersByParent(null)).map((f) => f.title).sort()).toEqual([
      'Other root',
      'Root',
    ])
  })

  it('renames a folder', async () => {
    const folder = await createFolder({ parentFolderId: null, title: 'Old' })
    await renameFolder(folder.id, 'New')
    expect((await getFolder(folder.id))?.title).toBe('New')
  })

  it('returns undefined for a missing folder id', async () => {
    expect(await getFolder('does-not-exist')).toBeUndefined()
  })

  it('deletes a leaf folder with no descendants', async () => {
    const folder = await createFolder({ parentFolderId: null, title: 'Leaf' })
    await deleteFolder(folder.id)
    expect(await getFolder(folder.id)).toBeUndefined()
  })

  it('cascades delete through nested folders, notebooks, and notes', async () => {
    const root = await createFolder({ parentFolderId: null, title: 'Root' })
    const child = await createFolder({ parentFolderId: root.id, title: 'Child' })
    const notebookInRoot = await createNotebook({ folderId: root.id, title: 'Root notebook' })
    const notebookInChild = await createNotebook({ folderId: child.id, title: 'Child notebook' })
    const noteInRoot = await createNote({ notebookId: notebookInRoot.id, title: 'Root note' })
    const noteInChild = await createNote({ notebookId: notebookInChild.id, title: 'Child note' })

    await deleteFolder(root.id)

    expect(await getFolder(root.id)).toBeUndefined()
    expect(await getFolder(child.id)).toBeUndefined()
    expect(await db.notebooks.get(notebookInRoot.id)).toBeUndefined()
    expect(await db.notebooks.get(notebookInChild.id)).toBeUndefined()
    expect(await db.notes.get(noteInRoot.id)).toBeUndefined()
    expect(await db.notes.get(noteInChild.id)).toBeUndefined()
    expect(await db.yjsUpdates.where('docId').equals(noteInRoot.blockDocId).count()).toBe(0)
    expect(await db.yjsUpdates.where('docId').equals(noteInChild.blockDocId).count()).toBe(0)
  })

  it('cascades delete through a board and its notes and yjsUpdates rows', async () => {
    const root = await createFolder({ parentFolderId: null, title: 'Root' })
    const board: Board = {
      id: createId(),
      folderId: root.id,
      title: 'Board',
      columns: [],
      cardsDocId: createYDoc().docId,
      statusTypeId: null,
    }
    await db.boards.add(board)
    const cardNote = await createNote({ notebookId: null, boardId: board.id, title: 'Card' })

    await deleteFolder(root.id)

    expect(await db.boards.get(board.id)).toBeUndefined()
    expect(await db.notes.get(cardNote.id)).toBeUndefined()
    expect(await db.yjsUpdates.where('docId').equals(cardNote.blockDocId).count()).toBe(0)
  })

  it('does not affect folders outside the deleted subtree', async () => {
    const root = await createFolder({ parentFolderId: null, title: 'Root' })
    const sibling = await createFolder({ parentFolderId: null, title: 'Sibling' })

    await deleteFolder(root.id)

    expect(await getFolder(sibling.id)).toEqual(sibling)
  })

  describe('listFolderAncestors', () => {
    it('returns the root-first ancestor chain, excluding the folder itself', async () => {
      const root = await createFolder({ parentFolderId: null, title: 'Root' })
      const mid = await createFolder({ parentFolderId: root.id, title: 'Mid' })
      const leaf = await createFolder({ parentFolderId: mid.id, title: 'Leaf' })

      expect((await listFolderAncestors(leaf.id)).map((f) => f.title)).toEqual(['Root', 'Mid'])
    })

    it('returns an empty chain for a root-level folder', async () => {
      const root = await createFolder({ parentFolderId: null, title: 'Root' })
      expect(await listFolderAncestors(root.id)).toEqual([])
    })
  })

  describe('moveFolder', () => {
    it('reparents a folder to a new parent', async () => {
      const a = await createFolder({ parentFolderId: null, title: 'A' })
      const b = await createFolder({ parentFolderId: null, title: 'B' })

      await moveFolder(b.id, a.id)

      expect((await getFolder(b.id))?.parentFolderId).toBe(a.id)
      expect((await listFoldersByParent(a.id)).map((f) => f.title)).toEqual(['B'])
    })

    it('moves a folder back to the top level', async () => {
      const root = await createFolder({ parentFolderId: null, title: 'Root' })
      const child = await createFolder({ parentFolderId: root.id, title: 'Child' })

      await moveFolder(child.id, null)

      expect((await getFolder(child.id))?.parentFolderId).toBeNull()
    })

    it('rejects moving a folder into itself', async () => {
      const folder = await createFolder({ parentFolderId: null, title: 'Folder' })
      await expect(moveFolder(folder.id, folder.id)).rejects.toThrow(FolderMoveError)
    })

    it('rejects moving a folder into one of its own descendants', async () => {
      const root = await createFolder({ parentFolderId: null, title: 'Root' })
      const child = await createFolder({ parentFolderId: root.id, title: 'Child' })
      const grandchild = await createFolder({ parentFolderId: child.id, title: 'Grandchild' })

      await expect(moveFolder(root.id, grandchild.id)).rejects.toThrow(FolderMoveError)
      expect((await getFolder(root.id))?.parentFolderId).toBeNull()
    })
  })
})
