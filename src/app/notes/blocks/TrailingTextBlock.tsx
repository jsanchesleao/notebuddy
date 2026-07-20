import { useEffect, useMemo, useRef, type Ref } from 'react'
import type { JSONContent } from '@tiptap/core'
import { createEmptyBlock } from '../../../domain/blocks/noteBlocksFactory'
import type { NoteBlock, NoteBlockType } from '../../../domain/blocks/blocks.types'
import { TextBlock, type BlockEdge, type TextBlockHandle } from './TextBlock/TextBlock'
import styles from './TrailingTextBlock.module.css'

interface TrailingTextBlockProps {
  blockId: string
  focusOnMount: boolean
  onFocused: () => void
  onPromote: (
    block: Extract<NoteBlock, { type: 'text' }>,
    meta?: { isIdleFlush?: boolean },
  ) => void
  onPromoteAsType: (type: NoteBlockType) => void
  onEscape?: (edge: BlockEdge, extendSelection: boolean) => void
  // The phantom isn't a persisted block, so there's nothing to "delete" —
  // the caller is responsible for resetting it (a fresh phantom id) rather
  // than calling `deleteBlock`.
  onBackspaceAtStart?: (isEmpty: boolean, content: JSONContent) => void
  ref?: Ref<TextBlockHandle>
}

export function TrailingTextBlock({
  blockId,
  focusOnMount,
  onFocused,
  onPromote,
  onPromoteAsType,
  onEscape,
  onBackspaceAtStart,
  ref,
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
        ref={ref}
        block={block}
        onUpdate={(patch, meta) => onPromote({ ...block, ...patch }, meta)}
        onConvert={onPromoteAsType}
        onEscape={onEscape}
        onBackspaceAtStart={onBackspaceAtStart}
      />
    </div>
  )
}
