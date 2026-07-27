import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../../db/db'
import { createCustomDataType, ReferencedEntityError } from '../dataTypes/dataTypeRepository'
import {
  createNoteType,
  deleteNoteType,
  getNoteType,
  listNoteTypes,
  updateNoteType,
} from './noteTypeRepository'
import { createId } from '../ids'
import type { DataTypeRef, Note } from '../entities.types'

const textType: DataTypeRef = { kind: 'primitive', primitive: 'text' }

function buildNote(overrides: Partial<Note> = {}): Note {
  const now = new Date().toISOString()
  return {
    id: createId(),
    notebookId: null,
    boardId: null,
    noteTypeId: null,
    title: 'Untitled',
    metadata: { tags: [], createdAt: now, updatedAt: now, properties: {} },
    blockDocId: createId(),
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

beforeEach(async () => {
  await db.customDataTypes.clear()
  await db.noteTypes.clear()
  await db.notes.clear()
})

describe('noteTypeRepository', () => {
  it('creates and retrieves a note type', async () => {
    const customType = await createCustomDataType({
      name: 'Task',
      schema: { kind: 'dictionary', fields: [{ key: 'title', typeRef: textType }] },
    })
    const created = await createNoteType({ name: 'Task', customTypeId: customType.id })
    expect(await getNoteType(created.id)).toEqual(created)
  })

  it('lists all note types', async () => {
    const customType = await createCustomDataType({ name: 'Task', schema: textType })
    await createNoteType({ name: 'A', customTypeId: customType.id })
    await createNoteType({ name: 'B', customTypeId: customType.id })
    const all = await listNoteTypes()
    expect(all.map((type) => type.name).sort()).toEqual(['A', 'B'])
  })

  it('returns undefined for a missing id', async () => {
    expect(await getNoteType('missing')).toBeUndefined()
  })

  it('renames a note type and bumps updatedAt', async () => {
    const customType = await createCustomDataType({ name: 'Task', schema: textType })
    const created = await createNoteType({ name: 'Task', customTypeId: customType.id })
    await updateNoteType(created.id, { name: 'Project Task' })
    const updated = await getNoteType(created.id)
    expect(updated?.name).toBe('Project Task')
    expect(updated).toBeDefined()
    expect(updated!.updatedAt >= created.updatedAt).toBe(true)
  })

  it('deletes a note type with no notes referencing it', async () => {
    const customType = await createCustomDataType({ name: 'Task', schema: textType })
    const created = await createNoteType({ name: 'Task', customTypeId: customType.id })
    await deleteNoteType(created.id)
    expect(await getNoteType(created.id)).toBeUndefined()
  })

  it('blocks deleting a note type still referenced by a note, and allows it once cleared', async () => {
    const customType = await createCustomDataType({ name: 'Task', schema: textType })
    const created = await createNoteType({ name: 'Task', customTypeId: customType.id })
    const note = buildNote({ noteTypeId: created.id })
    await db.notes.add(note)

    await expect(deleteNoteType(created.id)).rejects.toThrow(ReferencedEntityError)
    expect(await getNoteType(created.id)).toBeDefined()

    await db.notes.update(note.id, { noteTypeId: null })
    await deleteNoteType(created.id)
    expect(await getNoteType(created.id)).toBeUndefined()
  })
})
