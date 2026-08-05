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

    await appendCard(docId, doc, noteId)

    const reloaded = await loadBoardCards(docId)
    expect(reloaded.cardOrder).toEqual([noteId])
  })

  it('appends multiple cards in order', async () => {
    const docId = createId()
    const { doc } = await loadBoardCards(docId)
    const first = createId()
    const second = createId()

    await appendCard(docId, doc, first)
    await appendCard(docId, doc, second)

    const reloaded = await loadBoardCards(docId)
    expect(reloaded.cardOrder).toEqual([first, second])
  })

  it('moves a card to the end when beforeNoteId is null', async () => {
    const docId = createId()
    const { doc } = await loadBoardCards(docId)
    const first = createId()
    const second = createId()
    const third = createId()
    await appendCard(docId, doc, first)
    await appendCard(docId, doc, second)
    await appendCard(docId, doc, third)

    await moveCard(docId, doc, first, null)

    const reloaded = await loadBoardCards(docId)
    expect(reloaded.cardOrder).toEqual([second, third, first])
  })

  it('moves a card so it sits immediately before another card', async () => {
    const docId = createId()
    const { doc } = await loadBoardCards(docId)
    const a1 = createId()
    const b1 = createId()
    const b2 = createId()
    await appendCard(docId, doc, a1)
    await appendCard(docId, doc, b1)
    await appendCard(docId, doc, b2)

    await moveCard(docId, doc, a1, b2)

    const reloaded = await loadBoardCards(docId)
    expect(reloaded.cardOrder).toEqual([b1, a1, b2])
  })

  it('appends a not-yet-present card to the end when beforeNoteId is null', async () => {
    const docId = createId()
    const { doc } = await loadBoardCards(docId)
    const a1 = createId()
    const b1 = createId()
    await appendCard(docId, doc, a1)

    await moveCard(docId, doc, b1, null)

    const reloaded = await loadBoardCards(docId)
    expect(reloaded.cardOrder).toEqual([a1, b1])
  })

  it('falls back to the end when beforeNoteId is no longer present', async () => {
    const docId = createId()
    const { doc } = await loadBoardCards(docId)
    const a1 = createId()
    const b1 = createId()
    await appendCard(docId, doc, a1)

    await moveCard(docId, doc, b1, 'missing-note-id')

    const reloaded = await loadBoardCards(docId)
    expect(reloaded.cardOrder).toEqual([a1, b1])
  })

  it('removes a card and survives a fresh reload', async () => {
    const docId = createId()
    const { doc } = await loadBoardCards(docId)
    const first = createId()
    const second = createId()
    await appendCard(docId, doc, first)
    await appendCard(docId, doc, second)

    await removeCard(docId, doc, first)

    const reloaded = await loadBoardCards(docId)
    expect(reloaded.cardOrder).toEqual([second])
  })

  it('is a no-op removing a card that is not present', async () => {
    const docId = createId()
    const { doc } = await loadBoardCards(docId)
    const first = createId()
    await appendCard(docId, doc, first)

    await removeCard(docId, doc, createId())

    const reloaded = await loadBoardCards(docId)
    expect(reloaded.cardOrder).toEqual([first])
  })
})
