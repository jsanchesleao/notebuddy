import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../../db/db'
import { createId } from '../../domain/ids'
import { appendCard } from '../../domain/boards/boardCardsStore'
import { loadYDoc } from '../../domain/yjs/yjsDocStore'
import { useBoardCards } from './useBoardCards'

beforeEach(async () => {
  await db.yjsUpdates.clear()
})

describe('useBoardCards', () => {
  it('loads an empty card order for a fresh doc', async () => {
    const cardsDocId = createId()
    const { result } = renderHook(() => useBoardCards(cardsDocId))

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.cardOrder).toEqual([])
  })

  it('loads whatever card order was already persisted for the doc', async () => {
    const cardsDocId = createId()
    const noteId = createId()
    const doc = await loadYDoc(cardsDocId)
    await appendCard(cardsDocId, doc, noteId, 'col-a')

    const { result } = renderHook(() => useBoardCards(cardsDocId))

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.cardOrder).toEqual([{ noteId, columnId: 'col-a' }])
  })

  it('reflects a move reactively', async () => {
    const cardsDocId = createId()
    const first = createId()
    const second = createId()
    const seedDoc = await loadYDoc(cardsDocId)
    await appendCard(cardsDocId, seedDoc, first, 'col-a')
    await appendCard(cardsDocId, seedDoc, second, 'col-a')

    const { result } = renderHook(() => useBoardCards(cardsDocId))
    await waitFor(() => expect(result.current.cardOrder).toHaveLength(2))

    await act(async () => {
      await result.current.moveCard(first, 'col-a', 1)
    })

    expect(result.current.cardOrder.map((c) => c.noteId)).toEqual([second, first])
  })

  it('moves a card into a different column', async () => {
    const cardsDocId = createId()
    const noteId = createId()
    const seedDoc = await loadYDoc(cardsDocId)
    await appendCard(cardsDocId, seedDoc, noteId, 'col-a')

    const { result } = renderHook(() => useBoardCards(cardsDocId))
    await waitFor(() => expect(result.current.cardOrder).toHaveLength(1))

    await act(async () => {
      await result.current.moveCard(noteId, 'col-b', 0)
    })

    expect(result.current.cardOrder).toEqual([{ noteId, columnId: 'col-b' }])
  })
})
