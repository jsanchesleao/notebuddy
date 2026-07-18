import { describe, expect, it } from 'vitest'
import { filterBlockTypes, parseSlashQuery } from './slashCommand'

describe('parseSlashQuery', () => {
  it('returns an empty query for a bare slash', () => {
    expect(parseSlashQuery('/')).toBe('')
  })

  it('returns the typed characters after the slash', () => {
    expect(parseSlashQuery('/tab')).toBe('tab')
  })

  it('returns null when the text does not start with a slash', () => {
    expect(parseSlashQuery('hello')).toBeNull()
    expect(parseSlashQuery('hello/tab')).toBeNull()
  })

  it('returns null once a space has been typed after the slash', () => {
    expect(parseSlashQuery('/tab ')).toBeNull()
    expect(parseSlashQuery('/tab more text')).toBeNull()
  })

  it('returns null for a second slash', () => {
    expect(parseSlashQuery('//')).toBeNull()
  })

  it('returns null for an empty string', () => {
    expect(parseSlashQuery('')).toBeNull()
  })
})

describe('filterBlockTypes', () => {
  it('returns all block types for an empty query', () => {
    expect(filterBlockTypes('').map((entry) => entry.type)).toEqual([
      'text',
      'image',
      'sketch',
      'code',
      'table',
      'embed',
    ])
  })

  it('filters case-insensitively by label prefix', () => {
    expect(filterBlockTypes('tab').map((entry) => entry.type)).toEqual(['table'])
    expect(filterBlockTypes('TAB').map((entry) => entry.type)).toEqual(['table'])
  })

  it('returns an empty list when nothing matches', () => {
    expect(filterBlockTypes('xyz')).toEqual([])
  })
})
