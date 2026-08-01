import { db } from '../../db/db'
import { createId } from '../ids'
import { deleteNotebooksByFolderId } from '../notebooks/notebookRepository'
import { deleteBoardsByFolderId } from '../boards/boardRepository'
import { runCascadeDelete } from '../cascadeDelete'
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

export class FolderMoveError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'FolderMoveError'
  }
}

export async function listFolderAncestors(folderId: string): Promise<Folder[]> {
  const chain: Folder[] = []
  const folder = await db.folders.get(folderId)
  let parentId = folder?.parentFolderId ?? null

  while (parentId) {
    const parent = await db.folders.get(parentId)
    if (!parent) break
    chain.unshift(parent)
    parentId = parent.parentFolderId
  }

  return chain
}

export async function moveFolder(
  folderId: string,
  newParentFolderId: string | null,
): Promise<void> {
  if (newParentFolderId === folderId) {
    throw new FolderMoveError('A folder cannot be moved into itself')
  }

  if (newParentFolderId !== null) {
    const ancestors = await listFolderAncestors(newParentFolderId)
    if (ancestors.some((ancestor) => ancestor.id === folderId)) {
      throw new FolderMoveError('Cannot move a folder into one of its own descendants')
    }
  }

  await db.folders.update(folderId, { parentFolderId: newParentFolderId })
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
  await runCascadeDelete({
    tables: [db.folders, db.notebooks, db.notes, db.boards, db.yjsUpdates],
    run: async () => {
      const folderIds = await collectDescendantFolderIds(id)

      for (const folderId of folderIds) {
        await deleteNotebooksByFolderId(folderId)
        await deleteBoardsByFolderId(folderId)
      }

      await db.folders.bulkDelete(folderIds)
    },
  })
}
