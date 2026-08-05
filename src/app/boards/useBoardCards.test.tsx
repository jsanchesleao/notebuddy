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
    await appendCard(cardsDocId, doc, noteId)

    const { result } = renderHook(() => useBoardCards(cardsDocId))

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.cardOrder).toEqual([noteId])
  })

  it('reflects a move reactively', async () => {
    const cardsDocId = createId()
    const first = createId()
    const second = createId()
    const seedDoc = await loadYDoc(cardsDocId)
    await appendCard(cardsDocId, seedDoc, first)
    await appendCard(cardsDocId, seedDoc, second)

    const { result } = renderHook(() => useBoardCards(cardsDocId))
    await waitFor(() => expect(result.current.cardOrder).toHaveLength(2))

    await act(async () => {
      await result.current.moveCard(first, null)
    })

    expect(result.current.cardOrder).toEqual([second, first])
  })

  it('moves a card so it sits immediately before another card', async () => {
    const cardsDocId = createId()
    const a = createId()
    const b = createId()
    const seedDoc = await loadYDoc(cardsDocId)
    await appendCard(cardsDocId, seedDoc, a)
    await appendCard(cardsDocId, seedDoc, b)

    const { result } = renderHook(() => useBoardCards(cardsDocId))
    await waitFor(() => expect(result.current.cardOrder).toHaveLength(2))

    await act(async () => {
      await result.current.moveCard(b, a)
    })

    expect(result.current.cardOrder).toEqual([b, a])
  })
})
