import { describe, expect, it } from 'vitest'
import { computeTagUsage } from './tagUsage'
import { createId } from '../ids'
import { PILL_PALETTE } from './tagPalette'
import type { Note, TagRecord } from '../entities.types'

function buildNote(tags: string[]): Note {
  const now = new Date().toISOString()
  return {
    id: createId(),
    notebookId: null,
    boardId: null,
    noteTypeId: null,
    title: 'Untitled',
    metadata: { tags, createdAt: now, updatedAt: now, properties: {} },
    blockDocId: createId(),
    createdAt: now,
    updatedAt: now,
  }
}

function buildTag(name: string, color = '#457b9d'): TagRecord {
  return { name, color, createdAt: new Date().toISOString() }
}

describe('computeTagUsage', () => {
  it('counts how many notes use each registered tag', () => {
    const notes = [buildNote(['urgent', 'work']), buildNote(['urgent']), buildNote([])]
    const tags = [buildTag('urgent'), buildTag('work')]

    expect(computeTagUsage(notes, tags)).toEqual([
      { name: 'urgent', color: '#457b9d', count: 2 },
      { name: 'work', color: '#457b9d', count: 1 },
    ])
  })

  it('reports a zero count for a registered tag used on no notes', () => {
    const tags = [buildTag('unused', '#e07a5f')]
    expect(computeTagUsage([], tags)).toEqual([{ name: 'unused', color: '#e07a5f', count: 0 }])
  })

  it('includes a tag found on a note but missing from the registry', () => {
    const notes = [buildNote(['orphan'])]
    expect(computeTagUsage(notes, [])).toEqual([
      { name: 'orphan', color: PILL_PALETTE[0], count: 1 },
    ])
  })

  it('sorts by usage count descending, tie-breaking alphabetically', () => {
    const notes = [buildNote(['b', 'c']), buildNote(['c'])]
    const tags = [buildTag('a'), buildTag('b'), buildTag('c')]

    expect(computeTagUsage(notes, tags).map((tag) => tag.name)).toEqual(['c', 'b', 'a'])
  })
})
