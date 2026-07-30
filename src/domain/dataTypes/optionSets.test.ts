import { describe, expect, it } from 'vitest'
import { isOptionSetSchema } from './optionSets'
import type { DataTypeRef } from '../entities.types'

describe('isOptionSetSchema', () => {
  it('returns true for a select primitive schema', () => {
    const schema: DataTypeRef = { kind: 'primitive', primitive: 'select', options: [] }
    expect(isOptionSetSchema(schema)).toBe(true)
  })

  it('returns false for other primitive kinds', () => {
    const schema: DataTypeRef = { kind: 'primitive', primitive: 'text' }
    expect(isOptionSetSchema(schema)).toBe(false)
  })

  it('returns false for composite kinds', () => {
    const dictionary: DataTypeRef = { kind: 'dictionary', fields: [] }
    const list: DataTypeRef = { kind: 'list', itemType: { kind: 'primitive', primitive: 'text' } }
    expect(isOptionSetSchema(dictionary)).toBe(false)
    expect(isOptionSetSchema(list)).toBe(false)
  })
})
