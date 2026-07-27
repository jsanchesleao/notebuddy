import { db } from '../../db/db'
import { createId } from '../ids'
import { ReferencedEntityError } from '../dataTypes/dataTypeRepository'
import type { NoteType } from '../entities.types'

export interface CreateNoteTypeInput {
  name: string
  customTypeId: string
}

export async function createNoteType(input: CreateNoteTypeInput): Promise<NoteType> {
  const now = new Date().toISOString()
  const noteType: NoteType = {
    id: createId(),
    name: input.name,
    customTypeId: input.customTypeId,
    createdAt: now,
    updatedAt: now,
  }

  await db.noteTypes.add(noteType)
  return noteType
}

export async function getNoteType(id: string): Promise<NoteType | undefined> {
  return db.noteTypes.get(id)
}

export async function listNoteTypes(): Promise<NoteType[]> {
  return db.noteTypes.toArray()
}

export interface UpdateNoteTypeInput {
  name?: string
  customTypeId?: string
}

export async function updateNoteType(id: string, input: UpdateNoteTypeInput): Promise<void> {
  await db.noteTypes.update(id, {
    ...input,
    updatedAt: new Date().toISOString(),
  })
}

export async function deleteNoteType(id: string): Promise<void> {
  const referencingNoteCount = await db.notes.where('noteTypeId').equals(id).count()

  if (referencingNoteCount > 0) {
    throw new ReferencedEntityError('Cannot delete: still used by one or more notes')
  }

  await db.noteTypes.delete(id)
}
