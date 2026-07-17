export function sanitizeFileName(fileName: string): string {
  if (fileName.length === 0) {
    throw new Error('File name must not be empty')
  }
  if (fileName.includes('/') || fileName.includes('\\')) {
    throw new Error(`File name must not contain path separators: ${fileName}`)
  }
  if (fileName === '.' || fileName === '..') {
    throw new Error(`File name must not be a relative path segment: ${fileName}`)
  }
  return fileName
}

export function buildAssetPath({
  noteId,
  assetId,
  fileName,
}: {
  noteId: string
  assetId: string
  fileName: string
}): string {
  return `notes/${noteId}/${assetId}-${sanitizeFileName(fileName)}`
}
