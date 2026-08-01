import { describe, expect, it } from 'vitest'
import {
  collectFilterableProperties,
  filterNotes,
  noteMatchesFilter,
  noteMatchesSearch,
} from './noteFilterMatch'
import { createId } from '../ids'
import type { CustomDataType, DataTypeRef, Note, PropertyValueData } from '../entities.types'
import type { FilterCriterion, FilterState } from './noteFilter.types'

const noCustomTypes = () => undefined as CustomDataType | undefined

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

function withProperty(
  note: Note,
  key: string,
  typeRef: DataTypeRef,
  value: PropertyValueData,
): Note {
  return {
    ...note,
    metadata: {
      ...note.metadata,
      properties: { ...note.metadata.properties, [key]: { typeRef, value } },
    },
  }
}

function block(criteria: FilterCriterion[]): FilterState['blocks'][number] {
  return { id: createId(), criteria }
}

function tagCriterion(tag: string): FilterCriterion {
  return { id: createId(), kind: 'tag', tag }
}

function titleCriterion(text: string): FilterCriterion {
  return { id: createId(), kind: 'title', text }
}

function noteTypeCriterion(noteTypeId: string | null): FilterCriterion {
  return { id: createId(), kind: 'noteType', noteTypeId }
}

describe('noteMatchesFilter — no active filter', () => {
  it('matches everything when there are no blocks', () => {
    const note = buildNote()
    expect(noteMatchesFilter(note, { mode: 'and', blocks: [] }, noCustomTypes)).toBe(true)
  })

  it('matches everything when every block is empty', () => {
    const note = buildNote()
    const filter: FilterState = { mode: 'and', blocks: [block([]), block([])] }
    expect(noteMatchesFilter(note, filter, noCustomTypes)).toBe(true)
  })
})

describe('noteMatchesFilter — criterion kinds', () => {
  it('tag: matches when the note has the tag', () => {
    const note = buildNote({
      metadata: { tags: ['work'], createdAt: '', updatedAt: '', properties: {} },
    })
    const filter: FilterState = { mode: 'and', blocks: [block([tagCriterion('work')])] }
    expect(noteMatchesFilter(note, filter, noCustomTypes)).toBe(true)
    expect(
      noteMatchesFilter(
        note,
        { mode: 'and', blocks: [block([tagCriterion('home')])] },
        noCustomTypes,
      ),
    ).toBe(false)
  })

  it('noteType: matches on exact noteTypeId, including null', () => {
    const note = buildNote({ noteTypeId: 'type-1' })
    expect(
      noteMatchesFilter(
        note,
        { mode: 'and', blocks: [block([noteTypeCriterion('type-1')])] },
        noCustomTypes,
      ),
    ).toBe(true)
    expect(
      noteMatchesFilter(
        note,
        { mode: 'and', blocks: [block([noteTypeCriterion(null)])] },
        noCustomTypes,
      ),
    ).toBe(false)
  })

  it('title: case-insensitive substring match', () => {
    const note = buildNote({ title: 'Weekly Planning' })
    expect(
      noteMatchesFilter(
        note,
        { mode: 'and', blocks: [block([titleCriterion('plan')])] },
        noCustomTypes,
      ),
    ).toBe(true)
    expect(
      noteMatchesFilter(
        note,
        { mode: 'and', blocks: [block([titleCriterion('xyz')])] },
        noCustomTypes,
      ),
    ).toBe(false)
  })

  it('title: an empty/unset text never matches (not "every note")', () => {
    const note = buildNote({ title: 'Weekly Planning' })
    expect(
      noteMatchesFilter(
        note,
        { mode: 'and', blocks: [block([titleCriterion('')])] },
        noCustomTypes,
      ),
    ).toBe(false)
  })
})

