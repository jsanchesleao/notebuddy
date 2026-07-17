import { db } from '../../db/db'
import { createId } from '../ids'
import { deleteNotebooksByFolderId } from '../notebooks/notebookRepository'
import type { Folder } from '../entities.types'

export interface CreateFolderInput {
  parentFolderId: string | null
  title: string
}

export async function createFolder(input: CreateFolderInput): Promise<Folder> {
  const folder: Folder = {
    id: createId(),
    parentFolderId: input.parentFolderId,
    title: input.title,
  }

  await db.folders.add(folder)
  return folder
}

export async function getFolder(id: string): Promise<Folder | undefined> {
  return db.folders.get(id)
}

// See notebookRepository.listNotebooksByFolder for why this is a filter, not a `.where().equals(null)`.
export async function listFoldersByParent(parentFolderId: string | null): Promise<Folder[]> {
  return db.folders.filter((folder) => folder.parentFolderId === parentFolderId).toArray()
}

export async function renameFolder(id: string, title: string): Promise<void> {
  await db.folders.update(id, { title })
}

async function collectDescendantFolderIds(rootId: string): Promise<string[]> {
  const all = [rootId]
  const children = await db.folders.where('parentFolderId').equals(rootId).toArray()

  for (const child of children) {
    all.push(...(await collectDescendantFolderIds(child.id)))
  }

  return all
}

export async function deleteFolder(id: string): Promise<void> {
  await db.transaction(
    'rw',
    db.folders,
    db.notebooks,
    db.notes,
    db.boards,
    db.yjsUpdates,
    async () => {
      const folderIds = await collectDescendantFolderIds(id)

      for (const folderId of folderIds) {
        await deleteNotebooksByFolderId(folderId)
        await db.boards.where('folderId').equals(folderId).delete()
      }

      await db.folders.bulkDelete(folderIds)
    },
  )
}
