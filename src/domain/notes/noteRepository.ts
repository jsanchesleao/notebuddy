import { db } from '../../db/db'
import { getOpfsDriver } from '../../lib/opfs/opfsDriver'
import { createId } from '../ids'
import { loadNoteBlocks } from '../blocks/noteBlocksStore'
import { createYDoc } from '../yjs/yjsDocStore'
import { deleteUpdateRows } from '../yjs/yjsUpdatesTable'
import { createDefaultValue } from '../dataTypes/defaultValueGenerator'
import { assertValid } from '../dataTypes/schemaValidator'
import { getNoteType } from '../noteTypes/noteTypeRepository'
import type { CustomDataType, Note, PropertyValue } from '../entities.types'

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
}

export async function createNote(input: CreateNoteInput): Promise<Note> {
  const now = new Date().toISOString()
  const { docId } = createYDoc()
  const properties = input.noteTypeId
    ? await buildPropertiesFromNoteType(input.noteTypeId)
    : {}

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
  return note
}

export async function getNote(id: string): Promise<Note | undefined> {
  return db.notes.get(id)
}

export async function listNotesByNotebook(notebookId: string): Promise<Note[]> {
  return db.notes.where('notebookId').equals(notebookId).toArray()
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
}

export async function deleteNote(id: string): Promise<void> {
  const note = await db.notes.get(id)
  if (!note) return

  await deleteNoteAssets(note)

  await db.transaction('rw', db.notes, db.yjsUpdates, async () => {
    await deleteUpdateRows(note.blockDocId)
    await db.notes.delete(id)
  })
}

export async function deleteNotesByNotebookId(notebookId: string): Promise<void> {
  const notes = await db.notes.where('notebookId').equals(notebookId).toArray()

  for (const note of notes) {
    await deleteNoteAssets(note)
  }

  await db.transaction('rw', db.notes, db.yjsUpdates, async () => {
    for (const note of notes) {
      await deleteUpdateRows(note.blockDocId)
    }

    await db.notes.where('notebookId').equals(notebookId).delete()
  })
}
