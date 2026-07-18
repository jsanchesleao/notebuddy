import { useRef } from 'react'
import { createId } from '../../../../domain/ids'
import { buildAssetPath } from '../../../../lib/opfs/opfsPaths'
import { getOpfsDriver } from '../../../../lib/opfs/opfsDriver'
import { useOpfsBlobUrl } from '../../useOpfsBlobUrl'
import { Icon } from '../../../../components/Icon/Icon'
import type { NoteBlock } from '../../../../domain/blocks/blocks.types'
import styles from './EmbedBlock.module.css'

interface EmbedBlockProps {
  block: Extract<NoteBlock, { type: 'embed' }>
  noteId: string
  onUpdate: (patch: { opfsPath?: string; mimeType?: string; caption?: string }) => void
}

function displayName(opfsPath: string): string {
  const fileName = opfsPath.split('/').pop() ?? opfsPath
  const dashIndex = fileName.indexOf('-')
  return dashIndex === -1 ? fileName : fileName.slice(dashIndex + 1)
}

export function EmbedBlock({ block, noteId, onUpdate }: EmbedBlockProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const url = useOpfsBlobUrl(block.opfsPath)
  const isImage = block.mimeType.startsWith('image/')

  return (
    <div className={styles.embedBlock}>
      {block.opfsPath && url ? (
        isImage ? (
          <img src={url} alt={displayName(block.opfsPath)} className={styles.image} />
        ) : (
          <a href={url} download={displayName(block.opfsPath)} className={styles.fileCard}>
            <Icon name="embed" size={20} />
            <span className={styles.fileName}>{displayName(block.opfsPath)}</span>
            <Icon name="download" size={16} />
          </a>
        )
      ) : (
        <div className={styles.placeholder}>
          <Icon name="embed" size={24} />
          <span>No file selected</span>
        </div>
      )}
      <button
        type="button"
        className={styles.chooseButton}
        onClick={() => fileInputRef.current?.click()}
      >
        {block.opfsPath ? 'Replace file' : 'Choose file'}
      </button>
      <input
        ref={fileInputRef}
        type="file"
        className={styles.hiddenInput}
        aria-label="Choose file"
        onChange={async (event) => {
          const file = event.target.files?.[0]
          event.target.value = ''
          if (!file) return

          const path = buildAssetPath({ noteId, assetId: createId(), fileName: file.name })
          const previousPath = block.opfsPath
          await getOpfsDriver().writeFile(path, file)
          onUpdate({ opfsPath: path, mimeType: file.type })

          if (previousPath) {
            await getOpfsDriver().deleteFile(previousPath)
          }
        }}
      />
    </div>
  )
}
