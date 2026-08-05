import { db } from '../../db/db'
import { createId } from '../ids'
import { createYDoc } from '../yjs/yjsDocStore'
import { deleteUpdateRows } from '../yjs/yjsUpdatesTable'
import { deleteNotesByBoardId } from '../notes/noteRepository'
import { runCascadeDelete } from '../cascadeDelete'
import { updateCustomDataType } from '../dataTypes/dataTypeRepository'
import { collectCustomTypeReferences } from '../dataTypes/schemaGraph'
import { pickLeastUsedColor } from '../../lib/color/leastUsedColor'
import { PILL_PALETTE } from '../tags/tagPalette'
import type { Board, BoardColumn, Note, SelectOption } from '../entities.types'

function optionsOf(schema: {
  kind: string
  primitive?: string
  options?: SelectOption[]
}): SelectOption[] {
  return schema.kind === 'primitive' && schema.primitive === 'select' ? (schema.options ?? []) : []
}

export interface CreateBoardInput {
  title: string
  folderId: string | null
  statusTypeId: string
}

export async function createBoard(input: CreateBoardInput): Promise<Board> {
  const customType = await db.customDataTypes.get(input.statusTypeId)
  const options = customType ? optionsOf(customType.schema) : []

  const usedColors: string[] = []
  const columns: BoardColumn[] = options.map((option) => {
    const color = pickLeastUsedColor(PILL_PALETTE, usedColors)
    usedColors.push(color)
    return { id: option.id, name: option.label, tag: option.value, color, visible: true }
  })

  const { docId: cardsDocId } = createYDoc()
  const board: Board = {
    id: createId(),
    folderId: input.folderId,
    title: input.title,
    columns,
    cardsDocId,
    statusTypeId: input.statusTypeId,
  }

  await db.boards.add(board)
  return board
}

// Reconciles `board.columns` against the linked CustomDataType's current options on every
// read: unmatched options become new (board-locally-colored) columns, columns whose option
// vanished are dropped. Existing columns keep their stored position/color/visibility — only
// name/tag are refreshed and new columns are appended — so a board's own drag-reordered
// column order stays independent of the option set's order (see boardRepository plan notes).
export async function getBoard(id: string): Promise<Board | undefined> {
  const board = await db.boards.get(id)
  if (!board || !board.statusTypeId) return board

  const customType = await db.customDataTypes.get(board.statusTypeId)
  if (!customType) return board

  const options = optionsOf(customType.schema)
  const optionIds = new Set(options.map((option) => option.id))
  const optionById = new Map(options.map((option) => [option.id, option]))
  const existingIds = new Set(board.columns.map((column) => column.id))

  const keptExisting = board.columns
    .filter((column) => optionIds.has(column.id))
    .map((column) => {
      const option = optionById.get(column.id)!
      return { ...column, name: option.label, tag: option.value }
    })

  const usedColors = keptExisting.map((column) => column.color)
  const appended: BoardColumn[] = options
    .filter((option) => !existingIds.has(option.id))
    .map((option) => {
      const color = pickLeastUsedColor(PILL_PALETTE, usedColors)
      usedColors.push(color)
      return { id: option.id, name: option.label, tag: option.value, color, visible: true }
    })

  const reconciled = [...keptExisting, ...appended]
  if (JSON.stringify(reconciled) === JSON.stringify(board.columns)) return board

  await db.boards.update(id, { columns: reconciled })
  return { ...board, columns: reconciled }
}

// See notebookRepository.listNotebooksByFolder for why this is a filter, not a `.where().equals(null)`.
export async function listBoardsByFolder(folderId: string | null): Promise<Board[]> {
  return db.boards.filter((board) => board.folderId === folderId).toArray()
}

export async function renameBoard(id: string, title: string): Promise<void> {
  await db.boards.update(id, { title })
}

export async function moveBoard(id: string, folderId: string | null): Promise<void> {
  await db.boards.update(id, { folderId })
}

export async function setColumnColor(
  boardId: string,
  columnId: string,
  color: string,
): Promise<void> {
  const board = await db.boards.get(boardId)
  if (!board) return

  const columns = board.columns.map((column) =>
    column.id === columnId ? { ...column, color } : column,
  )
  await db.boards.update(boardId, { columns })
}

export async function setColumnVisibility(
  boardId: string,
  columnId: string,
  visible: boolean,
): Promise<void> {
  const board = await db.boards.get(boardId)
  if (!board) return

  const columns = board.columns.map((column) =>
    column.id === columnId ? { ...column, visible } : column,
  )
  await db.boards.update(boardId, { columns })
}

export async function reorderColumns(
  boardId: string,
  fromIndex: number,
  toIndex: number,
): Promise<void> {
  const board = await db.boards.get(boardId)
  if (!board || fromIndex === toIndex) return

  const columns = [...board.columns]
  const [moved] = columns.splice(fromIndex, 1)
  if (!moved) return
  columns.splice(toIndex, 0, moved)

  await db.boards.update(boardId, { columns })
}

