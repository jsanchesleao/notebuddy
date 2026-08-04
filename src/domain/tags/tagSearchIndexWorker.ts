/// <reference lib="webworker" />
import { db } from '../../db/db'

export type TagSearchIndexRequest =
  | { type: 'init' }
  | { type: 'query'; requestId: number; text: string; exclude: string[] }
  | { type: 'add'; name: string }
  | { type: 'remove'; names: string[] }

export interface TagSearchIndexResponse {
  type: 'result'
  requestId: number
  matches: string[]
}

const worker = self as unknown as DedicatedWorkerGlobalScope

// Substring matching over a tag-name registry doesn't benefit from a trie (those only speed up
// prefix lookups), so the "index" is just this in-memory array, kept off Dexie so a query never
// re-hits IndexedDB — the point is avoiding a scan-per-keystroke, not the data structure itself.
let index: string[] = []
let ready: Promise<void> | null = null

function ensureReady(): Promise<void> {
  if (!ready) {
    ready = db.tags.toArray().then((tags) => {
      index = tags.map((tag) => tag.name)
    })
  }
  return ready
}

worker.onmessage = async (event: MessageEvent<TagSearchIndexRequest>) => {
  const message = event.data

  switch (message.type) {
    case 'init':
      await ensureReady()
      return

    case 'query': {
      await ensureReady()
      const query = message.text.trim().toLowerCase()
      const excludeSet = new Set(message.exclude)
      const matches =
        query === ''
          ? []
          : index.filter((name) => !excludeSet.has(name) && name.toLowerCase().includes(query))
      const response: TagSearchIndexResponse = {
        type: 'result',
        requestId: message.requestId,
        matches,
      }
      worker.postMessage(response)
      return
    }

    case 'add':
      await ensureReady()
      if (!index.includes(message.name)) index.push(message.name)
      return

    case 'remove':
      await ensureReady()
      index = index.filter((name) => !message.names.includes(name))
      return
  }
}