describe('noteMatchesFilter — property criterion operators', () => {
  const textType: DataTypeRef = { kind: 'primitive', primitive: 'text' }
  const numberType: DataTypeRef = { kind: 'primitive', primitive: 'number' }
  const dateType: DataTypeRef = { kind: 'primitive', primitive: 'date' }
  const boolType: DataTypeRef = { kind: 'primitive', primitive: 'boolean' }

  function propertyCriterion(
    overrides: Partial<Extract<FilterCriterion, { kind: 'property' }>>,
  ): FilterCriterion {
    return {
      id: createId(),
      kind: 'property',
      propertyKey: 'field',
      primitive: 'text',
      operator: 'contains',
      operand: '',
      ...overrides,
    }
  }

  it('text: contains, case-insensitive', () => {
    const note = withProperty(buildNote(), 'field', textType, 'Chocolate Cake')
    const criterion = propertyCriterion({
      primitive: 'text',
      operator: 'contains',
      operand: 'cake',
    })
    expect(
      noteMatchesFilter(note, { mode: 'and', blocks: [block([criterion])] }, noCustomTypes),
    ).toBe(true)
  })

  it('number: equals / greaterThan / lessThan', () => {
    const note = withProperty(buildNote(), 'field', numberType, 5)
    const equals = propertyCriterion({ primitive: 'number', operator: 'equals', operand: 5 })
    const greater = propertyCriterion({ primitive: 'number', operator: 'greaterThan', operand: 3 })
    const less = propertyCriterion({ primitive: 'number', operator: 'lessThan', operand: 3 })

    expect(noteMatchesFilter(note, { mode: 'and', blocks: [block([equals])] }, noCustomTypes)).toBe(
      true,
    )
    expect(
      noteMatchesFilter(note, { mode: 'and', blocks: [block([greater])] }, noCustomTypes),
    ).toBe(true)
    expect(noteMatchesFilter(note, { mode: 'and', blocks: [block([less])] }, noCustomTypes)).toBe(
      false,
    )
  })

  it('date: equals / before / after (fixed-width string comparison)', () => {
    const note = withProperty(buildNote(), 'field', dateType, '2026-06-15')
    const equals = propertyCriterion({
      primitive: 'date',
      operator: 'equals',
      operand: '2026-06-15',
    })
    const before = propertyCriterion({
      primitive: 'date',
      operator: 'before',
      operand: '2026-07-01',
    })
    const after = propertyCriterion({ primitive: 'date', operator: 'after', operand: '2026-07-01' })

    expect(noteMatchesFilter(note, { mode: 'and', blocks: [block([equals])] }, noCustomTypes)).toBe(
      true,
    )
    expect(noteMatchesFilter(note, { mode: 'and', blocks: [block([before])] }, noCustomTypes)).toBe(
      true,
    )
    expect(noteMatchesFilter(note, { mode: 'and', blocks: [block([after])] }, noCustomTypes)).toBe(
      false,
    )
  })

  it('boolean: equals only', () => {
    const note = withProperty(buildNote(), 'field', boolType, true)
    const criterion = propertyCriterion({ primitive: 'boolean', operator: 'equals', operand: true })
    expect(
      noteMatchesFilter(note, { mode: 'and', blocks: [block([criterion])] }, noCustomTypes),
    ).toBe(true)
  })

  it('never matches an unset/default operand', () => {
    const note = withProperty(buildNote(), 'field', textType, 'Cake')
    const criterion = propertyCriterion({ primitive: 'text', operator: 'contains', operand: '' })
    expect(
      noteMatchesFilter(note, { mode: 'and', blocks: [block([criterion])] }, noCustomTypes),
    ).toBe(false)
  })

  it('never matches when the property is missing', () => {
    const note = buildNote()
    const criterion = propertyCriterion({
      primitive: 'text',
      operator: 'contains',
      operand: 'cake',
    })
    expect(
      noteMatchesFilter(note, { mode: 'and', blocks: [block([criterion])] }, noCustomTypes),
    ).toBe(false)
  })

  it('never matches when the property has since drifted to a different kind', () => {
    const note = withProperty(buildNote(), 'field', numberType, 5)
    const criterion = propertyCriterion({ primitive: 'text', operator: 'contains', operand: '5' })
    expect(
      noteMatchesFilter(note, { mode: 'and', blocks: [block([criterion])] }, noCustomTypes),
    ).toBe(false)
  })
})

