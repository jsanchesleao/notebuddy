import TagSearchIndexWorker from './tagSearchIndexWorker?worker'
import type { TagSearchIndexRequest, TagSearchIndexResponse } from './tagSearchIndexWorker'

// App-wide singleton kept alive for the whole session — unlike tagUsageClient's one-shot
// worker (spun up and terminated per scan), this backs keystroke-driven tag-add suggestions,
// so a fresh worker (and a rebuilt index) on every query would defeat the point of indexing.
let worker: Worker | null = null
let nextRequestId = 0
const pending = new Map<number, (matches: string[]) => void>()

// Worker isn't available under the Vitest/jsdom test environment (no browser worker runtime) —
// ensureTagColor/deleteTags call into this module on every tag mutation, so degrading to a
// no-op there keeps repository tests working without mocking this module everywhere.
function getWorker(): Worker | null {
  if (typeof Worker === 'undefined') return null

  if (!worker) {
    worker = new TagSearchIndexWorker()
    worker.onmessage = (event: MessageEvent<TagSearchIndexResponse>) => {
      const resolve = pending.get(event.data.requestId)
      if (resolve) {
        pending.delete(event.data.requestId)
        resolve(event.data.matches)
      }
    }
    const init: TagSearchIndexRequest = { type: 'init' }
    worker.postMessage(init)
  }
  return worker
}

// Excludes tag names already on the note (or already selected) from the returned suggestions.
export function queryTagSuggestions(text: string, exclude: string[]): Promise<string[]> {
  const activeWorker = getWorker()
  if (!activeWorker) return Promise.resolve([])

  return new Promise((resolve) => {
    const requestId = nextRequestId++
    pending.set(requestId, resolve)
    const message: TagSearchIndexRequest = { type: 'query', requestId, text, exclude }
    activeWorker.postMessage(message)
  })
}

export function notifyTagAdded(name: string): void {
  const message: TagSearchIndexRequest = { type: 'add', name }
  getWorker()?.postMessage(message)
}

export function notifyTagRemoved(names: string[]): void {
  const message: TagSearchIndexRequest = { type: 'remove', names }
  getWorker()?.postMessage(message)
}
