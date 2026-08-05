import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../../db/db'
import { createOpfsMemoryDriver } from '../../lib/opfs/opfsMemoryDriver'
import { setOpfsDriverForTesting } from '../../lib/opfs/opfsDriver'
import {
  applyColumnEdits,
  createBoard,
  deleteBoard,
  deleteBoardsByFolderId,
  findOtherStatusTypeReferences,
  getBoard,
  listBoardsByFolder,
  moveBoard,
  renameBoard,
  reorderColumns,
  setColumnColor,
  setColumnVisibility,
} from './boardRepository'
import { createNote, getNote } from '../notes/noteRepository'
import { insertBlock, loadNoteBlocks } from '../blocks/noteBlocksStore'
import { createEmptyBlock } from '../blocks/noteBlocksFactory'
import { createCustomDataType } from '../dataTypes/dataTypeRepository'
import { createId } from '../ids'
import { createYDoc } from '../yjs/yjsDocStore'
import type { Board, SelectOption } from '../entities.types'

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

async function makeStatusType(labels: string[]) {
  const options: SelectOption[] = labels.map((label) => ({
    id: createId(),
    label,
    value: label.toLowerCase(),
  }))
  const customType = await createCustomDataType({
    name: 'Status',
    schema: { kind: 'primitive', primitive: 'select', options },
  })
  return { customType, options }
}

