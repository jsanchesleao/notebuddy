import { describe, expect, it } from 'vitest'
import { createDefaultValue, type DefaultValueContext } from './defaultValueGenerator'
import { assertValid } from './schemaValidator'
import type { CustomDataType, DataTypeRef } from '../entities.types'

const noCustomTypes: DefaultValueContext = { resolveCustomType: () => undefined }

describe('createDefaultValue — primitives', () => {
  it.each([
    ['text', ''],
    ['link', ''],
    ['color', ''],
    ['number', null],
    ['date', null],
    ['time', null],
    ['datetime', null],
    ['select', null],
    ['boolean', false],
  ] as const)('defaults %s to %j', (primitive, expected) => {
    const type: DataTypeRef = { kind: 'primitive', primitive }
    expect(createDefaultValue(type, noCustomTypes)).toEqual(expected)
  })
})

describe('createDefaultValue — composites', () => {
  const textType: DataTypeRef = { kind: 'primitive', primitive: 'text' }

  it('defaults list and set to an empty array', () => {
    expect(createDefaultValue({ kind: 'list', itemType: textType }, noCustomTypes)).toEqual([])
    expect(createDefaultValue({ kind: 'set', itemType: textType }, noCustomTypes)).toEqual([])
  })

  it('defaults tuple to a positional array of each slot default', () => {
    const type: DataTypeRef = {
      kind: 'tuple',
      itemTypes: [textType, { kind: 'primitive', primitive: 'number' }],
    }
    expect(createDefaultValue(type, noCustomTypes)).toEqual(['', null])
  })

  it('defaults dictionary to an object with every declared key defaulted', () => {
    const type: DataTypeRef = {
      kind: 'dictionary',
      fields: [
        { key: 'name', typeRef: textType },
        { key: 'active', typeRef: { kind: 'primitive', primitive: 'boolean' } },
      ],
    }
    expect(createDefaultValue(type, noCustomTypes)).toEqual({ name: '', active: false })
  })

  it('builds a Dictionary nesting a List of Tuples default that itself validates cleanly (acceptance scenario)', () => {
    const type: DataTypeRef = {
      kind: 'dictionary',
      fields: [
        {
          key: 'steps',
          typeRef: {
            kind: 'list',
            itemType: {
              kind: 'tuple',
              itemTypes: [textType, { kind: 'primitive', primitive: 'number' }],
            },
          },
        },
      ],
    }
    const defaultValue = createDefaultValue(type, noCustomTypes)
    expect(defaultValue).toEqual({ steps: [] })
    expect(() => assertValid(type, defaultValue, noCustomTypes)).not.toThrow()
  })

  it('resolves a customTypeRef default through the referenced schema', () => {
    const inner: CustomDataType = {
      id: 'inner',
      name: 'Inner',
      schema: textType,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    }
    const ctx: DefaultValueContext = { resolveCustomType: (id) => (id === 'inner' ? inner : undefined) }
    const type: DataTypeRef = { kind: 'customTypeRef', customTypeId: 'inner' }
    expect(createDefaultValue(type, ctx)).toBe('')
  })

  it('falls back to null for an unresolved customTypeRef', () => {
    const type: DataTypeRef = { kind: 'customTypeRef', customTypeId: 'missing' }
    expect(createDefaultValue(type, noCustomTypes)).toBeNull()
  })
})
