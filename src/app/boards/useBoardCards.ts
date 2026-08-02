import { useCallback, useEffect, useRef, useState } from 'react'
import type * as Y from 'yjs'
import {
  getCardOrderArray,
  loadBoardCards,
  moveCard as moveCardInDoc,
  snapshotCardOrder,
  type CardOrderEntry,
} from '../../domain/boards/boardCardsStore'

export interface UseBoardCardsResult {
  cardOrder: CardOrderEntry[]
  isLoading: boolean
  moveCard: (noteId: string, toColumnId: string, toIndex: number) => Promise<void>
}

// Callers must remount (e.g. `key={cardsDocId}`) when `cardsDocId` changes to a different
// board's doc — mirrors useNoteBlocks, which has the same requirement for note docs.
export function useBoardCards(cardsDocId: string): UseBoardCardsResult {
  const [doc, setDoc] = useState<Y.Doc | null>(null)
  const [cardOrder, setCardOrder] = useState<CardOrderEntry[]>([])
  const docRef = useRef<Y.Doc | null>(null)

  useEffect(() => {
    let cancelled = false

    loadBoardCards(cardsDocId).then((result) => {
      if (cancelled) return
      docRef.current = result.doc
      setDoc(result.doc)
      setCardOrder(result.cardOrder)
    })

    return () => {
      cancelled = true
    }
  }, [cardsDocId])

  useEffect(() => {
    if (!doc) return

    const array = getCardOrderArray(doc)
    const observer = () => setCardOrder(snapshotCardOrder(doc))
    array.observeDeep(observer)

    return () => {
      array.unobserveDeep(observer)
    }
  }, [doc])

  const moveCard = useCallback(
    async (noteId: string, toColumnId: string, toIndex: number) => {
      if (!docRef.current) return
      await moveCardInDoc(cardsDocId, docRef.current, noteId, toColumnId, toIndex)
    },
    [cardsDocId],
  )

  return {
    cardOrder,
    isLoading: doc === null,
    moveCard,
  }
}
