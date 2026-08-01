import { db } from '../../db/db'
import type { TagRecord } from '../entities.types'
import { PILL_PALETTE } from './tagPalette'

// Removes tags from the registry and strips them from every note that has them, in one
// transaction — a tag can be removed whether it's currently in use or not.
export async function deleteTags(names: string[]): Promise<void> {
  await db.transaction('rw', [db.tags, db.notes], async () => {
    await db.tags.bulkDelete(names)

    const nameSet = new Set(names)
    const allNotes = await db.notes.toArray()
    const affectedNotes = allNotes.filter((note) =>
      note.metadata.tags.some((tag) => nameSet.has(tag)),
    )

    const now = new Date().toISOString()
    await Promise.all(
      affectedNotes.map((note) =>
        db.notes.update(note.id, {
          'metadata.tags': note.metadata.tags.filter((tag) => !nameSet.has(tag)),
          'metadata.updatedAt': now,
          updatedAt: now,
        }),
      ),
    )
  })
}

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
