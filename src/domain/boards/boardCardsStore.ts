import * as Y from 'yjs'
import { appendYDocUpdate, loadYDoc } from '../yjs/yjsDocStore'

// A card's column is always derived from its own note's `status` property (see
// groupCardsByColumn) — this array only tracks relative ordering across the whole board as a
// flat list of noteIds, so there's no columnId here that could drift out of sync with status.
export function getCardOrderArray(doc: Y.Doc): Y.Array<string> {
  return doc.getArray<string>('cardOrder')
}

export function snapshotCardOrder(doc: Y.Doc): string[] {
  return getCardOrderArray(doc).toArray()
}

export async function loadBoardCards(docId: string): Promise<{ doc: Y.Doc; cardOrder: string[] }> {
  const doc = await loadYDoc(docId)
  return { doc, cardOrder: snapshotCardOrder(doc) }
}

async function mutateAndPersist(docId: string, doc: Y.Doc, mutate: () => void): Promise<void> {
  const before = Y.encodeStateVector(doc)
  doc.transact(mutate)
  await appendYDocUpdate(docId, doc, Y.encodeStateAsUpdate(doc, before))
}

export async function appendCard(docId: string, doc: Y.Doc, noteId: string): Promise<void> {
  await mutateAndPersist(docId, doc, () => {
    const array = getCardOrderArray(doc)
    array.insert(array.length, [noteId])
  })
}

// Moves `noteId` so it sits immediately before `beforeNoteId` — or at the end when
// `beforeNoteId` is null or no longer present (e.g. dropped onto empty column space).
export async function moveCard(
  docId: string,
  doc: Y.Doc,
  noteId: string,
  beforeNoteId: string | null,
): Promise<void> {
  await mutateAndPersist(docId, doc, () => {
    const array = getCardOrderArray(doc)
    const fromIndex = array.toArray().indexOf(noteId)
    if (fromIndex !== -1) {
      array.delete(fromIndex, 1)
    }

    const remaining = array.toArray()
    const insertIndex = beforeNoteId ? remaining.indexOf(beforeNoteId) : -1
    array.insert(insertIndex === -1 ? array.length : insertIndex, [noteId])
  })
}

export async function removeCard(docId: string, doc: Y.Doc, noteId: string): Promise<void> {
  await mutateAndPersist(docId, doc, () => {
    const array = getCardOrderArray(doc)
    const index = array.toArray().indexOf(noteId)
    if (index === -1) return

    array.delete(index, 1)
  })
}
