import * as Y from 'yjs'
import { appendYDocUpdate, loadYDoc } from '../yjs/yjsDocStore'
import type { StickyNote } from '../entities.types'

// A distinct top-level array name from 'blocks' (noteBlocksStore.ts) / card-order data, so
// sticky notes coexist safely in a doc shared with those (Note.blockDocId, Board.cardsDocId).
export function getStickyNotesArray(doc: Y.Doc): Y.Array<Y.Map<unknown>> {
  return doc.getArray<Y.Map<unknown>>('stickyNotes')
}

export function snapshotStickyNotes(doc: Y.Doc): StickyNote[] {
  return getStickyNotesArray(doc)
    .toArray()
    .map((map) => map.toJSON() as StickyNote)
}

export async function loadStickyNotes(
  docId: string,
): Promise<{ doc: Y.Doc; stickyNotes: StickyNote[] }> {
  const doc = await loadYDoc(docId)
  return { doc, stickyNotes: snapshotStickyNotes(doc) }
}

function stickyNoteToYMap(stickyNote: StickyNote): Y.Map<unknown> {
  return new Y.Map(Object.entries(stickyNote))
}

function findStickyNoteIndex(array: Y.Array<Y.Map<unknown>>, stickyNoteId: string): number {
  return array.toArray().findIndex((map) => map.get('id') === stickyNoteId)
}

async function mutateAndPersist(docId: string, doc: Y.Doc, mutate: () => void): Promise<void> {
  const before = Y.encodeStateVector(doc)
  doc.transact(mutate)
  await appendYDocUpdate(docId, doc, Y.encodeStateAsUpdate(doc, before))
}

export async function insertStickyNote(
  docId: string,
  doc: Y.Doc,
  stickyNote: StickyNote,
): Promise<void> {
  await mutateAndPersist(docId, doc, () => {
    const array = getStickyNotesArray(doc)
    array.insert(array.length, [stickyNoteToYMap(stickyNote)])
  })
}

export async function updateStickyNote(
  docId: string,
  doc: Y.Doc,
  stickyNoteId: string,
  patch: Partial<Omit<StickyNote, 'id'>>,
): Promise<void> {
  await mutateAndPersist(docId, doc, () => {
    const array = getStickyNotesArray(doc)
    const index = findStickyNoteIndex(array, stickyNoteId)
    if (index === -1) return

    const map = array.get(index)
    for (const [key, value] of Object.entries(patch)) {
      map.set(key, value)
    }
  })
}

export async function deleteStickyNote(
  docId: string,
  doc: Y.Doc,
  stickyNoteId: string,
): Promise<void> {
  await mutateAndPersist(docId, doc, () => {
    const array = getStickyNotesArray(doc)
    const index = findStickyNoteIndex(array, stickyNoteId)
    if (index === -1) return

    array.delete(index, 1)
  })
}

export async function moveStickyNote(
  docId: string,
  doc: Y.Doc,
  stickyNoteId: string,
  x: number,
  y: number,
): Promise<void> {
  await updateStickyNote(docId, doc, stickyNoteId, { x, y })
}

// Delete+re-append at the array's end, same technique moveBlock uses — array order is
// paint order (last = topmost), so this is how a note visually pops above its siblings.
export async function bringStickyNoteToFront(
  docId: string,
  doc: Y.Doc,
  stickyNoteId: string,
): Promise<void> {
  await mutateAndPersist(docId, doc, () => {
    const array = getStickyNotesArray(doc)
    const index = findStickyNoteIndex(array, stickyNoteId)
    if (index === -1 || index === array.length - 1) return

    const stickyNote = array.get(index).toJSON() as StickyNote
    array.delete(index, 1)
    array.insert(array.length, [stickyNoteToYMap(stickyNote)])
  })
}
