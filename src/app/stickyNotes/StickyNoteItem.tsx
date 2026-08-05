import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { Icon } from '../../components/Icon/Icon'
import { getReadableTextColor } from '../../lib/color/contrastColor'
import { StickyNoteTextEditor } from './StickyNoteTextEditor'
import { StickyNoteSketchCanvas } from './StickyNoteSketchCanvas'
import type { StickyNote } from '../../domain/entities.types'
import styles from './StickyNoteItem.module.css'

interface StickyNoteItemProps {
  stickyNote: StickyNote
  onChangeContent: (content: StickyNote['content']) => void
  onDelete: () => void
}

// Drag is initiated only from the grip handle (setNodeRef marks the whole card so its
// transform follows the pointer, but listeners/attributes are scoped to the grip button) —
// same drag-handle-separate-from-content convention as FolderTreeNode.tsx, needed here so
// dragging doesn't fight with typing/drawing inside the card body.
export function StickyNoteItem({ stickyNote, onChangeContent, onDelete }: StickyNoteItemProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: stickyNote.id,
  })
  const textColor = getReadableTextColor(stickyNote.color)

  return (
    <div
      ref={setNodeRef}
      className={styles.item}
      style={{
        left: `${stickyNote.x}px`,
        top: `${stickyNote.y}px`,
        background: stickyNote.color,
        transform: transform ? CSS.Translate.toString(transform) : undefined,
        zIndex: isDragging ? 1000 : undefined,
      }}
    >
      <div className={styles.header}>
        <button
          type="button"
          className={styles.gripButton}
          style={{ color: textColor }}
          aria-label="Move sticky note"
          {...attributes}
          {...listeners}
        >
          <Icon name="grip" size={12} />
        </button>
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