describe('noteMatchesFilter — AND/OR duality across blocks and within blocks', () => {
  const note = buildNote({
    title: 'Weekly Planning',
    metadata: { tags: ['work'], createdAt: '', updatedAt: '', properties: {} },
  })

  it('mode=and: criteria within a block AND together, blocks OR together', () => {
    const matchingBlock = block([tagCriterion('work'), titleCriterion('plan')])
    const partiallyMatchingBlock = block([tagCriterion('work'), titleCriterion('xyz')])
    const nonMatchingBlock = block([tagCriterion('home')])

    // A block with all-true criteria makes the whole (OR-combined) filter match.
    expect(
      noteMatchesFilter(
        note,
        { mode: 'and', blocks: [nonMatchingBlock, matchingBlock] },
        noCustomTypes,
      ),
    ).toBe(true)

    // A block with one false criterion (AND) fails that block; if it's the only block, no match.
    expect(
      noteMatchesFilter(note, { mode: 'and', blocks: [partiallyMatchingBlock] }, noCustomTypes),
    ).toBe(false)

    // No block matches -> overall false.
    expect(
      noteMatchesFilter(note, { mode: 'and', blocks: [nonMatchingBlock] }, noCustomTypes),
    ).toBe(false)
  })

  it('mode=or: criteria within a block OR together, blocks AND together', () => {
    const eitherMatchesBlock = block([tagCriterion('home'), titleCriterion('plan')])
    const bothFailBlock = block([tagCriterion('home'), titleCriterion('xyz')])

    // Every block must have at least one true criterion (OR) for the (AND-combined) filter to match.
    expect(
      noteMatchesFilter(note, { mode: 'or', blocks: [eitherMatchesBlock] }, noCustomTypes),
    ).toBe(true)

    expect(
      noteMatchesFilter(
        note,
        { mode: 'or', blocks: [eitherMatchesBlock, bothFailBlock] },
        noCustomTypes,
      ),
    ).toBe(false)
  })
})

describe('filterNotes', () => {
  it('returns only the notes matching the filter', () => {
    const matching = buildNote({ title: 'Match me' })
    const nonMatching = buildNote({ title: 'Skip me' })
    const filter: FilterState = { mode: 'and', blocks: [block([titleCriterion('match')])] }

    expect(filterNotes([matching, nonMatching], filter, noCustomTypes)).toEqual([matching])
  })
})

describe('collectFilterableProperties', () => {
  const textType: DataTypeRef = { kind: 'primitive', primitive: 'text' }
  const dictType: DataTypeRef = { kind: 'dictionary', fields: [] }

  it('collects the union of primitive property keys across notes, deduped and sorted', () => {
    const noteA = withProperty(buildNote(), 'title', textType, 'a')
    const noteB = withProperty(buildNote(), 'author', textType, 'b')
    const noteC = withProperty(buildNote(), 'title', textType, 'c')

    const result = collectFilterableProperties([noteA, noteB, noteC], noCustomTypes)
    expect(result.map((p) => p.key)).toEqual(['author', 'title'])
  })

  it('excludes composite-typed properties', () => {
    const note = withProperty(buildNote(), 'recipe', dictType, {})
    expect(collectFilterableProperties([note], noCustomTypes)).toEqual([])
  })

  it('excludes properties whose customTypeRef no longer resolves', () => {
    const note = withProperty(
      buildNote(),
      'broken',
      { kind: 'customTypeRef', customTypeId: 'missing' },
      null,
    )
    expect(collectFilterableProperties([note], noCustomTypes)).toEqual([])
  })
})

describe('noteMatchesSearch', () => {
  it('matches everything when the query is empty', () => {
    const note = buildNote({ title: 'Anything' })
    expect(noteMatchesSearch(note, '')).toBe(true)
  })

  it('matches everything when the query is only whitespace', () => {
    const note = buildNote({ title: 'Anything' })
    expect(noteMatchesSearch(note, '   ')).toBe(true)
  })

  it('matches a case-insensitive title substring', () => {
    const note = buildNote({ title: 'Weekly Planning' })
    expect(noteMatchesSearch(note, 'plan')).toBe(true)
    expect(noteMatchesSearch(note, 'PLAN')).toBe(true)
  })

  it('does not match when the query is not a substring of the title', () => {
    const note = buildNote({ title: 'Weekly Planning' })
    expect(noteMatchesSearch(note, 'budget')).toBe(false)
  })
})
