import { useCallback } from 'react'
import { createId } from '../../domain/ids'
import { buildAssetPath } from '../../lib/opfs/opfsPaths'
import { getOpfsDriver } from '../../lib/opfs/opfsDriver'

export interface UseOpfsImageUploadOptions {
  ownerId: string
  currentPath?: string
  onUploaded: (path: string) => void
}

// Writes a picked image file into OPFS under the owning note/card's asset folder, reports
// the new path back via onUploaded, then cleans up whatever it's replacing. Shared by
// ImageBlock and board card images so there's one place that owns this write-then-swap order.
export function useOpfsImageUpload({ ownerId, currentPath, onUploaded }: UseOpfsImageUploadOptions) {
  return useCallback(
    async (file: File) => {
      const path = buildAssetPath({ noteId: ownerId, assetId: createId(), fileName: file.name })
      await getOpfsDriver().writeFile(path, file)
      onUploaded(path)

      if (currentPath) {
        await getOpfsDriver().deleteFile(currentPath)
      }
    },
    [ownerId, currentPath, onUploaded],
  )
}