beforeEach(async () => {
  await db.boards.clear()
  await db.notes.clear()
  await db.yjsUpdates.clear()
  await db.customDataTypes.clear()
  await db.noteTypes.clear()
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

  it('deletes a board along with its own cardsDocId yjsUpdates rows', async () => {
    const { customType } = await makeStatusType(['Todo', 'Done'])
    const board = await createBoard({ title: 'Board', folderId: null, statusTypeId: customType.id })
    await createNote({ notebookId: null, boardId: board.id, title: 'Card' })

    expect(await db.yjsUpdates.where('docId').equals(board.cardsDocId).count()).toBeGreaterThan(0)

    await deleteBoard(board.id)

    expect(await db.yjsUpdates.where('docId').equals(board.cardsDocId).count()).toBe(0)
  })

  describe('createBoard', () => {
    it('mints one column per option, with distinct board-local colors', async () => {
      const { customType, options } = await makeStatusType(['Todo', 'Doing', 'Done'])
      const board = await createBoard({
        title: 'Sprint',
        folderId: null,
        statusTypeId: customType.id,
      })

      expect(board.title).toBe('Sprint')
      expect(board.statusTypeId).toBe(customType.id)
      expect(board.columns).toHaveLength(3)
      expect(board.columns.map((c) => c.id)).toEqual(options.map((o) => o.id))
      expect(board.columns.map((c) => c.name)).toEqual(['Todo', 'Doing', 'Done'])
      expect(board.columns.map((c) => c.tag)).toEqual(['todo', 'doing', 'done'])
      expect(board.columns.every((c) => c.visible)).toBe(true)
      expect(new Set(board.columns.map((c) => c.color)).size).toBe(3)
    })

    it('mints an empty column list for an option set with no options yet', async () => {
      const { customType } = await makeStatusType([])
      const board = await createBoard({
        title: 'Board',
        folderId: null,
        statusTypeId: customType.id,
      })
      expect(board.columns).toEqual([])
    })
  })

  describe('getBoard reconciliation', () => {
    it('adds a column when an option is added to the linked type elsewhere', async () => {
      const { customType, options } = await makeStatusType(['Todo', 'Done'])
      const board = await createBoard({
        title: 'Board',
        folderId: null,
        statusTypeId: customType.id,
      })

      const newOption: SelectOption = { id: createId(), label: 'Blocked', value: 'blocked' }
      await db.customDataTypes.update(customType.id, {
        schema: { kind: 'primitive', primitive: 'select', options: [...options, newOption] },
      })

      const reconciled = await getBoard(board.id)
      expect(reconciled?.columns.map((c) => c.id)).toEqual([
        ...board.columns.map((c) => c.id),
        newOption.id,
      ])
      expect(reconciled?.columns.at(-1)?.name).toBe('Blocked')
    })

    it('drops a column whose option was removed elsewhere, preserving the remaining order', async () => {
      const { customType, options } = await makeStatusType(['Todo', 'Doing', 'Done'])
      const board = await createBoard({
        title: 'Board',
        folderId: null,
        statusTypeId: customType.id,
      })

      await db.customDataTypes.update(customType.id, {
        schema: { kind: 'primitive', primitive: 'select', options: [options[0], options[2]] },
      })

      const reconciled = await getBoard(board.id)
      expect(reconciled?.columns.map((c) => c.name)).toEqual(['Todo', 'Done'])
    })

    it('preserves a custom column order and colors across reconciliation when nothing changed', async () => {
      const { customType } = await makeStatusType(['Todo', 'Doing', 'Done'])
      const board = await createBoard({
        title: 'Board',
        folderId: null,
        statusTypeId: customType.id,
      })
      await reorderColumns(board.id, 0, 2)

      const reordered = await getBoard(board.id)
      const again = await getBoard(board.id)
      expect(again?.columns).toEqual(reordered?.columns)
    })

    it('leaves a board with no statusTypeId untouched', async () => {
      const board = makeBoard()
      await db.boards.add(board)
      expect(await getBoard(board.id)).toEqual(board)
    })
  })

  it('renames a board', async () => {
    const board = makeBoard({ title: 'Old' })
    await db.boards.add(board)
    await renameBoard(board.id, 'New')
    expect((await db.boards.get(board.id))?.title).toBe('New')
  })

  it('moves a board to a different folder, including to/from root', async () => {
    const board = makeBoard({ folderId: null })
    await db.boards.add(board)

    await moveBoard(board.id, 'folder-a')
    expect((await db.boards.get(board.id))?.folderId).toBe('folder-a')

    await moveBoard(board.id, null)
    expect((await db.boards.get(board.id))?.folderId).toBeNull()
  })

  it('sets a column color', async () => {
    const { customType } = await makeStatusType(['Todo'])
    const board = await createBoard({ title: 'Board', folderId: null, statusTypeId: customType.id })
    const columnId = board.columns[0].id

    await setColumnColor(board.id, columnId, '#123456')

    expect((await db.boards.get(board.id))?.columns[0].color).toBe('#123456')
  })

  it('sets column visibility', async () => {
    const { customType } = await makeStatusType(['Todo'])
    const board = await createBoard({ title: 'Board', folderId: null, statusTypeId: customType.id })
    const columnId = board.columns[0].id

    await setColumnVisibility(board.id, columnId, false)

    expect((await db.boards.get(board.id))?.columns[0].visible).toBe(false)
  })

  it('reorders columns', async () => {
    const { customType } = await makeStatusType(['Todo', 'Doing', 'Done'])
    const board = await createBoard({ title: 'Board', folderId: null, statusTypeId: customType.id })
    const ids = board.columns.map((c) => c.id)

    await reorderColumns(board.id, 0, 2)

    const updated = await db.boards.get(board.id)
    expect(updated?.columns.map((c) => c.id)).toEqual([ids[1], ids[2], ids[0]])
  })

  describe('applyColumnEdits', () => {
    it('renames the linked option and syncs the column name/tag', async () => {
      const { customType, options } = await makeStatusType(['Todo', 'Done'])
      const board = await createBoard({
        title: 'Board',
        folderId: null,
        statusTypeId: customType.id,
      })

      const renamed = options.map((o) => (o.label === 'Todo' ? { ...o, label: 'Backlog' } : o))
      await applyColumnEdits(board.id, 'Status', renamed)

      const updated = await db.boards.get(board.id)
      expect(updated?.columns.map((c) => c.name)).toEqual(['Backlog', 'Done'])
      const updatedType = await db.customDataTypes.get(customType.id)
      expect(
        updatedType?.schema.kind === 'primitive' && updatedType.schema.options?.[0].label,
      ).toBe('Backlog')
    })

    it('adds a new column with a board-local least-used color', async () => {
      const { customType, options } = await makeStatusType(['Todo', 'Done'])
      const board = await createBoard({
        title: 'Board',
        folderId: null,
        statusTypeId: customType.id,
      })

      const added: SelectOption = { id: createId(), label: 'Blocked', value: 'blocked' }
      await applyColumnEdits(board.id, 'Status', [...options, added])

      const updated = await db.boards.get(board.id)
      expect(updated?.columns.map((c) => c.name)).toEqual(['Todo', 'Done', 'Blocked'])
    })

    it('rejects removing a column that still has cards, without a reassignment target', async () => {
      const { customType, options } = await makeStatusType(['Todo', 'Done'])
      const board = await createBoard({
        title: 'Board',
        folderId: null,
        statusTypeId: customType.id,
      })
      await createNote({
        notebookId: null,
        boardId: board.id,
        title: 'Card',
        statusValue: 'todo',
      })

      await expect(applyColumnEdits(board.id, 'Status', [options[1]])).rejects.toThrow(
        /reassignment/i,
      )
    })

    it('removes an empty column with no cards, without requiring a reassignment target', async () => {
      const { customType, options } = await makeStatusType(['Todo', 'Done'])
      const board = await createBoard({
        title: 'Board',
        folderId: null,
        statusTypeId: customType.id,
      })

      await applyColumnEdits(board.id, 'Status', [options[1]])

      const updated = await db.boards.get(board.id)
      expect(updated?.columns.map((c) => c.name)).toEqual(['Done'])
    })

    it('rejects leaving a board with zero columns', async () => {
      const { customType } = await makeStatusType(['Todo'])
      const board = await createBoard({
        title: 'Board',
        folderId: null,
        statusTypeId: customType.id,
      })

      await expect(applyColumnEdits(board.id, 'Status', [])).rejects.toThrow(/at least one column/i)
    })

    it('reassigns affected notes to the target column and removes the old column', async () => {
      const { customType, options } = await makeStatusType(['Todo', 'Done'])
      const board = await createBoard({
        title: 'Board',
        folderId: null,
        statusTypeId: customType.id,
      })
      const todoColumnId = board.columns[0].id
      const doneColumnId = board.columns[1].id
      const note = await createNote({
        notebookId: null,
        boardId: board.id,
        title: 'Card',
        statusValue: 'todo',
      })

      const reassignments = new Map([[options[0].id, doneColumnId]])
      await applyColumnEdits(board.id, 'Status', [options[1]], reassignments)

      const updated = await db.boards.get(board.id)
      expect(updated?.columns.map((c) => c.id)).toEqual([doneColumnId])
      const updatedNote = await getNote(note.id)
      expect(updatedNote?.metadata.properties.status?.value).toBe('done')
      expect(todoColumnId).not.toBe(doneColumnId)
    })
  })

  describe('findOtherStatusTypeReferences', () => {
    it('reports zero references for a board whose option set is used nowhere else', async () => {
      const { customType } = await makeStatusType(['Todo'])
      const board = await createBoard({
        title: 'Board',
        folderId: null,
        statusTypeId: customType.id,
      })
      expect(await findOtherStatusTypeReferences(board.id)).toEqual({
        otherBoardCount: 0,
        otherReferenceCount: 0,
      })
    })

    it('counts other boards sharing the same option set', async () => {
      const { customType } = await makeStatusType(['Todo'])
      const boardA = await createBoard({ title: 'A', folderId: null, statusTypeId: customType.id })
      await createBoard({ title: 'B', folderId: null, statusTypeId: customType.id })

      expect((await findOtherStatusTypeReferences(boardA.id)).otherBoardCount).toBe(1)
    })
  })
})
