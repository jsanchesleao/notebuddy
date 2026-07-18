import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../../db/db'
import { createId } from '../../domain/ids'
import { createEmptyBlock } from '../../domain/blocks/noteBlocksFactory'
import { useNoteBlocks } from './useNoteBlocks'

beforeEach(async () => {
  await db.yjsUpdates.clear()
})

describe('useNoteBlocks', () => {
  it('loads an empty block list for a fresh doc', async () => {
    const docId = createId()
    const { result } = renderHook(() => useNoteBlocks(docId))

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.blocks).toEqual([])
  })

  it('reflects inserted, updated, and deleted blocks reactively', async () => {
    const docId = createId()
    const { result } = renderHook(() => useNoteBlocks(docId))
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    const block = createEmptyBlock('code')
    await act(async () => {
      await result.current.insertBlock(block, 0)
    })
    expect(result.current.blocks).toEqual([block])

    await act(async () => {
      await result.current.updateBlock(block.id, { code: 'x = 1' })
    })
    expect(result.current.blocks[0]).toMatchObject({ code: 'x = 1' })

    await act(async () => {
      await result.current.deleteBlock(block.id)
    })
    expect(result.current.blocks).toEqual([])
  })

  it('reflects a move reactively', async () => {
    const docId = createId()
    const { result } = renderHook(() => useNoteBlocks(docId))
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    const first = createEmptyBlock('text')
    const second = createEmptyBlock('table')
    await act(async () => {
      await result.current.insertBlock(first, 0)
      await result.current.insertBlock(second, 1)
    })

    await act(async () => {
      await result.current.moveBlock(0, 1)
    })

    expect(result.current.blocks.map((b) => b.id)).toEqual([second.id, first.id])
  })

  it('reflects a replace reactively, preserving index', async () => {
    const docId = createId()
    const { result } = renderHook(() => useNoteBlocks(docId))
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    const first = createEmptyBlock('text')
    const second = createEmptyBlock('table')
    await act(async () => {
      await result.current.insertBlock(first, 0)
      await result.current.insertBlock(second, 1)
    })

    const replacement = createEmptyBlock('image')
    await act(async () => {
      await result.current.replaceBlock(first.id, replacement)
    })

    expect(result.current.blocks).toEqual([replacement, second])
  })

  it('reflects an append reactively', async () => {
    const docId = createId()
    const { result } = renderHook(() => useNoteBlocks(docId))
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    const first = createEmptyBlock('text')
    await act(async () => {
      await result.current.insertBlock(first, 0)
    })

    const appended = createEmptyBlock('code')
    await act(async () => {
      await result.current.appendBlock(appended)
    })

    expect(result.current.blocks).toEqual([first, appended])
  })
})
