import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../../db/db'
import { createId } from '../ids'
import { createEmptyBlock } from './noteBlocksFactory'
import {
  appendBlock,
  deleteBlock,
  insertBlock,
  loadNoteBlocks,
  moveBlock,
  replaceBlock,
  updateBlock,
} from './noteBlocksStore'
import type { NoteBlockType } from './blocks.types'

beforeEach(async () => {
  await db.yjsUpdates.clear()
})

describe('noteBlocksStore', () => {
  it('inserts a block and survives a fresh reload', async () => {
    const docId = createId()
    const { doc } = await loadNoteBlocks(docId)
    const block = createEmptyBlock('text')

    await insertBlock(docId, doc, block, 0)

    const reloaded = await loadNoteBlocks(docId)
    expect(reloaded.blocks).toEqual([block])
  })

  it('updates a block field and survives a fresh reload', async () => {
    const docId = createId()
    const { doc } = await loadNoteBlocks(docId)
    const block = createEmptyBlock('code')
    await insertBlock(docId, doc, block, 0)

    await updateBlock(docId, doc, block.id, { code: 'console.log(1)', language: 'javascript' })

    const reloaded = await loadNoteBlocks(docId)
    expect(reloaded.blocks).toEqual([{ ...block, code: 'console.log(1)', language: 'javascript' }])
  })

  it('deletes a block and survives a fresh reload', async () => {
    const docId = createId()
    const { doc } = await loadNoteBlocks(docId)
    const first = createEmptyBlock('text')
    const second = createEmptyBlock('table')
    await insertBlock(docId, doc, first, 0)
    await insertBlock(docId, doc, second, 1)

    await deleteBlock(docId, doc, first.id)

    const reloaded = await loadNoteBlocks(docId)
    expect(reloaded.blocks).toEqual([second])
  })

  it('replaces a block in place, preserving its index, and survives reload', async () => {
    const docId = createId()
    const { doc } = await loadNoteBlocks(docId)
    const first = createEmptyBlock('text')
    const second = createEmptyBlock('table')
    await insertBlock(docId, doc, first, 0)
    await insertBlock(docId, doc, second, 1)

    const replacement = createEmptyBlock('image')
    await replaceBlock(docId, doc, first.id, replacement)

    const reloaded = await loadNoteBlocks(docId)
    expect(reloaded.blocks).toEqual([replacement, second])
  })

  it('appends a block at the end and survives reload', async () => {
    const docId = createId()
    const { doc } = await loadNoteBlocks(docId)
    const first = createEmptyBlock('text')
    await insertBlock(docId, doc, first, 0)

    const appended = createEmptyBlock('code')
    await appendBlock(docId, doc, appended)

    const reloaded = await loadNoteBlocks(docId)
    expect(reloaded.blocks).toEqual([first, appended])
  })

  it('moves a block from the start to the end', async () => {
    const docId = createId()
    const { doc } = await loadNoteBlocks(docId)
    const blocks = [createEmptyBlock('text'), createEmptyBlock('table'), createEmptyBlock('code')]
    for (let i = 0; i < blocks.length; i++) {
      await insertBlock(docId, doc, blocks[i], i)
    }

    await moveBlock(docId, doc, 0, 2)

    const reloaded = await loadNoteBlocks(docId)
    expect(reloaded.blocks.map((b) => b.id)).toEqual([blocks[1].id, blocks[2].id, blocks[0].id])
  })

  it('moves a block from the end to the start', async () => {
    const docId = createId()
    const { doc } = await loadNoteBlocks(docId)
    const blocks = [createEmptyBlock('text'), createEmptyBlock('table'), createEmptyBlock('code')]
    for (let i = 0; i < blocks.length; i++) {
      await insertBlock(docId, doc, blocks[i], i)
    }

    await moveBlock(docId, doc, 2, 0)

    const reloaded = await loadNoteBlocks(docId)
    expect(reloaded.blocks.map((b) => b.id)).toEqual([blocks[2].id, blocks[0].id, blocks[1].id])
  })

  it('swaps two adjacent blocks', async () => {
    const docId = createId()
    const { doc } = await loadNoteBlocks(docId)
    const blocks = [createEmptyBlock('text'), createEmptyBlock('table')]
    for (let i = 0; i < blocks.length; i++) {
      await insertBlock(docId, doc, blocks[i], i)
    }

    await moveBlock(docId, doc, 0, 1)

    const reloaded = await loadNoteBlocks(docId)
    expect(reloaded.blocks.map((b) => b.id)).toEqual([blocks[1].id, blocks[0].id])
  })

  it('supports a note containing a mix of all six block types, surviving deletes/moves/reload', async () => {
    const docId = createId()
    const { doc } = await loadNoteBlocks(docId)
    const types: NoteBlockType[] = ['text', 'image', 'sketch', 'code', 'table', 'embed']
    const blocks = types.map((type) => createEmptyBlock(type))

    for (let i = 0; i < blocks.length; i++) {
      await insertBlock(docId, doc, blocks[i], i)
    }

    await deleteBlock(docId, doc, blocks[1].id) // remove image
    await moveBlock(docId, doc, 0, 3) // move text to the end

    const reloaded = await loadNoteBlocks(docId)
    const remainingIds = [blocks[2], blocks[3], blocks[4], blocks[0], blocks[5]].map((b) => b.id)
    expect(reloaded.blocks.map((b) => b.id)).toEqual(remainingIds)
    expect(reloaded.blocks.map((b) => b.type)).toEqual(['sketch', 'code', 'table', 'text', 'embed'])
  })
})
