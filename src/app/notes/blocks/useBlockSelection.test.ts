import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { createEmptyBlock } from '../../../domain/blocks/noteBlocksFactory'
import { useBlockSelection, getRangePosition } from './useBlockSelection'

describe('useBlockSelection', () => {
  const blocks = [
    createEmptyBlock('text'),
    createEmptyBlock('table'),
    createEmptyBlock('code'),
    createEmptyBlock('image'),
  ]

  it('starts with nothing selected', () => {
    const { result } = renderHook(() => useBlockSelection(blocks))
    expect(result.current.selectedIds).toEqual([])
    expect(result.current.isRange).toBe(false)
  })

  it('selectBlock selects exactly one block', () => {
    const { result } = renderHook(() => useBlockSelection(blocks))
    act(() => result.current.selectBlock(blocks[1].id))
    expect(result.current.selectedIds).toEqual([blocks[1].id])
    expect(result.current.isRange).toBe(false)
  })

  it('extendTo grows a contiguous range in document order, regardless of direction', () => {
    const { result } = renderHook(() => useBlockSelection(blocks))
    act(() => result.current.extendTo(blocks[2].id, blocks[1].id))
    expect(result.current.selectedIds).toEqual([blocks[1].id, blocks[2].id])
    expect(result.current.isRange).toBe(true)

    // Extending further forward keeps the original anchor and grows the range.
    act(() => result.current.extendTo(blocks[3].id, blocks[1].id))
    expect(result.current.selectedIds).toEqual([blocks[1].id, blocks[2].id, blocks[3].id])
  })

  it('extendTo shrinking back past the anchor flips the range direction', () => {
    const { result } = renderHook(() => useBlockSelection(blocks))
    act(() => result.current.extendTo(blocks[3].id, blocks[2].id))
    expect(result.current.selectedIds).toEqual([blocks[2].id, blocks[3].id])

    act(() => result.current.extendTo(blocks[0].id, blocks[2].id))
    expect(result.current.selectedIds).toEqual([blocks[0].id, blocks[1].id, blocks[2].id])
  })

  it('clear resets the selection', () => {
    const { result } = renderHook(() => useBlockSelection(blocks))
    act(() => result.current.extendTo(blocks[2].id, blocks[0].id))
    act(() => result.current.clear())
    expect(result.current.selectedIds).toEqual([])
    expect(result.current.range).toBeNull()
  })
})

describe('getRangePosition', () => {
  it('returns null when fewer than two ids are selected', () => {
    expect(getRangePosition([], 'a')).toBeNull()
    expect(getRangePosition(['a'], 'a')).toBeNull()
  })

  it('returns null for an id outside the selection', () => {
    expect(getRangePosition(['a', 'b'], 'c')).toBeNull()
  })

  it('marks the first id top, the last id bottom, and interior ids middle', () => {
    expect(getRangePosition(['a', 'b', 'c'], 'a')).toBe('top')
    expect(getRangePosition(['a', 'b', 'c'], 'b')).toBe('middle')
    expect(getRangePosition(['a', 'b', 'c'], 'c')).toBe('bottom')
  })

  it('has no middle for a two-block range', () => {
    expect(getRangePosition(['a', 'b'], 'a')).toBe('top')
    expect(getRangePosition(['a', 'b'], 'b')).toBe('bottom')
  })
})
