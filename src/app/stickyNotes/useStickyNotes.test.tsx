import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../../db/db'
import { createId } from '../../domain/ids'
import { insertStickyNote } from '../../domain/stickyNotes/stickyNotesStore'
import { createEmptyStickyNote } from '../../domain/stickyNotes/stickyNoteFactory'
import { loadYDoc } from '../../domain/yjs/yjsDocStore'
import { useStickyNotes } from './useStickyNotes'

beforeEach(async () => {
  await db.yjsUpdates.clear()
})

describe('useStickyNotes', () => {
  it('loads an empty sticky-note list for a fresh doc', async () => {
    const docId = createId()
    const { result } = renderHook(() => useStickyNotes(docId))

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.stickyNotes).toEqual([])
  })

  it('loads whatever sticky notes were already persisted for the doc', async () => {
    const docId = createId()
    const doc = await loadYDoc(docId)
    const stickyNote = createEmptyStickyNote('text', [])
    await insertStickyNote(docId, doc, stickyNote)

    const { result } = renderHook(() => useStickyNotes(docId))

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.stickyNotes).toEqual([stickyNote])
  })

  it('adds a sticky note reactively', async () => {
    const docId = createId()
    const { result } = renderHook(() => useStickyNotes(docId))
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    await act(async () => {
      await result.current.addStickyNote('text')
    })

    expect(result.current.stickyNotes).toHaveLength(1)
    expect(result.current.stickyNotes[0].content).toEqual({ kind: 'text', text: '' })
  })

  it('moves a sticky note reactively', async () => {
    const docId = createId()
    const doc = await loadYDoc(docId)
    const stickyNote = createEmptyStickyNote('text', [])
    await insertStickyNote(docId, doc, stickyNote)

    const { result } = renderHook(() => useStickyNotes(docId))
    await waitFor(() => expect(result.current.stickyNotes).toHaveLength(1))

    await act(async () => {
      await result.current.moveStickyNote(stickyNote.id, 200, 250)
    })

    expect(result.current.stickyNotes[0]).toMatchObject({ x: 200, y: 250 })
  })

  it('brings a sticky note to the front reactively', async () => {
    const docId = createId()
    const doc = await loadYDoc(docId)
    const first = createEmptyStickyNote('text', [])
    const second = createEmptyStickyNote('text', [first])
    await insertStickyNote(docId, doc, first)
    await insertStickyNote(docId, doc, second)

    const { result } = renderHook(() => useStickyNotes(docId))
    await waitFor(() => expect(result.current.stickyNotes).toHaveLength(2))

    await act(async () => {
      await result.current.bringStickyNoteToFront(first.id)
    })

    expect(result.current.stickyNotes.map((s) => s.id)).toEqual([second.id, first.id])
  })

  it('deletes a sticky note reactively', async () => {
    const docId = createId()
    const doc = await loadYDoc(docId)
    const stickyNote = createEmptyStickyNote('text', [])
    await insertStickyNote(docId, doc, stickyNote)

    const { result } = renderHook(() => useStickyNotes(docId))
    await waitFor(() => expect(result.current.stickyNotes).toHaveLength(1))

    await act(async () => {
      await result.current.deleteStickyNote(stickyNote.id)
    })

    expect(result.current.stickyNotes).toEqual([])
  })
})