// The single mutation behind the "Manage columns" UI: add/rename/delete of the columns'
// shared SelectOptions. `reassignments` maps a removed option's id to the id of a surviving
// option/column whose value replaces it on every affected note's `status` property — the
// caller (UI) must have already prompted the user for this before calling, since deleting a
// column with cards referencing it is never a silent reassignment.
export async function applyColumnEdits(
  boardId: string,
  name: string,
  options: SelectOption[],
  reassignments: Map<string, string> = new Map(),
): Promise<void> {
  if (options.length === 0) {
    throw new Error('A board must have at least one column')
  }

  const board = await db.boards.get(boardId)
  if (!board || !board.statusTypeId) return
  const customType = await db.customDataTypes.get(board.statusTypeId)
  if (!customType) return

  const currentOptions = optionsOf(customType.schema)
  const nextIds = new Set(options.map((option) => option.id))
  const removed = currentOptions.filter((option) => !nextIds.has(option.id))

  // Only removed columns that still have referencing cards need an explicit reassignment
  // target — an empty column can just be dropped, matching "no silent reassignment" (there's
  // nothing to silently reassign) rather than forcing a pointless choice on every removal.
  const affectedByRemovedOption = new Map<string, Note[]>()
  for (const option of removed) {
    const affectedNotes = await db.notes
      .where('boardId')
      .equals(boardId)
      .filter((note) => note.metadata.properties.status?.value === option.value)
      .toArray()
    if (affectedNotes.length > 0) affectedByRemovedOption.set(option.id, affectedNotes)
  }

  for (const option of removed) {
    if (affectedByRemovedOption.has(option.id) && !reassignments.has(option.id)) {
      throw new Error(
        `Column "${option.label}" needs a reassignment target before it can be removed`,
      )
    }
  }

  await db.transaction('rw', [db.customDataTypes, db.boards, db.notes], async () => {
    const optionById = new Map(options.map((option) => [option.id, option]))

    for (const option of removed) {
      const affectedNotes = affectedByRemovedOption.get(option.id)
      if (!affectedNotes) continue

      const targetOption = optionById.get(reassignments.get(option.id)!)
      if (!targetOption) continue

      for (const note of affectedNotes) {
        const status = note.metadata.properties.status
        if (!status) continue

        await db.notes.update(note.id, {
          'metadata.properties': {
            ...note.metadata.properties,
            status: { ...status, value: targetOption.value },
          },
          'metadata.updatedAt': new Date().toISOString(),
        })
      }
    }

    await updateCustomDataType(board.statusTypeId!, {
      name,
      schema: { kind: 'primitive', primitive: 'select', options },
    })

    const existingById = new Map(board.columns.map((column) => [column.id, column]))
    const usedColors = board.columns
      .filter((column) => nextIds.has(column.id))
      .map((column) => column.color)

    const nextColumns: BoardColumn[] = options.map((option) => {
      const existing = existingById.get(option.id)
      if (existing) {
        return { ...existing, name: option.label, tag: option.value }
      }
      const color = pickLeastUsedColor(PILL_PALETTE, usedColors)
      usedColors.push(color)
      return { id: option.id, name: option.label, tag: option.value, color, visible: true }
    })

    await db.boards.update(boardId, { columns: nextColumns })
  })
}

export interface StatusTypeReferenceSummary {
  otherBoardCount: number
  otherReferenceCount: number
}

// Read-only check the UI calls before showing the column-delete confirmation, so it can warn
// when the linked option set is shared by other boards or note properties (the permanent-link
// design means deleting an option here removes it everywhere it's referenced, not just here).
export async function findOtherStatusTypeReferences(
  boardId: string,
): Promise<StatusTypeReferenceSummary> {
  const board = await db.boards.get(boardId)
  if (!board || !board.statusTypeId) return { otherBoardCount: 0, otherReferenceCount: 0 }
  const statusTypeId = board.statusTypeId

  const otherBoardCount = await db.boards
    .where('statusTypeId')
    .equals(statusTypeId)
    .filter((other) => other.id !== boardId)
    .count()

  const referencingNoteTypeCount = await db.noteTypes
    .where('customTypeId')
    .equals(statusTypeId)
    .count()

  const allNotes = await db.notes.toArray()
  const referencingNoteCount = allNotes.filter(
    (note) =>
      note.boardId !== boardId &&
      Object.values(note.metadata.properties).some((property) =>
        collectCustomTypeReferences(property.typeRef).includes(statusTypeId),
      ),
  ).length

  return {
    otherBoardCount,
    otherReferenceCount: referencingNoteTypeCount + referencingNoteCount,
  }
}

export async function deleteBoard(id: string): Promise<void> {
  await runCascadeDelete({
    tables: [db.boards, db.notes, db.yjsUpdates],
    run: async () => {
      const board = await db.boards.get(id)
      await deleteNotesByBoardId(id)
      if (board) await deleteUpdateRows(board.cardsDocId)
      await db.boards.delete(id)
    },
  })
}

export async function deleteBoardsByFolderId(folderId: string): Promise<void> {
  await runCascadeDelete({
    tables: [db.boards, db.notes, db.yjsUpdates],
    run: async () => {
      const boards = await db.boards.where('folderId').equals(folderId).toArray()

      for (const board of boards) {
        await deleteNotesByBoardId(board.id)
        await deleteUpdateRows(board.cardsDocId)
      }

      await db.boards.where('folderId').equals(folderId).delete()
    },
  })
}
