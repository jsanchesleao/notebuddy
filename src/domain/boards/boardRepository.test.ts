import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../../db/db'
import { createOpfsMemoryDriver } from '../../lib/opfs/opfsMemoryDriver'
import { setOpfsDriverForTesting } from '../../lib/opfs/opfsDriver'
import { deleteBoard, deleteBoardsByFolderId, getBoard, listBoardsByFolder } from './boardRepository'
import { createNote, getNote } from '../notes/noteRepository'
import { insertBlock, loadNoteBlocks } from '../blocks/noteBlocksStore'
import { createEmptyBlock } from '../blocks/noteBlocksFactory'
import { createId } from '../ids'
import { createYDoc } from '../yjs/yjsDocStore'
import type { Board } from '../entities.types'

function makeBoard(overrides: Partial<Board> = {}): Board {
  return {
    id: createId(),
    folderId: null,
    title: 'Board',
    columns: [],
    cardsDocId: createYDoc().docId,
    statusTypeId: null,
    ...overrides,
  }
}

beforeEach(async () => {
  await db.boards.clear()
  await db.notes.clear()
  await db.yjsUpdates.clear()
  setOpfsDriverForTesting(createOpfsMemoryDriver())
})

describe('boardRepository', () => {
  it('lists boards scoped to a folder, including root (null) boards', async () => {
    const board = makeBoard({ folderId: null, title: 'Root board' })
    const childBoard = makeBoard({ folderId: 'some-folder', title: 'Child board' })
    await db.boards.bulkAdd([board, childBoard])

    expect((await listBoardsByFolder(null)).map((b) => b.title)).toEqual(['Root board'])
    expect((await listBoardsByFolder('some-folder')).map((b) => b.title)).toEqual(['Child board'])
  })

  it('gets a board by id', async () => {
    const board = makeBoard()
    await db.boards.add(board)
    expect(await getBoard(board.id)).toEqual(board)
    expect(await getBoard('does-not-exist')).toBeUndefined()
  })

  it('deletes a board along with its notes and their yjsUpdates rows', async () => {
    const board = makeBoard()
    await db.boards.add(board)
    const note = await createNote({ notebookId: null, boardId: board.id, title: 'Card' })

    await deleteBoard(board.id)

    expect(await getBoard(board.id)).toBeUndefined()
    expect(await getNote(note.id)).toBeUndefined()
    expect(await db.yjsUpdates.where('docId').equals(note.blockDocId).count()).toBe(0)
  })

  it('deletes OPFS assets referenced by a board note when the board is deleted', async () => {
    const board = makeBoard()
    await db.boards.add(board)
    const note = await createNote({ notebookId: null, boardId: board.id, title: 'Card' })

    const { doc } = await loadNoteBlocks(note.blockDocId)
    const driver = createOpfsMemoryDriver()
    setOpfsDriverForTesting(driver)
    await driver.writeFile('notes/n/asset.png', new Blob(['x']))

    const imageBlock = { ...createEmptyBlock('image'), opfsPath: 'notes/n/asset.png' }
    await insertBlock(note.blockDocId, doc, imageBlock, 0)

    expect(await driver.exists('notes/n/asset.png')).toBe(true)

    await deleteBoard(board.id)

    expect(await driver.exists('notes/n/asset.png')).toBe(false)
  })

  it('deletes all boards in a folder along with their notes', async () => {
    const folderId = 'folder-1'
    const boardA = makeBoard({ folderId, title: 'A' })
    const boardB = makeBoard({ folderId, title: 'B' })
    const boardElsewhere = makeBoard({ folderId: null, title: 'Elsewhere' })
    await db.boards.bulkAdd([boardA, boardB, boardElsewhere])

    const noteA = await createNote({ notebookId: null, boardId: boardA.id, title: 'A note' })
    const noteB = await createNote({ notebookId: null, boardId: boardB.id, title: 'B note' })

    await deleteBoardsByFolderId(folderId)

    expect(await getBoard(boardA.id)).toBeUndefined()
    expect(await getBoard(boardB.id)).toBeUndefined()
    expect(await getBoard(boardElsewhere.id)).toEqual(boardElsewhere)
    expect(await getNote(noteA.id)).toBeUndefined()
    expect(await getNote(noteB.id)).toBeUndefined()
  })
})
