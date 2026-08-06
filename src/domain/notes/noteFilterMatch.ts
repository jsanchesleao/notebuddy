import { resolveTypeRef } from '../dataTypes/resolveTypeRef'
import { searchNotes } from '../search/searchIndexStore'
import type { CustomDataType, Note } from '../entities.types'
import type {
  FilterableProperty,
  FilterBlock,
  FilterCriterion,
  FilterState,
} from './noteFilter.types'

type ResolveCustomType = (id: string) => CustomDataType | undefined

// 'title' criteria are index-backed (see searchIndexStore.ts) rather than a plain substring
// check, but evaluateCriterion below stays synchronous — so every distinct 'title' criterion
// text referenced by a filter is resolved to a matching-id set up front, once, rather than
// making the whole per-note criterion evaluation chain async.
async function resolveTitleCriterionMatches(
  filter: FilterState,
): Promise<Map<string, Set<string>>> {
  const texts = new Set<string>()
  for (const block of filter.blocks) {
    for (const criterion of block.criteria) {
      if (criterion.kind === 'title' && criterion.text !== '') texts.add(criterion.text)
    }
  }

  const entries = await Promise.all(
    Array.from(texts).map(async (text) => {
      const ids = await searchNotes(text)
      return [text, new Set(ids ?? [])] as const
    }),
  )
  return new Map(entries)
}

export async function filterNotes(
  notes: Note[],
  filter: FilterState,
  resolveCustomType: ResolveCustomType,
): Promise<Note[]> {
  const titleMatches = await resolveTitleCriterionMatches(filter)
  return notes.filter((note) => evaluateFilter(note, filter, resolveCustomType, titleMatches))
}

export async function noteMatchesFilter(
  note: Note,
  filter: FilterState,
  resolveCustomType: ResolveCustomType,
): Promise<boolean> {
  const titleMatches = await resolveTitleCriterionMatches(filter)
  return evaluateFilter(note, filter, resolveCustomType, titleMatches)
}

function evaluateFilter(
  note: Note,
  filter: FilterState,
  resolveCustomType: ResolveCustomType,
  titleMatches: Map<string, Set<string>>,
): boolean {
  const activeBlocks = filter.blocks.filter((block) => block.criteria.length > 0)
  if (activeBlocks.length === 0) return true

  const blockResults = activeBlocks.map((block) =>
    evaluateBlock(note, block, filter.mode, resolveCustomType, titleMatches),
  )

  // Cross-block combinator is the opposite of the within-block one: mode='and' combines
  // criteria within a block via AND, but blocks with each other via OR, and vice versa.
  const acrossCombinator = filter.mode === 'and' ? 'or' : 'and'
  return acrossCombinator === 'and' ? blockResults.every(Boolean) : blockResults.some(Boolean)
}

function evaluateBlock(
  note: Note,
  block: FilterBlock,
  mode: FilterState['mode'],
  resolveCustomType: ResolveCustomType,
  titleMatches: Map<string, Set<string>>,
): boolean {
  const results = block.criteria.map((criterion) =>
    evaluateCriterion(note, criterion, resolveCustomType, titleMatches),
  )
  return mode === 'and' ? results.every(Boolean) : results.some(Boolean)
}

function evaluateCriterion(
  note: Note,
  criterion: FilterCriterion,
  resolveCustomType: ResolveCustomType,
  titleMatches: Map<string, Set<string>>,
): boolean {
  switch (criterion.kind) {
    case 'tag':
      return note.metadata.tags.includes(criterion.tag)
    case 'noteType':
      return note.noteTypeId === criterion.noteTypeId
    case 'title':
      // An empty/unset text (what a freshly added criterion starts with) never matches —
      // matches searchNotes' own empty-query convention of "no filter", which would otherwise
      // make a not-yet-configured criterion match every note.
      return criterion.text !== '' && (titleMatches.get(criterion.text)?.has(note.id) ?? false)
    case 'property':
      return evaluatePropertyCriterion(note, criterion, resolveCustomType)
  }
}

function evaluatePropertyCriterion(
  note: Note,
  criterion: Extract<FilterCriterion, { kind: 'property' }>,
  resolveCustomType: ResolveCustomType,
): boolean {
  const property = note.metadata.properties[criterion.propertyKey]
  if (!property) return false

  const resolved = resolveTypeRef(property.typeRef, resolveCustomType)
  if (!resolved || resolved.kind !== 'primitive' || resolved.primitive !== criterion.primitive) {
    return false
  }

  const { operand } = criterion
  // An unset/default operand (the value createDefaultValue seeds a fresh criterion with)
  // never matches — there's no "is unset" operator, so this is an intentional scope boundary.
  if (operand === null || operand === '') return false

  const value = property.value

  switch (criterion.operator) {
    case 'contains':
      return (
        typeof value === 'string' &&
        typeof operand === 'string' &&
        value.toLowerCase().includes(operand.toLowerCase())
      )
    case 'equals':
      return value === operand
    case 'greaterThan':
      return typeof value === 'number' && typeof operand === 'number' && value > operand
    case 'lessThan':
      return typeof value === 'number' && typeof operand === 'number' && value < operand
    // date/time/datetime values are fixed-width, zero-padded strings (YYYY-MM-DD, HH:MM,
    // YYYY-MM-DDTHH:MM), so plain string comparison sorts them correctly.
    case 'before':
      return typeof value === 'string' && typeof operand === 'string' && value < operand
    case 'after':
      return typeof value === 'string' && typeof operand === 'string' && value > operand
  }
}

// Unlike the filter's own 'title' criterion (see evaluateCriterion above), an empty query here
// means "no search active" and must match everything, not nothing — this backs the notebook/
// board pages' always-visible quick search box rather than a configurable filter criterion.
// Index-backed (searchNotes) rather than a title-only substring check, so it also matches tags,
// properties, and block content — scope restricts the match to a notebook/board when given.
export async function noteMatchesSearch(
  note: Note,
  query: string,
  scope?: { notebookId?: string; boardId?: string },
): Promise<boolean> {
  const ids = await searchNotes(query, scope)
  return ids === null || ids.includes(note.id)
}

// Unlike the filter's own 'tag' criterion (single tag, see evaluateCriterion above), an empty
// selection here means "no tags picked" and must match everything — same convention as
// noteMatchesSearch — while a non-empty selection requires every selected tag to be present.
export function noteMatchesTags(note: Note, tags: string[]): boolean {
  if (tags.length === 0) return true
  return tags.every((tag) => note.metadata.tags.includes(tag))
}

export function collectFilterableProperties(
  notes: Note[],
  resolveCustomType: ResolveCustomType,
): FilterableProperty[] {
  const byKey = new Map<string, FilterableProperty>()

  for (const note of notes) {
    for (const [key, property] of Object.entries(note.metadata.properties)) {
      if (byKey.has(key)) continue

      const resolved = resolveTypeRef(property.typeRef, resolveCustomType)
      if (!resolved || resolved.kind !== 'primitive') continue

      byKey.set(key, { key, primitive: resolved.primitive, options: resolved.options })
    }
  }

  return Array.from(byKey.values()).sort((a, b) => a.key.localeCompare(b.key))
}
