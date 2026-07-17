import { db } from '../../db/db'

export async function appendUpdateRow(docId: string, update: Uint8Array): Promise<void> {
  await db.yjsUpdates.add({ docId, update, createdAt: Date.now() })
}

export async function getUpdateRows(docId: string): Promise<Uint8Array[]> {
  const rows = await db.yjsUpdates.where('docId').equals(docId).sortBy('id')
  return rows.map((row) => row.update)
}

export async function countUpdateRows(docId: string): Promise<number> {
  return db.yjsUpdates.where('docId').equals(docId).count()
}

export async function deleteUpdateRows(docId: string): Promise<void> {
  await db.yjsUpdates.where('docId').equals(docId).delete()
}

export async function replaceUpdateRows(docId: string, update: Uint8Array): Promise<void> {
  await db.transaction('rw', db.yjsUpdates, async () => {
    await deleteUpdateRows(docId)
    await appendUpdateRow(docId, update)
  })
}
