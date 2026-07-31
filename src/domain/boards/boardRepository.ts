import { db } from '../../db/db'
import { deleteNotesByBoardId } from '../notes/noteRepository'
import { runCascadeDelete } from '../cascadeDelete'
import type { Board } from '../entities.types'

export async function getBoard(id: string): Promise<Board | undefined> {
  return db.boards.get(id)
}

// See notebookRepository.listNotebooksByFolder for why this is a filter, not a `.where().equals(null)`.
export async function listBoardsByFolder(folderId: string | null): Promise<Board[]> {
  return db.boards.filter((board) => board.folderId === folderId).toArray()
}

export async function deleteBoard(id: string): Promise<void> {
  await runCascadeDelete({
    tables: [db.boards, db.notes, db.yjsUpdates],
    run: async () => {
      await deleteNotesByBoardId(id)
      await db.boards.delete(id)
    },
  })
}

export async function deleteBoardsByFolderId(folderId: string): Promise<void> {
  await runCascadeDelete({
    tables: [db.boards, db.notes, db.yjsUpdates],
    run: async () => {
      const boards = await db.boards.where('folderId').equals(folderId).toArray()

      for (const board of boards) {
        await deleteNotesByBoardId(board.id)
      }

      await db.boards.where('folderId').equals(folderId).delete()
    },
  })
}
