/// <reference lib="webworker" />
import { db } from '../../db/db'
import { computeTagUsage, type TagUsage } from './tagUsage'

export type TagUsageWorkerResponse = { ok: true; data: TagUsage[] } | { ok: false; error: string }

const worker = self as unknown as DedicatedWorkerGlobalScope

worker.onmessage = async () => {
  try {
    const [notes, tags] = await Promise.all([db.notes.toArray(), db.tags.toArray()])
    const response: TagUsageWorkerResponse = { ok: true, data: computeTagUsage(notes, tags) }
    worker.postMessage(response)
  } catch (error) {
    const response: TagUsageWorkerResponse = {
      ok: false,
      error: error instanceof Error ? error.message : 'Failed to scan tag usage',
    }
    worker.postMessage(response)
  }
}
