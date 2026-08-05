import { useCallback, useEffect, useRef, useState } from 'react'
import type * as Y from 'yjs'
import {
  bringStickyNoteToFront as bringStickyNoteToFrontInDoc,
  deleteStickyNote as deleteStickyNoteInDoc,
  getStickyNotesArray,
  insertStickyNote as insertStickyNoteInDoc,
  loadStickyNotes,
  moveStickyNote as moveStickyNoteInDoc,
  snapshotStickyNotes,
  updateStickyNote as updateStickyNoteInDoc,
} from '../../domain/stickyNotes/stickyNotesStore'
import { createEmptyStickyNote } from '../../domain/stickyNotes/stickyNoteFactory'
import type { StickyNote } from '../../domain/entities.types'

export interface UseStickyNotesResult {
  stickyNotes: StickyNote[]
  isLoading: boolean
  addStickyNote: (kind: 'text' | 'sketch') => Promise<void>
  updateStickyNote: (stickyNoteId: string, patch: Partial<Omit<StickyNote, 'id'>>) => Promise<void>
  deleteStickyNote: (stickyNoteId: string) => Promise<void>
  moveStickyNote: (stickyNoteId: string, x: number, y: number) => Promise<void>
  bringStickyNoteToFront: (stickyNoteId: string) => Promise<void>
}

// Callers must remount (e.g. `key={docId}`) when `docId` changes to a different entity's
// doc — this hook doesn't reset state on a docId change itself, matching useNoteBlocks.ts.
export function useStickyNotes(docId: string): UseStickyNotesResult {
  const [doc, setDoc] = useState<Y.Doc | null>(null)
  const [stickyNotes, setStickyNotes] = useState<StickyNote[]>([])
  const docRef = useRef<Y.Doc | null>(null)
  const stickyNotesRef = useRef<StickyNote[]>([])

  useEffect(() => {
    stickyNotesRef.current = stickyNotes
  })

  useEffect(() => {
    let cancelled = false

    loadStickyNotes(docId).then((result) => {
      if (cancelled) return
      docRef.current = result.doc
      setDoc(result.doc)
      setStickyNotes(result.stickyNotes)
    })

    return () => {
      cancelled = true
    }
  }, [docId])

  useEffect(() => {
    if (!doc) return

    const array = getStickyNotesArray(doc)
    const observer = () => setStickyNotes(snapshotStickyNotes(doc))
    array.observeDeep(observer)

    return () => {
      array.unobserveDeep(observer)
    }
  }, [doc])

  const addStickyNote = useCallback(
    async (kind: 'text' | 'sketch') => {
      if (!docRef.current) return
      const stickyNote = createEmptyStickyNote(kind, stickyNotesRef.current)
      await insertStickyNoteInDoc(docId, docRef.current, stickyNote)
    },
    [docId],
  )

  const updateStickyNote = useCallback(
    async (stickyNoteId: string, patch: Partial<Omit<StickyNote, 'id'>>) => {
      if (!docRef.current) return
      await updateStickyNoteInDoc(docId, docRef.current, stickyNoteId, patch)
    },
    [docId],
  )

  const deleteStickyNote = useCallback(
    async (stickyNoteId: string) => {
      if (!docRef.current) return
      await deleteStickyNoteInDoc(docId, docRef.current, stickyNoteId)
    },
    [docId],
  )

  const moveStickyNote = useCallback(
    async (stickyNoteId: string, x: number, y: number) => {
      if (!docRef.current) return
      await moveStickyNoteInDoc(docId, docRef.current, stickyNoteId, x, y)
    },
    [docId],
  )

  const bringStickyNoteToFront = useCallback(
    async (stickyNoteId: string) => {
      if (!docRef.current) return
      await bringStickyNoteToFrontInDoc(docId, docRef.current, stickyNoteId)
    },
    [docId],
  )

  return {
    stickyNotes,
    isLoading: doc === null,
    addStickyNote,
    updateStickyNote,
    deleteStickyNote,
    moveStickyNote,
    bringStickyNoteToFront,
  }
}
