import TagUsageWorker from './tagUsageWorker?worker'
import type { TagUsageWorkerResponse } from './tagUsageWorker'
import type { TagUsage } from './tagUsage'

// Scans every note off the main thread — metadata.tags isn't a Dexie index, so counting tag
// usage means loading every note, which shouldn't ever block the UI. A fresh worker is spun up
// per scan and terminated afterwards rather than kept warm, since this only runs when the
// Manage Tags modal opens or a mutation inside it needs a refresh.
export function scanTagUsage(): Promise<TagUsage[]> {
  return new Promise((resolve, reject) => {
    const worker = new TagUsageWorker()

    worker.onmessage = (event: MessageEvent<TagUsageWorkerResponse>) => {
      const response = event.data
      if (response.ok) {
        resolve(response.data)
      } else {
        reject(new Error(response.error))
      }
      worker.terminate()
    }

    worker.onerror = () => {
      reject(new Error('Failed to scan tag usage'))
      worker.terminate()
    }

    worker.postMessage(undefined)
  })
}
