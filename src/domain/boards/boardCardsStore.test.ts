import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../../db/db'
import { createId } from '../ids'
import { appendCard, loadBoardCards, moveCard, removeCard } from './boardCardsStore'

beforeEach(async () => {
  await db.yjsUpdates.clear()
})

describe('boardCardsStore', () => {
  it('appends a card and survives a fresh reload', async () => {
    const docId = createId()
    const { doc } = await loadBoardCards(docId)
    const noteId = createId()

    await appendCard(docId, doc, noteId, 'col-a')

    const reloaded = await loadBoardCards(docId)
    expect(reloaded.cardOrder).toEqual([{ noteId, columnId: 'col-a' }])
  })

  it('appends multiple cards to the same column in order', async () => {
    const docId = createId()
    const { doc } = await loadBoardCards(docId)
    const first = createId()
    const second = createId()

    await appendCard(docId, doc, first, 'col-a')
    await appendCard(docId, doc, second, 'col-a')

    const reloaded = await loadBoardCards(docId)
    expect(reloaded.cardOrder.map((c) => c.noteId)).toEqual([first, second])
  })

  it('reorders a card within the same column', async () => {
    const docId = createId()
    const { doc } = await loadBoardCards(docId)
    const first = createId()
    const second = createId()
    const third = createId()
    await appendCard(docId, doc, first, 'col-a')
    await appendCard(docId, doc, second, 'col-a')
    await appendCard(docId, doc, third, 'col-a')

    // move first card to the last position within col-a
    await moveCard(docId, doc, first, 'col-a', 2)

    const reloaded = await loadBoardCards(docId)
    expect(reloaded.cardOrder.map((c) => c.noteId)).toEqual([second, third, first])
  })

  it('moves a card to a different column at a given position', async () => {
    const docId = createId()
    const { doc } = await loadBoardCards(docId)
    const a1 = createId()
    const b1 = createId()
    const b2 = createId()
    await appendCard(docId, doc, a1, 'col-a')
    await appendCard(docId, doc, b1, 'col-b')
    await appendCard(docId, doc, b2, 'col-b')

    await moveCard(docId, doc, a1, 'col-b', 1)

    const reloaded = await loadBoardCards(docId)
    const colB = reloaded.cardOrder.filter((c) => c.columnId === 'col-b').map((c) => c.noteId)
    expect(colB).toEqual([b1, a1, b2])
    expect(reloaded.cardOrder.find((c) => c.noteId === a1)?.columnId).toBe('col-b')
  })

  it('appends a card to the end of a column when toIndex is past its current count', async () => {
    const docId = createId()
    const { doc } = await loadBoardCards(docId)
    const a1 = createId()
    const b1 = createId()
    await appendCard(docId, doc, a1, 'col-a')

    await moveCard(docId, doc, b1, 'col-a', 99)

    const reloaded = await loadBoardCards(docId)
    expect(reloaded.cardOrder.map((c) => c.noteId)).toEqual([a1, b1])
  })

  it('removes a card and survives a fresh reload', async () => {
    const docId = createId()
    const { doc } = await loadBoardCards(docId)
    const first = createId()
    const second = createId()
    await appendCard(docId, doc, first, 'col-a')
    await appendCard(docId, doc, second, 'col-a')

    await removeCard(docId, doc, first)

    const reloaded = await loadBoardCards(docId)
    expect(reloaded.cardOrder).toEqual([{ noteId: second, columnId: 'col-a' }])
  })

  it('is a no-op removing a card that is not present', async () => {
    const docId = createId()
    const { doc } = await loadBoardCards(docId)
    const first = createId()
    await appendCard(docId, doc, first, 'col-a')

    await removeCard(docId, doc, createId())

    const reloaded = await loadBoardCards(docId)
    expect(reloaded.cardOrder.map((c) => c.noteId)).toEqual([first])
  })
})
