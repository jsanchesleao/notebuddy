import { describe, expect, it } from 'vitest'
import { createEmptyBlock } from '../../../domain/blocks/noteBlocksFactory'
import { computeMoveIndices } from './reorderBlocks'

describe('computeMoveIndices', () => {
  it('returns null when dragging a block onto itself', () => {
    const blocks = [createEmptyBlock('text'), createEmptyBlock('table')]
    expect(computeMoveIndices(blocks, blocks[0].id, blocks[0].id)).toBeNull()
  })

  it('returns null when either id is not found', () => {
    const blocks = [createEmptyBlock('text'), createEmptyBlock('table')]
    expect(computeMoveIndices(blocks, 'missing', blocks[1].id)).toBeNull()
    expect(computeMoveIndices(blocks, blocks[0].id, 'missing')).toBeNull()
  })

  it('resolves the from/to indices for a valid drag', () => {
    const blocks = [createEmptyBlock('text'), createEmptyBlock('table'), createEmptyBlock('code')]
    expect(computeMoveIndices(blocks, blocks[0].id, blocks[2].id)).toEqual({
      fromIndex: 0,
      toIndex: 2,
    })
    expect(computeMoveIndices(blocks, blocks[2].id, blocks[0].id)).toEqual({
      fromIndex: 2,
      toIndex: 0,
    })
  })
})
