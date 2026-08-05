import type { CSSProperties } from 'react'
import { useDraggable } from '@dnd-kit/core'
import { Icon } from '../../components/Icon/Icon'
import { getReadableTextColor } from '../../lib/color/contrastColor'
import { StickyNoteTextEditor } from './StickyNoteTextEditor'
import { StickyNoteSketchCanvas } from './StickyNoteSketchCanvas'
import { StickyNoteColorPicker } from './StickyNoteColorPicker'
import { getStickyNoteTiltDeg } from './stickyNoteTilt'
import type { StickyNote } from '../../domain/entities.types'
import styles from './StickyNoteItem.module.css'

interface StickyNoteItemProps {
  stickyNote: StickyNote
  onChangeContent: (content: StickyNote['content']) => void
  onChangeColor: (color: string) => void
  onDelete: () => void
  onBringToFront: () => void
}

// Drag is initiated only from the grip handle (setNodeRef marks the whole card so its
// transform follows the pointer, but listeners/attributes are scoped to the grip button) —
// same drag-handle-separate-from-content convention as FolderTreeNode.tsx, needed here so
// dragging doesn't fight with typing/drawing inside the card body.
export function StickyNoteItem({
  stickyNote,
  onChangeContent,
  onChangeColor,
  onDelete,
  onBringToFront,
}: StickyNoteItemProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: stickyNote.id,
  })
  const textColor = getReadableTextColor(stickyNote.color)
  const tiltDeg = getStickyNoteTiltDeg(stickyNote.id)

  return (
    <div
      ref={setNodeRef}
      className={isDragging ? `${styles.item} ${styles.dragging}` : styles.item}
      style={
        {
          left: `${stickyNote.x}px`,
          top: `${stickyNote.y}px`,
          backgroundColor: stickyNote.color,
          '--drag-x': transform ? `${transform.x}px` : '0px',
          '--drag-y': transform ? `${transform.y}px` : '0px',
          '--tilt-deg': `${tiltDeg}deg`,
          zIndex: isDragging ? 1000 : undefined,
        } as CSSProperties
      }
    >
      <div className={styles.header}>
        <StickyNoteColorPicker
          color={stickyNote.color}
          onChangeColor={onChangeColor}
          onOpen={onBringToFront}
          textColor={textColor}
          attributes={attributes}
          listeners={listeners}
        />
        <button
          type="button"
          className={styles.deleteButton}
          style={{ color: textColor }}
          aria-label="Delete sticky note"
          onClick={onDelete}
        >
          <Icon name="close" size={12} />
        </button>
      </div>
      {stickyNote.content.kind === 'text' ? (
        <StickyNoteTextEditor
          text={stickyNote.content.text}
          textColor={textColor}
          onChange={(text) => onChangeContent({ kind: 'text', text })}
        />
      ) : (
        <StickyNoteSketchCanvas
          strokes={stickyNote.content.strokes}
          penColor={textColor}
          onChange={(strokes) => onChangeContent({ kind: 'sketch', strokes })}
        />
      )}
    </div>
  )
}
