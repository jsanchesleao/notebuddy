import * as Y from 'yjs'
import { appendYDocUpdate, loadYDoc } from '../yjs/yjsDocStore'

export interface CardOrderEntry {
  noteId: string
  columnId: string
}

// A single flat array of {noteId, columnId} entries holds every card on the board — a
// card's position within its column is its relative order among same-columnId entries,
// mirroring noteBlocksStore's single-array-of-maps approach rather than one Y.Array per column.
export function getCardOrderArray(doc: Y.Doc): Y.Array<Y.Map<unknown>> {
  return doc.getArray<Y.Map<unknown>>('cardOrder')
}

export function snapshotCardOrder(doc: Y.Doc): CardOrderEntry[] {
  return getCardOrderArray(doc)
    .toArray()
    .map((map) => map.toJSON() as CardOrderEntry)
}

export async function loadBoardCards(
  docId: string,
): Promise<{ doc: Y.Doc; cardOrder: CardOrderEntry[] }> {
  const doc = await loadYDoc(docId)
  return { doc, cardOrder: snapshotCardOrder(doc) }
}

function entryToYMap(entry: CardOrderEntry): Y.Map<unknown> {
  return new Y.Map(Object.entries(entry))
}

function findCardIndex(array: Y.Array<Y.Map<unknown>>, noteId: string): number {
  return array.toArray().findIndex((map) => map.get('noteId') === noteId)
}

// Finds the array index to insert at so the new entry lands at `toIndex` among entries that
// already share `columnId` (a position within that column, not the full array) — falls back
// to the end of the array when `toIndex` is at or past that column's current card count.
function resolveColumnInsertIndex(
  array: Y.Array<Y.Map<unknown>>,
  columnId: string,
  toIndex: number,
): number {
  const entries = array.toArray()
  let seen = 0
  for (let i = 0; i < entries.length; i++) {
    if (entries[i].get('columnId') !== columnId) continue
    if (seen === toIndex) return i
    seen += 1
  }
  return array.length
}

async function mutateAndPersist(docId: string, doc: Y.Doc, mutate: () => void): Promise<void> {
  const before = Y.encodeStateVector(doc)
  doc.transact(mutate)
  await appendYDocUpdate(docId, doc, Y.encodeStateAsUpdate(doc, before))
}

export async function appendCard(
  docId: string,
  doc: Y.Doc,
  noteId: string,
  columnId: string,
): Promise<void> {
  await mutateAndPersist(docId, doc, () => {
    const array = getCardOrderArray(doc)
    array.insert(array.length, [entryToYMap({ noteId, columnId })])
  })
}

export async function moveCard(
  docId: string,
  doc: Y.Doc,
  noteId: string,
  toColumnId: string,
  toIndex: number,
): Promise<void> {
  await mutateAndPersist(docId, doc, () => {
    const array = getCardOrderArray(doc)
    const fromIndex = findCardIndex(array, noteId)
    if (fromIndex !== -1) {
      array.delete(fromIndex, 1)
    }

    const insertIndex = resolveColumnInsertIndex(array, toColumnId, toIndex)
    array.insert(insertIndex, [entryToYMap({ noteId, columnId: toColumnId })])
  })
}

export async function removeCard(docId: string, doc: Y.Doc, noteId: string): Promise<void> {
  await mutateAndPersist(docId, doc, () => {
    const array = getCardOrderArray(doc)
    const index = findCardIndex(array, noteId)
    if (index === -1) return

    array.delete(index, 1)
  })
}
