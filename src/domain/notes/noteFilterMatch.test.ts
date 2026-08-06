import { beforeEach, describe, expect, it } from 'vitest'
import {
  collectFilterableProperties,
  filterNotes,
  noteMatchesFilter,
  noteMatchesSearch,
  noteMatchesTags,
} from './noteFilterMatch'
import { indexNote } from '../search/searchIndexStore'
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
  it('matches everything when there are no blocks', async () => {
    const note = buildNote()
    expect(await noteMatchesFilter(note, { mode: 'and', blocks: [] }, noCustomTypes)).toBe(true)
  })

  it('matches everything when every block is empty', async () => {
    const note = buildNote()
    const filter: FilterState = { mode: 'and', blocks: [block([]), block([])] }
    expect(await noteMatchesFilter(note, filter, noCustomTypes)).toBe(true)
  })
})

describe('noteMatchesFilter — criterion kinds', () => {
  it('tag: matches when the note has the tag', async () => {
    const note = buildNote({
      metadata: { tags: ['work'], createdAt: '', updatedAt: '', properties: {} },
    })
    const filter: FilterState = { mode: 'and', blocks: [block([tagCriterion('work')])] }
    expect(await noteMatchesFilter(note, filter, noCustomTypes)).toBe(true)
    expect(
      await noteMatchesFilter(
        note,
        { mode: 'and', blocks: [block([tagCriterion('home')])] },
        noCustomTypes,
      ),
    ).toBe(false)
  })

  it('noteType: matches on exact noteTypeId, including null', async () => {
    const note = buildNote({ noteTypeId: 'type-1' })
    expect(
      await noteMatchesFilter(
        note,
        { mode: 'and', blocks: [block([noteTypeCriterion('type-1')])] },
        noCustomTypes,
      ),
    ).toBe(true)
    expect(
      await noteMatchesFilter(
        note,
        { mode: 'and', blocks: [block([noteTypeCriterion(null)])] },
        noCustomTypes,
      ),
    ).toBe(false)
  })

  it('title: case-insensitive, index-backed prefix match', async () => {
    const note = buildNote({ title: 'Weekly Planning' })
    indexNote(note, '')
    expect(
      await noteMatchesFilter(
        note,
        { mode: 'and', blocks: [block([titleCriterion('plan')])] },
        noCustomTypes,
      ),
    ).toBe(true)
    expect(
      await noteMatchesFilter(
        note,
        { mode: 'and', blocks: [block([titleCriterion('xyz')])] },
        noCustomTypes,
      ),
    ).toBe(false)
  })

  it('title: an empty/unset text never matches (not "every note")', async () => {
    const note = buildNote({ title: 'Weekly Planning' })
    indexNote(note, '')
    expect(
      await noteMatchesFilter(
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

  it('text: contains, case-insensitive', async () => {
    const note = withProperty(buildNote(), 'field', textType, 'Chocolate Cake')
    const criterion = propertyCriterion({
      primitive: 'text',
      operator: 'contains',
      operand: 'cake',
    })
    expect(
      await noteMatchesFilter(note, { mode: 'and', blocks: [block([criterion])] }, noCustomTypes),
    ).toBe(true)
  })

  it('number: equals / greaterThan / lessThan', async () => {
    const note = withProperty(buildNote(), 'field', numberType, 5)
    const equals = propertyCriterion({ primitive: 'number', operator: 'equals', operand: 5 })
    const greater = propertyCriterion({ primitive: 'number', operator: 'greaterThan', operand: 3 })
    const less = propertyCriterion({ primitive: 'number', operator: 'lessThan', operand: 3 })

    expect(
      await noteMatchesFilter(note, { mode: 'and', blocks: [block([equals])] }, noCustomTypes),
    ).toBe(true)
    expect(
      await noteMatchesFilter(note, { mode: 'and', blocks: [block([greater])] }, noCustomTypes),
    ).toBe(true)
    expect(
      await noteMatchesFilter(note, { mode: 'and', blocks: [block([less])] }, noCustomTypes),
    ).toBe(false)
  })

  it('date: equals / before / after (fixed-width string comparison)', async () => {
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

    expect(
      await noteMatchesFilter(note, { mode: 'and', blocks: [block([equals])] }, noCustomTypes),
    ).toBe(true)
    expect(
      await noteMatchesFilter(note, { mode: 'and', blocks: [block([before])] }, noCustomTypes),
    ).toBe(true)
    expect(
      await noteMatchesFilter(note, { mode: 'and', blocks: [block([after])] }, noCustomTypes),
    ).toBe(false)
  })

  it('boolean: equals only', async () => {
    const note = withProperty(buildNote(), 'field', boolType, true)
    const criterion = propertyCriterion({ primitive: 'boolean', operator: 'equals', operand: true })
    expect(
      await noteMatchesFilter(note, { mode: 'and', blocks: [block([criterion])] }, noCustomTypes),
    ).toBe(true)
  })

  it('never matches an unset/default operand', async () => {
    const note = withProperty(buildNote(), 'field', textType, 'Cake')
    const criterion = propertyCriterion({ primitive: 'text', operator: 'contains', operand: '' })
    expect(
      await noteMatchesFilter(note, { mode: 'and', blocks: [block([criterion])] }, noCustomTypes),
    ).toBe(false)
  })

  it('never matches when the property is missing', async () => {
    const note = buildNote()
    const criterion = propertyCriterion({
      primitive: 'text',
      operator: 'contains',
      operand: 'cake',
    })
    expect(
      await noteMatchesFilter(note, { mode: 'and', blocks: [block([criterion])] }, noCustomTypes),
    ).toBe(false)
  })

  it('never matches when the property has since drifted to a different kind', async () => {
    const note = withProperty(buildNote(), 'field', numberType, 5)
    const criterion = propertyCriterion({ primitive: 'text', operator: 'contains', operand: '5' })
    expect(
      await noteMatchesFilter(note, { mode: 'and', blocks: [block([criterion])] }, noCustomTypes),
    ).toBe(false)
  })
})

describe('noteMatchesFilter — AND/OR duality across blocks and within blocks', () => {
  const note = buildNote({
    title: 'Weekly Planning',
    metadata: { tags: ['work'], createdAt: '', updatedAt: '', properties: {} },
  })

  beforeEach(() => {
    indexNote(note, '')
  })

  it('mode=and: criteria within a block AND together, blocks OR together', async () => {
    const matchingBlock = block([tagCriterion('work'), titleCriterion('plan')])
    const partiallyMatchingBlock = block([tagCriterion('work'), titleCriterion('xyz')])
    const nonMatchingBlock = block([tagCriterion('home')])

    // A block with all-true criteria makes the whole (OR-combined) filter match.
    expect(
      await noteMatchesFilter(
        note,
        { mode: 'and', blocks: [nonMatchingBlock, matchingBlock] },
        noCustomTypes,
      ),
    ).toBe(true)

    // A block with one false criterion (AND) fails that block; if it's the only block, no match.
    expect(
      await noteMatchesFilter(
        note,
        { mode: 'and', blocks: [partiallyMatchingBlock] },
        noCustomTypes,
      ),
    ).toBe(false)

    // No block matches -> overall false.
    expect(
      await noteMatchesFilter(note, { mode: 'and', blocks: [nonMatchingBlock] }, noCustomTypes),
    ).toBe(false)
  })

  it('mode=or: criteria within a block OR together, blocks AND together', async () => {
    const eitherMatchesBlock = block([tagCriterion('home'), titleCriterion('plan')])
    const bothFailBlock = block([tagCriterion('home'), titleCriterion('xyz')])

    // Every block must have at least one true criterion (OR) for the (AND-combined) filter to match.
    expect(
      await noteMatchesFilter(note, { mode: 'or', blocks: [eitherMatchesBlock] }, noCustomTypes),
    ).toBe(true)

    expect(
      await noteMatchesFilter(
        note,
        { mode: 'or', blocks: [eitherMatchesBlock, bothFailBlock] },
        noCustomTypes,
      ),
    ).toBe(false)
  })
})

describe('filterNotes', () => {
  it('returns only the notes matching the filter', async () => {
    const matching = buildNote({ title: 'Match me' })
    const nonMatching = buildNote({ title: 'Skip me' })
    indexNote(matching, '')
    indexNote(nonMatching, '')
    const filter: FilterState = { mode: 'and', blocks: [block([titleCriterion('match')])] }

    expect(await filterNotes([matching, nonMatching], filter, noCustomTypes)).toEqual([matching])
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
  it('matches everything when the query is empty', async () => {
    const note = buildNote({ title: 'Anything' })
    indexNote(note, '')
    expect(await noteMatchesSearch(note, '')).toBe(true)
  })

  it('matches everything when the query is only whitespace', async () => {
    const note = buildNote({ title: 'Anything' })
    indexNote(note, '')
    expect(await noteMatchesSearch(note, '   ')).toBe(true)
  })

  it('matches a case-insensitive title prefix', async () => {
    const note = buildNote({ title: 'Weekly Planning' })
    indexNote(note, '')
    expect(await noteMatchesSearch(note, 'plan')).toBe(true)
    expect(await noteMatchesSearch(note, 'PLAN')).toBe(true)
  })

  it('does not match when the query has no indexed match', async () => {
    const note = buildNote({ title: 'Weekly Planning' })
    indexNote(note, '')
    expect(await noteMatchesSearch(note, 'budget')).toBe(false)
  })
})

describe('noteMatchesTags', () => {
  it('matches everything when no tags are selected', () => {
    const note = buildNote({
      metadata: { tags: [], createdAt: '', updatedAt: '', properties: {} },
    })
    expect(noteMatchesTags(note, [])).toBe(true)
  })

  it('requires every selected tag to be present (AND)', () => {
    const note = buildNote({
      metadata: { tags: ['work', 'urgent'], createdAt: '', updatedAt: '', properties: {} },
    })
    expect(noteMatchesTags(note, ['work'])).toBe(true)
    expect(noteMatchesTags(note, ['work', 'urgent'])).toBe(true)
    expect(noteMatchesTags(note, ['work', 'home'])).toBe(false)
  })

  it('does not match a note missing any selected tag', () => {
    const note = buildNote({
      metadata: { tags: ['work'], createdAt: '', updatedAt: '', properties: {} },
    })
    expect(noteMatchesTags(note, ['home'])).toBe(false)
  })
})
