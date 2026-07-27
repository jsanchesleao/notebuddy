import { describe, expect, it } from 'vitest'
import { assertValid, SchemaValidationError, validateValue, type ValidationContext } from './schemaValidator'
import type { CustomDataType, DataTypeRef } from '../entities.types'

const noCustomTypes: ValidationContext = { resolveCustomType: () => undefined }

describe('validateValue — primitives', () => {
  it('validates text', () => {
    const type: DataTypeRef = { kind: 'primitive', primitive: 'text' }
    expect(validateValue(type, '', noCustomTypes)).toEqual([])
    expect(validateValue(type, 'hello', noCustomTypes)).toEqual([])
    expect(validateValue(type, 5, noCustomTypes)).not.toEqual([])
  })

  it('validates number, allowing null as "unset"', () => {
    const type: DataTypeRef = { kind: 'primitive', primitive: 'number' }
    expect(validateValue(type, 5, noCustomTypes)).toEqual([])
    expect(validateValue(type, null, noCustomTypes)).toEqual([])
    expect(validateValue(type, NaN, noCustomTypes)).not.toEqual([])
    expect(validateValue(type, '5', noCustomTypes)).not.toEqual([])
  })

  it('validates boolean', () => {
    const type: DataTypeRef = { kind: 'primitive', primitive: 'boolean' }
    expect(validateValue(type, true, noCustomTypes)).toEqual([])
    expect(validateValue(type, false, noCustomTypes)).toEqual([])
    expect(validateValue(type, null, noCustomTypes)).not.toEqual([])
  })

  it('validates date as YYYY-MM-DD or null', () => {
    const type: DataTypeRef = { kind: 'primitive', primitive: 'date' }
    expect(validateValue(type, '2026-07-27', noCustomTypes)).toEqual([])
    expect(validateValue(type, null, noCustomTypes)).toEqual([])
    expect(validateValue(type, '07/27/2026', noCustomTypes)).not.toEqual([])
  })

  it('validates time as HH:mm or null', () => {
    const type: DataTypeRef = { kind: 'primitive', primitive: 'time' }
    expect(validateValue(type, '09:30', noCustomTypes)).toEqual([])
    expect(validateValue(type, null, noCustomTypes)).toEqual([])
    expect(validateValue(type, '25:00', noCustomTypes)).not.toEqual([])
  })

  it('validates datetime as a parseable string or null', () => {
    const type: DataTypeRef = { kind: 'primitive', primitive: 'datetime' }
    expect(validateValue(type, '2026-07-27T09:30:00.000Z', noCustomTypes)).toEqual([])
    expect(validateValue(type, null, noCustomTypes)).toEqual([])
    expect(validateValue(type, 'not-a-date', noCustomTypes)).not.toEqual([])
  })

  it('validates color as a hex string, empty, or null', () => {
    const type: DataTypeRef = { kind: 'primitive', primitive: 'color' }
    expect(validateValue(type, '#fff', noCustomTypes)).toEqual([])
    expect(validateValue(type, '#a1b2c3', noCustomTypes)).toEqual([])
    expect(validateValue(type, '', noCustomTypes)).toEqual([])
    expect(validateValue(type, null, noCustomTypes)).toEqual([])
    expect(validateValue(type, 'red', noCustomTypes)).not.toEqual([])
  })

  it('validates link with a basic URL format check', () => {
    const type: DataTypeRef = { kind: 'primitive', primitive: 'link' }
    expect(validateValue(type, 'https://example.com', noCustomTypes)).toEqual([])
    expect(validateValue(type, '', noCustomTypes)).toEqual([])
    expect(validateValue(type, null, noCustomTypes)).toEqual([])
    expect(validateValue(type, 'not a url', noCustomTypes)).not.toEqual([])
  })

  it('validates select against its declared options', () => {
    const type: DataTypeRef = {
      kind: 'primitive',
      primitive: 'select',
      options: [
        { id: '1', label: 'Low', value: 'low' },
        { id: '2', label: 'High', value: 'high' },
      ],
    }
    expect(validateValue(type, 'low', noCustomTypes)).toEqual([])
    expect(validateValue(type, null, noCustomTypes)).toEqual([])
    expect(validateValue(type, 'medium', noCustomTypes)).not.toEqual([])
  })
})

