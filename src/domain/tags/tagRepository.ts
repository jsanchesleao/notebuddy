import { db } from '../../db/db'
import type { TagRecord } from '../entities.types'
import { PILL_PALETTE } from './tagPalette'

export async function listTags(): Promise<TagRecord[]> {
  return db.tags.toArray()
}

function pickLeastUsedColor(existingTags: TagRecord[]): string {
  const counts = new Map(PILL_PALETTE.map((color) => [color, 0]))
  for (const tag of existingTags) {
    if (counts.has(tag.color)) {
      counts.set(tag.color, (counts.get(tag.color) ?? 0) + 1)
    }
  }

  const minCount = Math.min(...counts.values())
  const leastUsed = PILL_PALETTE.filter((color) => counts.get(color) === minCount)
  return leastUsed[Math.floor(Math.random() * leastUsed.length)]
}

// Registers a tag on first use with a randomly assigned, least-used palette color, and
// returns its color either way. Idempotent — safe to call every time a tag is attached to a
// note. Wrapped in a transaction so two brand-new tags registered close together don't race
// on the same "least used" snapshot.
export async function ensureTagColor(name: string): Promise<string> {
  return db.transaction('rw', db.tags, async () => {
    const existing = await db.tags.get(name)
    if (existing) return existing.color

    const allTags = await db.tags.toArray()
    const color = pickLeastUsedColor(allTags)
    await db.tags.add({ name, color, createdAt: new Date().toISOString() })
    return color
  })
}

export async function setTagColor(name: string, color: string): Promise<void> {
  const existing = await db.tags.get(name)
  if (existing) {
    await db.tags.update(name, { color })
    return
  }
  await db.tags.add({ name, color, createdAt: new Date().toISOString() })
}
