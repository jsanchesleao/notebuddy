import { db } from '../../db/db'
import { getOpfsDriver } from '../../lib/opfs/opfsDriver'
import { createId } from '../ids'
import { loadNoteBlocks } from '../blocks/noteBlocksStore'
import { createYDoc, loadYDoc } from '../yjs/yjsDocStore'
import { deleteUpdateRows } from '../yjs/yjsUpdatesTable'
import { createDefaultValue } from '../dataTypes/defaultValueGenerator'
import { assertValid } from '../dataTypes/schemaValidator'
import { getNoteType } from '../noteTypes/noteTypeRepository'
import { ensureTagColor } from '../tags/tagRepository'
import { runCascadeDelete } from '../cascadeDelete'
import { appendCard, removeCard } from '../boards/boardCardsStore'
import type { Board, CustomDataType, Note, PropertyValue } from '../entities.types'

async function deleteNoteAssets(note: Note): Promise<void> {
  const { blocks } = await loadNoteBlocks(note.blockDocId)
  const driver = getOpfsDriver()

  for (const block of blocks) {
    if ((block.type === 'image' || block.type === 'embed') && block.opfsPath) {
      await driver.deleteFile(block.opfsPath)
    }
  }
}

async function loadCustomTypeResolver(): Promise<(id: string) => CustomDataType | undefined> {
  const allTypes = await db.customDataTypes.toArray()
  const byId = new Map(allTypes.map((type) => [type.id, type]))
  return (id) => byId.get(id)
}

async function buildPropertiesFromNoteType(
  noteTypeId: string,
): Promise<Record<string, PropertyValue>> {
  const noteType = await getNoteType(noteTypeId)
  if (!noteType) return {}

  const customType = await db.customDataTypes.get(noteType.customTypeId)
  if (!customType || customType.schema.kind !== 'dictionary') return {}

  const resolveCustomType = await loadCustomTypeResolver()
  const properties: Record<string, PropertyValue> = {}

  for (const field of customType.schema.fields) {
    properties[field.key] = {
      typeRef: field.typeRef,
      value: createDefaultValue(field.typeRef, { resolveCustomType }),
    }
  }

  return properties
}

export interface CreateNoteInput {
  notebookId: string | null
  boardId?: string | null
  title: string
  noteTypeId?: string | null
  // Overrides which column's value a board card starts in — defaults to the board's first
  // visible column when omitted. Ignored when boardId is not set.
  statusValue?: string
}

// Resolves the board's status property + card-order entry for a newly created board card.
// Reads Board directly rather than going through boardRepository.getBoard to avoid a
// boardRepository <-> noteRepository import cycle (boardRepository already depends on this
// file for cascade deletes) — column reconciliation against the linked CustomDataType still
// happens whenever the board itself is next loaded, just not re-run here.
async function resolveBoardCardPlacement(
  boardId: string,
  statusValue: string | undefined,
): Promise<{ board: Board; column: Board['columns'][number] } | null> {
  const board = await db.boards.get(boardId)
  if (!board || !board.statusTypeId) return null

  const column = statusValue
    ? board.columns.find((candidate) => candidate.tag === statusValue)
    : board.columns.find((candidate) => candidate.visible)
  if (!column) return null

  return { board, column }
}

export async function createNote(input: CreateNoteInput): Promise<Note> {
  const now = new Date().toISOString()
  const { docId } = createYDoc()
  const properties = input.noteTypeId ? await buildPropertiesFromNoteType(input.noteTypeId) : {}

  const placement = input.boardId
    ? await resolveBoardCardPlacement(input.boardId, input.statusValue)
    : null

  if (placement) {
    properties.status = {
      typeRef: { kind: 'customTypeRef', customTypeId: placement.board.statusTypeId! },
      value: placement.column.tag,
    }
  }

  const note: Note = {
    id: createId(),
    notebookId: input.notebookId,
    boardId: input.boardId ?? null,
    noteTypeId: input.noteTypeId ?? null,
    title: input.title,
    metadata: {
      tags: [],
      createdAt: now,
      updatedAt: now,
      properties,
    },
    blockDocId: docId,
    createdAt: now,
    updatedAt: now,
  }

  await db.notes.add(note)

  if (placement) {
    const cardsDoc = await loadYDoc(placement.board.cardsDocId)
    await appendCard(placement.board.cardsDocId, cardsDoc, note.id, placement.column.id)
  }

  return note
}

