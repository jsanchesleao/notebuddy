import { db } from '../db/db'
import type { Table } from 'dexie'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyTable = Table<any, any>

export interface CascadeDelete {
  tables: AnyTable[]
  // OPFS asset cleanup can't be rolled back by a Dexie transaction, so it always runs
  // before the transaction starts rather than inside it.
  beforeTransaction?: () => Promise<void>
  run: () => Promise<void>
}

// Every cascading delete in the domain layer needs to declare its full affected-table list
// up front — this is the gap that let the folder->board cascade silently skip cleanup
// (see folderRepository.deleteFolder / boardRepository.deleteBoardsByFolderId).
export async function runCascadeDelete({ tables, beforeTransaction, run }: CascadeDelete) {
  if (beforeTransaction) {
    await beforeTransaction()
  }

  await db.transaction('rw', tables, run)
}
