import { useEffect, useState } from 'react'
import { getOpfsDriver } from '../../lib/opfs/opfsDriver'

export function useOpfsBlobUrl(opfsPath: string): string | null {
  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!opfsPath) return

    let objectUrl: string | null = null
    let cancelled = false

    getOpfsDriver()
      .readFile(opfsPath)
      .then((blob) => {
        if (cancelled || !blob) return
        objectUrl = URL.createObjectURL(blob)
        setUrl(objectUrl)
      })

    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [opfsPath])

  return opfsPath ? url : null
}
