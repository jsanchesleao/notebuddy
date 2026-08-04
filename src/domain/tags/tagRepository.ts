import { db } from '../../db/db'
import type { TagRecord } from '../entities.types'
import { PILL_PALETTE } from './tagPalette'
import { pickLeastUsedColor } from '../../lib/color/leastUsedColor'
import { notifyTagAdded, notifyTagRemoved } from './tagSearchIndexClient'

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

  notifyTagRemoved(names)
}

export async function listTags(): Promise<TagRecord[]> {
  return db.tags.toArray()
}

// Registers a tag on first use with a randomly assigned, least-used palette color, and
// returns its color either way. Idempotent — safe to call every time a tag is attached to a
// note. Wrapped in a transaction so two brand-new tags registered close together don't race
// on the same "least used" snapshot.
export async function ensureTagColor(name: string): Promise<string> {
  let created = false

  const color = await db.transaction('rw', db.tags, async () => {
    const existing = await db.tags.get(name)
    if (existing) return existing.color

    const allTags = await db.tags.toArray()
    const assignedColor = pickLeastUsedColor(
      PILL_PALETTE,
      allTags.map((tag) => tag.color),
    )
    await db.tags.add({ name, color: assignedColor, createdAt: new Date().toISOString() })
    created = true
    return assignedColor
  })

  if (created) notifyTagAdded(name)
  return color
}

export async function setTagColor(name: string, color: string): Promise<void> {
  const existing = await db.tags.get(name)
  if (existing) {
    await db.tags.update(name, { color })
    return
  }
  await db.tags.add({ name, color, createdAt: new Date().toISOString() })
}
