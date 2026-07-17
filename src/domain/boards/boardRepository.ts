import { db } from '../../db/db'
import type { Board } from '../entities.types'

// See notebookRepository.listNotebooksByFolder for why this is a filter, not a `.where().equals(null)`.
export async function listBoardsByFolder(folderId: string | null): Promise<Board[]> {
  return db.boards.filter((board) => board.folderId === folderId).toArray()
}
