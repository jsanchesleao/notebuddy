import * as Y from 'yjs'
import { createId } from '../ids'
import { COMPACTION_UPDATE_COUNT_THRESHOLD } from './yjsCompaction.constants'
import {
  appendUpdateRow,
  countUpdateRows,
  getUpdateRows,
  replaceUpdateRows,
} from './yjsUpdatesTable'

export function createYDoc(): { docId: string; doc: Y.Doc } {
  return { docId: createId(), doc: new Y.Doc() }
}

export async function loadYDoc(docId: string): Promise<Y.Doc> {
  const doc = new Y.Doc()
  const updates = await getUpdateRows(docId)

  for (const update of updates) {
    Y.applyUpdate(doc, update)
  }

  if (updates.length > COMPACTION_UPDATE_COUNT_THRESHOLD) {
    await compactYDoc(docId, doc)
  }

  return doc
}

export async function appendYDocUpdate(
  docId: string,
  doc: Y.Doc,
  update: Uint8Array,
): Promise<void> {
  await appendUpdateRow(docId, update)

  const rowCount = await countUpdateRows(docId)
  if (rowCount > COMPACTION_UPDATE_COUNT_THRESHOLD) {
    await compactYDoc(docId, doc)
  }
}

export async function compactYDoc(docId: string, doc: Y.Doc): Promise<void> {
  const merged = Y.encodeStateAsUpdate(doc)
  await replaceUpdateRows(docId, merged)
}
