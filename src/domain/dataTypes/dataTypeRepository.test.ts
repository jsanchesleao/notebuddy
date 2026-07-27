import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../../db/db'
import {
  createCustomDataType,
  deleteCustomDataType,
  getCustomDataType,
  listCustomDataTypes,
  ReferencedEntityError,
  updateCustomDataType,
} from './dataTypeRepository'
import type { DataTypeRef, NoteType } from '../entities.types'

const textType: DataTypeRef = { kind: 'primitive', primitive: 'text' }

beforeEach(async () => {
  await db.customDataTypes.clear()
  await db.noteTypes.clear()
})

describe('dataTypeRepository', () => {
  it('creates and retrieves a custom data type', async () => {
    const created = await createCustomDataType({ name: 'Recipe', schema: textType })
    expect(await getCustomDataType(created.id)).toEqual(created)
  })

  it('lists all custom data types', async () => {
    await createCustomDataType({ name: 'A', schema: textType })
    await createCustomDataType({ name: 'B', schema: textType })
    const all = await listCustomDataTypes()
    expect(all.map((type) => type.name).sort()).toEqual(['A', 'B'])
  })

  it('returns undefined for a missing id', async () => {
    expect(await getCustomDataType('missing')).toBeUndefined()
  })

  it('renames a custom data type and bumps updatedAt', async () => {
    const created = await createCustomDataType({ name: 'Recipe', schema: textType })
    await updateCustomDataType(created.id, { name: 'Meal Plan' })
    const updated = await getCustomDataType(created.id)
    expect(updated?.name).toBe('Meal Plan')
    expect(updated).toBeDefined()
    expect(updated!.updatedAt >= created.updatedAt).toBe(true)
  })

  it('allows editing a schema freely when it is not referenced by anything', async () => {
    const created = await createCustomDataType({ name: 'Recipe', schema: textType })
    const newSchema: DataTypeRef = { kind: 'list', itemType: textType }
    await updateCustomDataType(created.id, { schema: newSchema })
    expect((await getCustomDataType(created.id))?.schema).toEqual(newSchema)
  })

  it('rejects a schema update that would introduce a circular reference', async () => {
    const a = await createCustomDataType({ name: 'A', schema: textType })
    const b = await createCustomDataType({
      name: 'B',
      schema: { kind: 'customTypeRef', customTypeId: a.id },
    })
    await expect(
      updateCustomDataType(a.id, { schema: { kind: 'customTypeRef', customTypeId: b.id } }),
    ).rejects.toThrow(/circular/i)
  })

  it('deletes a custom data type that is not referenced by anything', async () => {
    const created = await createCustomDataType({ name: 'Recipe', schema: textType })
    await deleteCustomDataType(created.id)
    expect(await getCustomDataType(created.id)).toBeUndefined()
  })

  it('blocks deleting a custom data type referenced by another custom data type', async () => {
    const inner = await createCustomDataType({ name: 'Inner', schema: textType })
    await createCustomDataType({
      name: 'Outer',
      schema: { kind: 'customTypeRef', customTypeId: inner.id },
    })

    await expect(deleteCustomDataType(inner.id)).rejects.toThrow(ReferencedEntityError)
    expect(await getCustomDataType(inner.id)).toBeDefined()
  })

  it('blocks deleting a custom data type referenced by a note type', async () => {
    const custom = await createCustomDataType({
      name: 'Task',
      schema: { kind: 'dictionary', fields: [{ key: 'title', typeRef: textType }] },
    })
    const noteType: NoteType = {
      id: 'note-type-1',
      name: 'Task',
      customTypeId: custom.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    await db.noteTypes.add(noteType)

    await expect(deleteCustomDataType(custom.id)).rejects.toThrow(ReferencedEntityError)
    expect(await getCustomDataType(custom.id)).toBeDefined()
  })

  it('does not block deleting an unrelated custom data type', async () => {
    const referenced = await createCustomDataType({ name: 'Referenced', schema: textType })
    const unrelated = await createCustomDataType({ name: 'Unrelated', schema: textType })
    await createCustomDataType({
      name: 'Outer',
      schema: { kind: 'customTypeRef', customTypeId: referenced.id },
    })

    await deleteCustomDataType(unrelated.id)
    expect(await getCustomDataType(unrelated.id)).toBeUndefined()
    expect(await getCustomDataType(referenced.id)).toBeDefined()
  })
})
