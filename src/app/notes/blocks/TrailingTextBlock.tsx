import { useEffect, useMemo, useRef } from 'react'
import { createEmptyBlock } from '../../../domain/blocks/noteBlocksFactory'
import type { NoteBlock, NoteBlockType } from '../../../domain/blocks/blocks.types'
import { TextBlock } from './TextBlock/TextBlock'
import styles from './TrailingTextBlock.module.css'

interface TrailingTextBlockProps {
  blockId: string
  focusOnMount: boolean
  onFocused: () => void
  onPromote: (block: Extract<NoteBlock, { type: 'text' }>) => void
  onPromoteAsType: (type: NoteBlockType) => void
}

export function TrailingTextBlock({
  blockId,
  focusOnMount,
  onFocused,
  onPromote,
  onPromoteAsType,
}: TrailingTextBlockProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const block = useMemo(() => ({ ...createEmptyBlock('text'), id: blockId }), [blockId])

  useEffect(() => {
    if (!focusOnMount) return
    containerRef.current?.querySelector<HTMLElement>('.ProseMirror')?.focus()
    onFocused()
  }, [focusOnMount, onFocused])

  return (
    <div ref={containerRef} className={styles.trailing}>
      <TextBlock
        block={block}
        onUpdate={(patch) => onPromote({ ...block, ...patch })}
        onConvert={onPromoteAsType}
      />
    </div>
  )
}
