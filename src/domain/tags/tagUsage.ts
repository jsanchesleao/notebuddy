import type { Note, TagRecord } from '../entities.types'
import { PILL_PALETTE } from './tagPalette'

export interface TagUsage {
  name: string
  color: string
  count: number
}

// Registry entries drive the base list; a tag name found on a note but missing from the
// registry (shouldn't normally happen since setNoteTags always calls ensureTagColor, but
// keeps the count trustworthy regardless) is still included, falling back to the first
// palette color since it was never assigned one.
export function computeTagUsage(notes: Note[], tags: TagRecord[]): TagUsage[] {
  const counts = new Map<string, number>()
  for (const note of notes) {
    for (const tag of note.metadata.tags) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1)
    }
  }

  const usage = tags.map((tag) => ({
    name: tag.name,
    color: tag.color,
    count: counts.get(tag.name) ?? 0,
  }))

  const knownNames = new Set(tags.map((tag) => tag.name))
  for (const [name, count] of counts) {
    if (!knownNames.has(name)) {
      usage.push({ name, color: PILL_PALETTE[0], count })
    }
  }

  return usage.sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
}
