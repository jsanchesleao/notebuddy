import { db } from '../../db/db'
import { createId } from '../ids'
import type { CustomDataType, DataTypeRef } from '../entities.types'
import {
  collectCustomTypeReferences,
  findCustomDataTypesReferencing,
  wouldCreateCycle,
} from './schemaGraph'

export class ReferencedEntityError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ReferencedEntityError'
  }
}

export interface CreateCustomDataTypeInput {
  name: string
  schema: DataTypeRef
}

export async function createCustomDataType(
  input: CreateCustomDataTypeInput,
): Promise<CustomDataType> {
  const now = new Date().toISOString()
  const customDataType: CustomDataType = {
    id: createId(),
    name: input.name,
    schema: input.schema,
    createdAt: now,
    updatedAt: now,
  }

  await db.customDataTypes.add(customDataType)
  return customDataType
}

export async function getCustomDataType(id: string): Promise<CustomDataType | undefined> {
  return db.customDataTypes.get(id)
}

export async function listCustomDataTypes(): Promise<CustomDataType[]> {
  return db.customDataTypes.toArray()
}

export interface UpdateCustomDataTypeInput {
  name?: string
  schema?: DataTypeRef
}

export async function updateCustomDataType(
  id: string,
  input: UpdateCustomDataTypeInput,
): Promise<void> {
  if (input.schema) {
    const allTypes = await db.customDataTypes.toArray()
    const resolve = (typeId: string) => allTypes.find((type) => type.id === typeId)

    if (wouldCreateCycle(id, input.schema, resolve)) {
      throw new Error('This change would create a circular type reference')
    }
  }

  await db.customDataTypes.update(id, {
    ...input,
    updatedAt: new Date().toISOString(),
  })
}

export async function deleteCustomDataType(id: string): Promise<void> {
  const allTypes = await db.customDataTypes.toArray()
  const referencingTypes = findCustomDataTypesReferencing(id, allTypes)

  if (referencingTypes.length > 0) {
    throw new ReferencedEntityError(
      `Cannot delete: still referenced by custom type "${referencingTypes[0].name}"`,
    )
  }

  const referencingNoteTypeCount = await db.noteTypes.where('customTypeId').equals(id).count()

  if (referencingNoteTypeCount > 0) {
    throw new ReferencedEntityError('Cannot delete: still used by a Note Type')
  }

  const referencingBoardCount = await db.boards.where('statusTypeId').equals(id).count()

  if (referencingBoardCount > 0) {
    throw new ReferencedEntityError(
      `Cannot delete: still used by ${referencingBoardCount} board${referencingBoardCount === 1 ? '' : 's'}`,
    )
  }

  const allNotes = await db.notes.toArray()
  const referencingNoteCount = allNotes.filter((note) =>
    Object.values(note.metadata.properties).some((property) =>
      collectCustomTypeReferences(property.typeRef).includes(id),
    ),
  ).length

  if (referencingNoteCount > 0) {
    throw new ReferencedEntityError(
      `Cannot delete: still used by ${referencingNoteCount} note${referencingNoteCount === 1 ? '' : 's'}`,
    )
  }

  await db.customDataTypes.delete(id)
}
