import { describe, expect, it } from 'vitest'
import { collectCustomTypeReferences, findCustomDataTypesReferencing, wouldCreateCycle } from './schemaGraph'
import type { CustomDataType, DataTypeRef } from '../entities.types'

function textType(): DataTypeRef {
  return { kind: 'primitive', primitive: 'text' }
}

function customType(id: string, schema: DataTypeRef, overrides: Partial<CustomDataType> = {}): CustomDataType {
  return {
    id,
    name: id,
    schema,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

describe('collectCustomTypeReferences', () => {
  it('returns an empty list for a schema with no custom type references', () => {
    const schema: DataTypeRef = { kind: 'list', itemType: textType() }
    expect(collectCustomTypeReferences(schema)).toEqual([])
  })

  it('finds a reference nested inside list/tuple/dictionary', () => {
    const schema: DataTypeRef = {
      kind: 'dictionary',
      fields: [
        {
          key: 'items',
          typeRef: {
            kind: 'list',
            itemType: {
              kind: 'tuple',
              itemTypes: [textType(), { kind: 'customTypeRef', customTypeId: 'address' }],
            },
          },
        },
      ],
    }
    expect(collectCustomTypeReferences(schema)).toEqual(['address'])
  })

  it('collects duplicate references as many times as they appear', () => {
    const schema: DataTypeRef = {
      kind: 'tuple',
      itemTypes: [
        { kind: 'customTypeRef', customTypeId: 'a' },
        { kind: 'customTypeRef', customTypeId: 'a' },
      ],
    }
    expect(collectCustomTypeReferences(schema)).toEqual(['a', 'a'])
  })
})

describe('wouldCreateCycle', () => {
  it('returns false when ownerId is null (creating a brand new type)', () => {
    const schema: DataTypeRef = { kind: 'customTypeRef', customTypeId: 'anything' }
    expect(wouldCreateCycle(null, schema, () => undefined)).toBe(false)
  })

  it('detects a direct self-reference', () => {
    const schema: DataTypeRef = { kind: 'customTypeRef', customTypeId: 'a' }
    expect(wouldCreateCycle('a', schema, () => undefined)).toBe(true)
  })

  it('detects an indirect cycle (A -> B -> A)', () => {
    const typeA = customType('a', { kind: 'customTypeRef', customTypeId: 'b' })
    const typeB = customType('b', { kind: 'customTypeRef', customTypeId: 'a' })
    const resolve = (id: string) => ({ a: typeA, b: typeB })[id]

    expect(wouldCreateCycle('a', typeB.schema, resolve)).toBe(true)
  })

  it('does not flag a legitimate diamond reference as a cycle', () => {
    const typeC = customType('c', textType())
    const typeB = customType('b', { kind: 'customTypeRef', customTypeId: 'c' })
    const typeD = customType('d', { kind: 'customTypeRef', customTypeId: 'c' })
    const resolve = (id: string) => ({ b: typeB, c: typeC, d: typeD })[id]

    const schema: DataTypeRef = {
      kind: 'tuple',
      itemTypes: [
        { kind: 'customTypeRef', customTypeId: 'b' },
        { kind: 'customTypeRef', customTypeId: 'd' },
      ],
    }

    expect(wouldCreateCycle('a', schema, resolve)).toBe(false)
  })

  it('returns false for a reference to an unresolvable type id', () => {
    const schema: DataTypeRef = { kind: 'customTypeRef', customTypeId: 'missing' }
    expect(wouldCreateCycle('a', schema, () => undefined)).toBe(false)
  })
})

describe('findCustomDataTypesReferencing', () => {
  it('finds only types whose schema directly references the given id', () => {
    const referencing = customType('referencing', { kind: 'customTypeRef', customTypeId: 'target' })
    const unrelated = customType('unrelated', textType())

    expect(findCustomDataTypesReferencing('target', [referencing, unrelated])).toEqual([referencing])
  })

  it('returns an empty array when nothing references the id', () => {
    const unrelated = customType('unrelated', textType())
    expect(findCustomDataTypesReferencing('target', [unrelated])).toEqual([])
  })
})
