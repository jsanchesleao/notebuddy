import { describe, expect, it } from 'vitest'
import { buildItemTypeOptions, buildSchemaKindOptions, kindKeyFor, labelForTypeRef } from './schemaKinds'
import type { CustomDataType, DataTypeRef } from '../../domain/entities.types'

describe('kindKeyFor', () => {
  it('produces a distinct key per kind', () => {
    expect(kindKeyFor({ kind: 'primitive', primitive: 'text' })).toBe('primitive:text')
    expect(kindKeyFor({ kind: 'list', itemType: { kind: 'primitive', primitive: 'text' } })).toBe(
      'composite:list',
    )
    expect(kindKeyFor({ kind: 'customTypeRef', customTypeId: 'abc' })).toBe('customType:abc')
  })
})

describe('labelForTypeRef', () => {
  const noCustomTypes = () => undefined

  it('labels primitives by their display name', () => {
    expect(labelForTypeRef({ kind: 'primitive', primitive: 'datetime' }, noCustomTypes)).toBe(
      'Date & Time',
    )
  })

  it('labels composites by kind name', () => {
    expect(labelForTypeRef({ kind: 'dictionary', fields: [] }, noCustomTypes)).toBe('Dictionary')
  })

  it('resolves a customTypeRef to the referenced type name', () => {
    const custom: CustomDataType = {
      id: 'abc',
      name: 'Address',
      schema: { kind: 'primitive', primitive: 'text' },
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    }
    const typeRef: DataTypeRef = { kind: 'customTypeRef', customTypeId: 'abc' }
    expect(labelForTypeRef(typeRef, (id) => (id === 'abc' ? custom : undefined))).toBe('Address')
  })

  it('falls back to "Unknown type" for an unresolved reference', () => {
    expect(labelForTypeRef({ kind: 'customTypeRef', customTypeId: 'missing' }, noCustomTypes)).toBe(
      'Unknown type',
    )
  })
})

describe('buildSchemaKindOptions', () => {
  it('includes primitives only when requested', () => {
    const withPrimitives = buildSchemaKindOptions({
      availableCustomTypes: [],
      includePrimitives: true,
      isCustomTypeSelectable: () => true,
    })
    expect(withPrimitives.some((option) => option.key === 'primitive:text')).toBe(true)

    const withoutPrimitives = buildSchemaKindOptions({
      availableCustomTypes: [],
      includePrimitives: false,
      isCustomTypeSelectable: () => true,
    })
    expect(withoutPrimitives.some((option) => option.key.startsWith('primitive:'))).toBe(false)
  })

  it('always includes the four composite kinds', () => {
    const options = buildSchemaKindOptions({
      availableCustomTypes: [],
      includePrimitives: false,
      isCustomTypeSelectable: () => true,
    })
    expect(options.map((option) => option.key)).toEqual(
      expect.arrayContaining([
        'composite:list',
        'composite:set',
        'composite:tuple',
        'composite:dictionary',
      ]),
    )
  })

  it('filters out custom types excluded by isCustomTypeSelectable', () => {
    const typeA: CustomDataType = {
      id: 'a',
      name: 'A',
      schema: { kind: 'primitive', primitive: 'text' },
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    }
    const typeB: CustomDataType = { ...typeA, id: 'b', name: 'B' }

    const options = buildSchemaKindOptions({
      availableCustomTypes: [typeA, typeB],
      includePrimitives: false,
      isCustomTypeSelectable: (id) => id !== 'b',
    })

    expect(options.map((option) => option.key)).toContain('customType:a')
    expect(options.map((option) => option.key)).not.toContain('customType:b')
  })

  it('each option builds a fresh, structurally valid default schema', () => {
    const options = buildSchemaKindOptions({
      availableCustomTypes: [],
      includePrimitives: true,
      isCustomTypeSelectable: () => true,
    })
    const listOption = options.find((option) => option.key === 'composite:list')
    expect(listOption?.build()).toEqual({
      kind: 'list',
      itemType: { kind: 'primitive', primitive: 'text' },
    })
  })
})

describe('buildItemTypeOptions', () => {
  it('includes primitives', () => {
    const options = buildItemTypeOptions([])
    expect(options.some((option) => option.key === 'primitive:text')).toBe(true)
    expect(options.some((option) => option.key === 'primitive:number')).toBe(true)
  })

  it('includes available custom types', () => {
    const custom: CustomDataType = {
      id: 'abc',
      name: 'Address',
      schema: { kind: 'primitive', primitive: 'text' },
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    }
    const options = buildItemTypeOptions([custom])
    expect(options.map((option) => option.key)).toContain('customType:abc')
  })

  it('excludes all composite kinds', () => {
    const options = buildItemTypeOptions([])
    expect(options.some((option) => option.key.startsWith('composite:'))).toBe(false)
  })
})
