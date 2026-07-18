import { useRef, useState } from 'react'
import { createId } from '../../../../domain/ids'
import { buildAssetPath } from '../../../../lib/opfs/opfsPaths'
import { getOpfsDriver } from '../../../../lib/opfs/opfsDriver'
import { useOpfsBlobUrl } from '../../useOpfsBlobUrl'
import { Icon } from '../../../../components/Icon/Icon'
import type { NoteBlock } from '../../../../domain/blocks/blocks.types'
import styles from './ImageBlock.module.css'

const SAVE_DEBOUNCE_MS = 500

const WIDTH_PRESETS: { label: string; value: number | undefined }[] = [
  { label: 'S', value: 240 },
  { label: 'M', value: 480 },
  { label: 'L', value: 720 },
  { label: 'Full', value: undefined },
]

interface ImageBlockProps {
  block: Extract<NoteBlock, { type: 'image' }>
  noteId: string
  onUpdate: (patch: { opfsPath?: string; caption?: string; width?: number }) => void
}

export function ImageBlock({ block, noteId, onUpdate }: ImageBlockProps) {
  const [caption, setCaption] = useState(block.caption ?? '')
  const captionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const url = useOpfsBlobUrl(block.opfsPath)

  const handleCaptionChange = (value: string) => {
    setCaption(value)
    if (captionTimeoutRef.current) clearTimeout(captionTimeoutRef.current)
    captionTimeoutRef.current = setTimeout(() => onUpdate({ caption: value }), SAVE_DEBOUNCE_MS)
  }

  return (
    <div className={styles.imageBlock}>
      {url ? (
        <img
          src={url}
          alt={caption || 'Note image'}
          className={styles.image}
          style={block.width ? { width: block.width } : undefined}
        />
      ) : (
        <div className={styles.placeholder}>
          <Icon name="image" size={24} />
          <span>No image selected</span>
        </div>
      )}
      <div className={styles.controls}>
        <button
          type="button"
          className={styles.chooseButton}
          onClick={() => fileInputRef.current?.click()}
        >
          {block.opfsPath ? 'Replace image' : 'Choose image'}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className={styles.hiddenInput}
          aria-label="Choose image file"
          onChange={async (event) => {
            const file = event.target.files?.[0]
            event.target.value = ''
            if (!file) return

            const path = buildAssetPath({ noteId, assetId: createId(), fileName: file.name })
            const previousPath = block.opfsPath
            await getOpfsDriver().writeFile(path, file)
            onUpdate({ opfsPath: path })

            if (previousPath) {
              await getOpfsDriver().deleteFile(previousPath)
            }
          }}
        />
        <div className={styles.widthPresets}>
          {WIDTH_PRESETS.map((preset) => (
            <button
              key={preset.label}
              type="button"
              className={
                block.width === preset.value
                  ? `${styles.widthButton} ${styles.active}`
                  : styles.widthButton
              }
              onClick={() => onUpdate({ width: preset.value })}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>
      <input
        type="text"
        className={styles.captionInput}
        placeholder="Add a caption…"
        value={caption}
        onChange={(event) => handleCaptionChange(event.target.value)}
        aria-label="Image caption"
      />
    </div>
  )
}
