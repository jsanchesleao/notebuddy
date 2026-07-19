import { useEffect, useRef, useState, type MouseEvent } from 'react'
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

const ALIGNMENTS = [
  { value: 'left', label: 'Align left', icon: 'alignLeft' },
  { value: 'center', label: 'Align center', icon: 'alignCenter' },
  { value: 'right', label: 'Align right', icon: 'alignRight' },
] as const

type Alignment = (typeof ALIGNMENTS)[number]['value']

const ALIGN_CLASS: Record<Alignment, string> = {
  left: styles.alignLeft,
  center: styles.alignCenter,
  right: styles.alignRight,
}

interface ImageBlockProps {
  block: Extract<NoteBlock, { type: 'image' }>
  noteId: string
  onUpdate: (patch: {
    opfsPath?: string
    caption?: string
    width?: number
    align?: Alignment
  }) => void
  autoOpenPicker?: boolean
  onPickerOpened?: () => void
}

export function ImageBlock({
  block,
  noteId,
  onUpdate,
  autoOpenPicker,
  onPickerOpened,
}: ImageBlockProps) {
  const [caption, setCaption] = useState(block.caption ?? '')
  const captionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const captionInputRef = useRef<HTMLInputElement>(null)
  const url = useOpfsBlobUrl(block.opfsPath)
  const align = block.align ?? 'left'

  useEffect(() => {
    if (!autoOpenPicker) return
    fileInputRef.current?.click()
    onPickerOpened?.()
  }, [autoOpenPicker, onPickerOpened])

  const handleCaptionChange = (value: string) => {
    setCaption(value)
    if (captionTimeoutRef.current) clearTimeout(captionTimeoutRef.current)
    captionTimeoutRef.current = setTimeout(() => onUpdate({ caption: value }), SAVE_DEBOUNCE_MS)
  }

  return (
    <div className={styles.imageBlock}>
      <div className={`${styles.imageFrame} ${ALIGN_CLASS[align]}`}>
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
        <div className={styles.toolbar}>
          <button
            type="button"
            className={styles.iconButton}
            aria-label={block.opfsPath ? 'Replace image' : 'Choose image'}
            onClick={() => fileInputRef.current?.click()}
          >
            <Icon name="edit" size={14} />
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
          <div className={styles.divider} />
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
          <div className={styles.divider} />
          {ALIGNMENTS.map(({ value, label, icon }) => (
            <button
              key={value}
              type="button"
              className={styles.iconButton}
              aria-label={label}
              aria-pressed={align === value}
              onClick={() => onUpdate({ align: value })}
            >
              <Icon name={icon} size={14} />
            </button>
          ))}
        </div>
      </div>
      {caption && (
        <button
          type="button"
          className={styles.captionText}
          // Focusing this button itself would immediately hide it (it's only
          // shown while the block does *not* have focus-within), which would
          // break the click before `onClick` below can hand focus to the
          // input instead — so its own default mousedown-focus is suppressed.
          onMouseDown={(event: MouseEvent) => event.preventDefault()}
          onClick={() => captionInputRef.current?.focus()}
        >
          {caption}
        </button>
      )}
      <input
        ref={captionInputRef}
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
