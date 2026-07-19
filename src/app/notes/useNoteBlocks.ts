import { useCallback, useEffect, useRef, useState } from 'react'
import type * as Y from 'yjs'
import {
  appendBlock as appendBlockInDoc,
  deleteBlock as deleteBlockInDoc,
  deleteBlocks as deleteBlocksInDoc,
  getBlocksArray,
  insertBlock as insertBlockInDoc,
  loadNoteBlocks,
  moveBlock as moveBlockInDoc,
  replaceBlock as replaceBlockInDoc,
  snapshotBlocks,
  updateBlock as updateBlockInDoc,
} from '../../domain/blocks/noteBlocksStore'
import type { NoteBlock } from '../../domain/blocks/blocks.types'

export interface UseNoteBlocksResult {
  blocks: NoteBlock[]
  isLoading: boolean
  insertBlock: (block: NoteBlock, index: number) => Promise<void>
  updateBlock: (blockId: string, patch: Partial<Omit<NoteBlock, 'id' | 'type'>>) => Promise<void>
  deleteBlock: (blockId: string) => Promise<void>
  deleteBlocks: (blockIds: string[]) => Promise<void>
  moveBlock: (fromIndex: number, toIndex: number) => Promise<void>
  replaceBlock: (blockId: string, newBlock: NoteBlock) => Promise<void>
  appendBlock: (block: NoteBlock) => Promise<void>
}

// Callers must remount (e.g. `key={docId}`) when `docId` changes to a different
// note's doc — this hook doesn't reset `blocks`/`doc` on a docId change itself,
// so reusing an instance across notes would briefly show the previous note's content.
export function useNoteBlocks(docId: string): UseNoteBlocksResult {
  const [doc, setDoc] = useState<Y.Doc | null>(null)
  const [blocks, setBlocks] = useState<NoteBlock[]>([])
  const docRef = useRef<Y.Doc | null>(null)

  useEffect(() => {
    let cancelled = false

    loadNoteBlocks(docId).then((result) => {
      if (cancelled) return
      docRef.current = result.doc
      setDoc(result.doc)
      setBlocks(result.blocks)
    })

    return () => {
      cancelled = true
    }
  }, [docId])

  useEffect(() => {
    if (!doc) return

    const array = getBlocksArray(doc)
    const observer = () => setBlocks(snapshotBlocks(doc))
    array.observeDeep(observer)

    return () => {
      array.unobserveDeep(observer)
    }
  }, [doc])

  const insertBlock = useCallback(
    async (block: NoteBlock, index: number) => {
      if (!docRef.current) return
      await insertBlockInDoc(docId, docRef.current, block, index)
    },
    [docId],
  )

  const updateBlock = useCallback(
    async (blockId: string, patch: Partial<Omit<NoteBlock, 'id' | 'type'>>) => {
      if (!docRef.current) return
      await updateBlockInDoc(docId, docRef.current, blockId, patch)
    },
    [docId],
  )

  const deleteBlock = useCallback(
    async (blockId: string) => {
      if (!docRef.current) return
      await deleteBlockInDoc(docId, docRef.current, blockId)
    },
    [docId],
  )

  const deleteBlocks = useCallback(
    async (blockIds: string[]) => {
      if (!docRef.current) return
      await deleteBlocksInDoc(docId, docRef.current, blockIds)
    },
    [docId],
  )

  const moveBlock = useCallback(
    async (fromIndex: number, toIndex: number) => {
      if (!docRef.current) return
      await moveBlockInDoc(docId, docRef.current, fromIndex, toIndex)
    },
    [docId],
  )

  const replaceBlock = useCallback(
    async (blockId: string, newBlock: NoteBlock) => {
      if (!docRef.current) return
      await replaceBlockInDoc(docId, docRef.current, blockId, newBlock)
    },
    [docId],
  )

  const appendBlock = useCallback(
    async (block: NoteBlock) => {
      if (!docRef.current) return
      await appendBlockInDoc(docId, docRef.current, block)
    },
    [docId],
  )

  return {
    blocks,
    isLoading: doc === null,
    insertBlock,
    updateBlock,
    deleteBlock,
    deleteBlocks,
    moveBlock,
    replaceBlock,
    appendBlock,
  }
}
