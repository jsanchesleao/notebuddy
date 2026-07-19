import { describe, expect, it } from 'vitest'
import { filterSlashCommands, parseSlashQuery } from './slashCommand'

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

describe('filterSlashCommands', () => {
  it('returns all block types and text-format entries for an empty query', () => {
    const labels = filterSlashCommands('').map((entry) => entry.label)
    expect(labels).toEqual([
      'Text',
      'Image',
      'Sketch',
      'Code',
      'Table',
      'File',
      'Paragraph',
      'Heading 1',
      'Heading 2',
      'Heading 3',
      'Heading 4',
      'Citation',
      'Bulleted List',
      'Numbered List',
    ])
  })

  it('filters case-insensitively by label prefix', () => {
    expect(filterSlashCommands('tab').map((entry) => entry.label)).toEqual(['Table'])
    expect(filterSlashCommands('TAB').map((entry) => entry.label)).toEqual(['Table'])
  })

  it('matches text-format entries alongside block-type entries', () => {
    expect(filterSlashCommands('heading').map((entry) => entry.label)).toEqual([
      'Heading 1',
      'Heading 2',
      'Heading 3',
      'Heading 4',
    ])
  })

  it('returns an empty list when nothing matches', () => {
    expect(filterSlashCommands('xyz')).toEqual([])
  })

  it('tags block-type entries with kind "blockType" and text-format entries with kind "textFormat"', () => {
    const table = filterSlashCommands('table')[0]
    expect(table.kind).toBe('blockType')

    const heading = filterSlashCommands('heading 1')[0]
    expect(heading.kind).toBe('textFormat')
  })
})