describe('validateValue — composites', () => {
  const textType: DataTypeRef = { kind: 'primitive', primitive: 'text' }
  const numberType: DataTypeRef = { kind: 'primitive', primitive: 'number' }

  it('validates list items and enforces maxSize', () => {
    const type: DataTypeRef = { kind: 'list', itemType: textType, maxSize: 2 }
    expect(validateValue(type, ['a', 'b'], noCustomTypes)).toEqual([])
    expect(validateValue(type, ['a', 'b', 'c'], noCustomTypes)).not.toEqual([])
    expect(validateValue(type, ['a', 5], noCustomTypes)).not.toEqual([])
    expect(validateValue(type, 'not-a-list', noCustomTypes)).not.toEqual([])
  })

  it('validates set items and rejects duplicates', () => {
    const type: DataTypeRef = { kind: 'set', itemType: textType }
    expect(validateValue(type, ['a', 'b'], noCustomTypes)).toEqual([])
    expect(validateValue(type, ['a', 'a'], noCustomTypes)).not.toEqual([])
  })

  it('validates tuple length and positional types', () => {
    const type: DataTypeRef = { kind: 'tuple', itemTypes: [textType, numberType] }
    expect(validateValue(type, ['label', 1], noCustomTypes)).toEqual([])
    expect(validateValue(type, ['label'], noCustomTypes)).not.toEqual([])
    expect(validateValue(type, [1, 'label'], noCustomTypes)).not.toEqual([])
  })

  it('validates dictionary requires exactly the declared keys', () => {
    const type: DataTypeRef = {
      kind: 'dictionary',
      fields: [
        { key: 'name', typeRef: textType },
        { key: 'age', typeRef: numberType },
      ],
    }
    expect(validateValue(type, { name: 'Ada', age: 30 }, noCustomTypes)).toEqual([])
    expect(validateValue(type, { name: 'Ada' }, noCustomTypes)).not.toEqual([]) // missing key
    expect(
      validateValue(type, { name: 'Ada', age: 30, extra: true }, noCustomTypes),
    ).not.toEqual([]) // extra key
    expect(validateValue(type, { name: 'Ada', age: 'thirty' }, noCustomTypes)).not.toEqual([]) // wrong nested type
  })

  it('validates a Dictionary nesting a List of Tuples (acceptance scenario shape)', () => {
    const type: DataTypeRef = {
      kind: 'dictionary',
      fields: [
        {
          key: 'steps',
          typeRef: {
            kind: 'list',
            itemType: { kind: 'tuple', itemTypes: [textType, numberType] },
          },
        },
      ],
    }
    expect(
      validateValue(
        type,
        {
          steps: [
            ['Preheat', 1],
            ['Bake', 2],
          ],
        },
        noCustomTypes,
      ),
    ).toEqual([])
    expect(validateValue(type, { steps: [['Preheat', 'first']] }, noCustomTypes)).not.toEqual([])
  })

  it('resolves and delegates to a referenced custom type', () => {
    const inner: CustomDataType = {
      id: 'inner',
      name: 'Inner',
      schema: textType,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    }
    const ctx: ValidationContext = { resolveCustomType: (id) => (id === 'inner' ? inner : undefined) }
    const type: DataTypeRef = { kind: 'customTypeRef', customTypeId: 'inner' }

    expect(validateValue(type, 'hello', ctx)).toEqual([])
    expect(validateValue(type, 5, ctx)).not.toEqual([])
  })

  it('flags an unresolved custom type reference', () => {
    const type: DataTypeRef = { kind: 'customTypeRef', customTypeId: 'missing' }
    expect(validateValue(type, 'anything', noCustomTypes)).not.toEqual([])
  })
})

describe('assertValid', () => {
  it('does not throw for a valid value', () => {
    const type: DataTypeRef = { kind: 'primitive', primitive: 'text' }
    expect(() => assertValid(type, 'hello', noCustomTypes)).not.toThrow()
  })

  it('throws a SchemaValidationError with issues for an invalid value', () => {
    const type: DataTypeRef = { kind: 'primitive', primitive: 'number' }
    expect(() => assertValid(type, 'not a number', noCustomTypes)).toThrow(SchemaValidationError)
  })
})