export async function getNote(id: string): Promise<Note | undefined> {
  return db.notes.get(id)
}

export async function listNotesByNotebook(notebookId: string): Promise<Note[]> {
  return db.notes.where('notebookId').equals(notebookId).toArray()
}

export async function listNotesByBoardId(boardId: string): Promise<Note[]> {
  return db.notes.where('boardId').equals(boardId).toArray()
}

export async function renameNote(id: string, title: string): Promise<void> {
  const now = new Date().toISOString()
  await db.notes.update(id, {
    title,
    updatedAt: now,
    'metadata.updatedAt': now,
  })
}

export async function setNoteProperty(
  id: string,
  key: string,
  property: PropertyValue,
): Promise<void> {
  const note = await db.notes.get(id)
  if (!note) return

  const resolveCustomType = await loadCustomTypeResolver()
  assertValid(property.typeRef, property.value, { resolveCustomType })

  const now = new Date().toISOString()
  const properties = { ...note.metadata.properties, [key]: property }

  await db.notes.update(id, {
    'metadata.properties': properties,
    'metadata.updatedAt': now,
    updatedAt: now,
  })
}

export async function removeNoteProperty(id: string, key: string): Promise<void> {
  const note = await db.notes.get(id)
  if (!note) return

  const properties = { ...note.metadata.properties }
  delete properties[key]

  const now = new Date().toISOString()
  await db.notes.update(id, {
    'metadata.properties': properties,
    'metadata.updatedAt': now,
    updatedAt: now,
  })
}

export async function setNoteDescription(id: string, description: string): Promise<void> {
  const now = new Date().toISOString()
  await db.notes.update(id, {
    description,
    updatedAt: now,
    'metadata.updatedAt': now,
  })
}

export async function setNoteCardImagePath(id: string, cardImagePath: string): Promise<void> {
  const now = new Date().toISOString()
  await db.notes.update(id, {
    cardImagePath,
    updatedAt: now,
    'metadata.updatedAt': now,
  })
}

export async function clearNoteCardImagePath(id: string): Promise<void> {
  const now = new Date().toISOString()
  await db.notes.update(id, {
    cardImagePath: undefined,
    updatedAt: now,
    'metadata.updatedAt': now,
  })
}

export async function setNoteTags(id: string, tags: string[]): Promise<void> {
  const normalized = Array.from(
    new Set(tags.map((tag) => tag.trim()).filter((tag) => tag.length > 0)),
  )
  const now = new Date().toISOString()

  await db.notes.update(id, {
    'metadata.tags': normalized,
    'metadata.updatedAt': now,
    updatedAt: now,
  })

  // Registers a color for any tag name seen for the first time anywhere in the app — a
  // no-op for tags that are already registered.
  await Promise.all(normalized.map((tag) => ensureTagColor(tag)))
}

async function deleteNotesWithCleanup(notes: Note[]): Promise<void> {
  await runCascadeDelete({
    tables: [db.notes, db.yjsUpdates],
    beforeTransaction: async () => {
      for (const note of notes) {
        await deleteNoteAssets(note)
      }
    },
    run: async () => {
      for (const note of notes) {
        await deleteUpdateRows(note.blockDocId)
        await db.notes.delete(note.id)
      }
    },
  })
}

export async function deleteNote(id: string): Promise<void> {
  const note = await db.notes.get(id)
  if (!note) return

  // Only relevant for deleting a single still-alive card: when the whole board is deleted
  // (deleteNotesByBoardId below), its cardsDocId's yjsUpdates rows are wiped wholesale right
  // after, so there's no stale-entry risk to clean up card-by-card there.
  if (note.boardId) {
    const board = await db.boards.get(note.boardId)
    if (board) {
      const cardsDoc = await loadYDoc(board.cardsDocId)
      await removeCard(board.cardsDocId, cardsDoc, note.id)
    }
  }

  await deleteNotesWithCleanup([note])
}

export async function deleteNotesByNotebookId(notebookId: string): Promise<void> {
  const notes = await db.notes.where('notebookId').equals(notebookId).toArray()
  await deleteNotesWithCleanup(notes)
}

export async function deleteNotesByBoardId(boardId: string): Promise<void> {
  const notes = await db.notes.where('boardId').equals(boardId).toArray()
  await deleteNotesWithCleanup(notes)
}
