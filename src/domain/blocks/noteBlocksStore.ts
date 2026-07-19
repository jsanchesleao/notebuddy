import * as Y from 'yjs'
import { appendYDocUpdate, loadYDoc } from '../yjs/yjsDocStore'
import type { NoteBlock } from './blocks.types'

export function getBlocksArray(doc: Y.Doc): Y.Array<Y.Map<unknown>> {
  return doc.getArray<Y.Map<unknown>>('blocks')
}

export function snapshotBlocks(doc: Y.Doc): NoteBlock[] {
  return getBlocksArray(doc)
    .toArray()
    .map((map) => map.toJSON() as NoteBlock)
}

export async function loadNoteBlocks(docId: string): Promise<{ doc: Y.Doc; blocks: NoteBlock[] }> {
  const doc = await loadYDoc(docId)
  return { doc, blocks: snapshotBlocks(doc) }
}

function blockToYMap(block: NoteBlock): Y.Map<unknown> {
  return new Y.Map(Object.entries(block))
}

function findBlockIndex(array: Y.Array<Y.Map<unknown>>, blockId: string): number {
  return array.toArray().findIndex((map) => map.get('id') === blockId)
}

async function mutateAndPersist(docId: string, doc: Y.Doc, mutate: () => void): Promise<void> {
  const before = Y.encodeStateVector(doc)
  doc.transact(mutate)
  await appendYDocUpdate(docId, doc, Y.encodeStateAsUpdate(doc, before))
}

export async function insertBlock(
  docId: string,
  doc: Y.Doc,
  block: NoteBlock,
  index: number,
): Promise<void> {
  await mutateAndPersist(docId, doc, () => {
    getBlocksArray(doc).insert(index, [blockToYMap(block)])
  })
}

export async function updateBlock(
  docId: string,
  doc: Y.Doc,
  blockId: string,
  patch: Partial<Omit<NoteBlock, 'id' | 'type'>>,
): Promise<void> {
  await mutateAndPersist(docId, doc, () => {
    const array = getBlocksArray(doc)
    const index = findBlockIndex(array, blockId)
    if (index === -1) return

    const map = array.get(index)
    for (const [key, value] of Object.entries(patch)) {
      map.set(key, value)
    }
  })
}

export async function deleteBlock(docId: string, doc: Y.Doc, blockId: string): Promise<void> {
  await mutateAndPersist(docId, doc, () => {
    const array = getBlocksArray(doc)
    const index = findBlockIndex(array, blockId)
    if (index === -1) return

    array.delete(index, 1)
  })
}

export async function deleteBlocks(docId: string, doc: Y.Doc, blockIds: string[]): Promise<void> {
  await mutateAndPersist(docId, doc, () => {
    const array = getBlocksArray(doc)
    const idsToDelete = new Set(blockIds)
    for (let index = array.length - 1; index >= 0; index -= 1) {
      if (idsToDelete.has(array.get(index).get('id') as string)) {
        array.delete(index, 1)
      }
    }
  })
}

export async function replaceBlock(
  docId: string,
  doc: Y.Doc,
  blockId: string,
  newBlock: NoteBlock,
): Promise<void> {
  await mutateAndPersist(docId, doc, () => {
    const array = getBlocksArray(doc)
    const index = findBlockIndex(array, blockId)
    if (index === -1) return

    array.delete(index, 1)
    array.insert(index, [blockToYMap(newBlock)])
  })
}

export async function appendBlock(docId: string, doc: Y.Doc, block: NoteBlock): Promise<void> {
  await mutateAndPersist(docId, doc, () => {
    const array = getBlocksArray(doc)
    array.insert(array.length, [blockToYMap(block)])
  })
}

export async function moveBlock(
  docId: string,
  doc: Y.Doc,
  fromIndex: number,
  toIndex: number,
): Promise<void> {
  if (fromIndex === toIndex) return

  await mutateAndPersist(docId, doc, () => {
    const array = getBlocksArray(doc)
    const block = array.get(fromIndex).toJSON() as NoteBlock
    array.delete(fromIndex, 1)
    array.insert(toIndex, [blockToYMap(block)])
  })
}
