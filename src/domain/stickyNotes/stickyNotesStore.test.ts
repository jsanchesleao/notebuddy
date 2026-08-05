import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../../db/db'
import { createId } from '../ids'
import { createEmptyStickyNote } from './stickyNoteFactory'
import {
  bringStickyNoteToFront,
  deleteStickyNote,
  insertStickyNote,
  loadStickyNotes,
  moveStickyNote,
  updateStickyNote,
} from './stickyNotesStore'

beforeEach(async () => {
  await db.yjsUpdates.clear()
})

describe('stickyNotesStore', () => {
  it('inserts a sticky note and survives a fresh reload', async () => {
    const docId = createId()
    const { doc } = await loadStickyNotes(docId)
    const stickyNote = createEmptyStickyNote('text', [])

    await insertStickyNote(docId, doc, stickyNote)

    const reloaded = await loadStickyNotes(docId)
    expect(reloaded.stickyNotes).toEqual([stickyNote])
  })

  it('updates a sticky note field and survives a fresh reload', async () => {
    const docId = createId()
    const { doc } = await loadStickyNotes(docId)
    const stickyNote = createEmptyStickyNote('text', [])
    await insertStickyNote(docId, doc, stickyNote)

    await updateStickyNote(docId, doc, stickyNote.id, {
      content: { kind: 'text', text: 'Hello' },
    })

    const reloaded = await loadStickyNotes(docId)
    expect(reloaded.stickyNotes).toEqual([
      { ...stickyNote, content: { kind: 'text', text: 'Hello' } },
    ])
  })

  it('moves a sticky note and survives a fresh reload', async () => {
    const docId = createId()
    const { doc } = await loadStickyNotes(docId)
    const stickyNote = createEmptyStickyNote('text', [])
    await insertStickyNote(docId, doc, stickyNote)

    await moveStickyNote(docId, doc, stickyNote.id, 120, 340)

    const reloaded = await loadStickyNotes(docId)
    expect(reloaded.stickyNotes).toEqual([{ ...stickyNote, x: 120, y: 340 }])
  })

  it('deletes a sticky note and survives a fresh reload', async () => {
    const docId = createId()
    const { doc } = await loadStickyNotes(docId)
    const first = createEmptyStickyNote('text', [])
    const second = createEmptyStickyNote('sketch', [first])
    await insertStickyNote(docId, doc, first)
    await insertStickyNote(docId, doc, second)

    await deleteStickyNote(docId, doc, first.id)

    const reloaded = await loadStickyNotes(docId)
    expect(reloaded.stickyNotes).toEqual([second])
  })

  it('brings a sticky note to the front, moving it to the end of paint order', async () => {
    const docId = createId()
    const { doc } = await loadStickyNotes(docId)
    const first = createEmptyStickyNote('text', [])
    const second = createEmptyStickyNote('text', [first])
    const third = createEmptyStickyNote('text', [first, second])
    await insertStickyNote(docId, doc, first)
    await insertStickyNote(docId, doc, second)
    await insertStickyNote(docId, doc, third)

    await bringStickyNoteToFront(docId, doc, first.id)

    const reloaded = await loadStickyNotes(docId)
    expect(reloaded.stickyNotes.map((s) => s.id)).toEqual([second.id, third.id, first.id])
  })

  it('bringing the already-topmost sticky note to the front is a no-op', async () => {
    const docId = createId()
    const { doc } = await loadStickyNotes(docId)
    const first = createEmptyStickyNote('text', [])
    const second = createEmptyStickyNote('text', [first])
    await insertStickyNote(docId, doc, first)
    await insertStickyNote(docId, doc, second)

    await bringStickyNoteToFront(docId, doc, second.id)

    const reloaded = await loadStickyNotes(docId)
    expect(reloaded.stickyNotes.map((s) => s.id)).toEqual([first.id, second.id])
  })

  it('supports both text and sketch sticky notes coexisting, surviving reload', async () => {
    const docId = createId()
    const { doc } = await loadStickyNotes(docId)
    const textNote = createEmptyStickyNote('text', [])
    const sketchNote = createEmptyStickyNote('sketch', [textNote])
    await insertStickyNote(docId, doc, textNote)
    await insertStickyNote(docId, doc, sketchNote)

    const reloaded = await loadStickyNotes(docId)
    expect(reloaded.stickyNotes.map((s) => s.content.kind)).toEqual(['text', 'sketch'])
  })
})
