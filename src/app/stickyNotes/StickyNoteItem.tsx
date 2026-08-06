import { useState, type CSSProperties } from 'react'
import { useDraggable } from '@dnd-kit/core'
import { Icon } from '../../components/Icon/Icon'
import { getReadableTextColor } from '../../lib/color/contrastColor'
import { StickyNoteTextEditor } from './StickyNoteTextEditor'
import { StickyNoteSketchCanvas } from './StickyNoteSketchCanvas'
import { StickyNoteColorPicker } from './StickyNoteColorPicker'
import { getStickyNoteTiltDeg } from './stickyNoteTilt'
import { strokeToPath } from '../notes/blocks/SketchBlock/strokeToPath'
import type { StickyNote } from '../../domain/entities.types'
import styles from './StickyNoteItem.module.css'

interface StickyNoteItemProps {
  stickyNote: StickyNote
  onChangeContent: (content: StickyNote['content']) => void
  onChangeColor: (color: string) => void
  onDelete: () => void
  onBringToFront: () => void
}

// The whole card is the drag surface — a plain click (no pointer movement) falls through
// to the card's onClick since PointerSensor only activates a drag past its distance
// threshold (StickyNoteLayer's activationConstraint), and dnd-kit swallows the trailing
// click after an actual drag. That click arms `isEditing`, which swaps the read-only
// text/sketch preview for the live editor and disables dragging (useDraggable's
// `disabled`) so drawing/typing gestures are never mistaken for a note move. Losing focus
// on the live editor is what leaves edit mode again.
export function StickyNoteItem({
  stickyNote,
  onChangeContent,
  onChangeColor,
  onDelete,
  onBringToFront,
}: StickyNoteItemProps) {
  const [isEditing, setIsEditing] = useState(false)
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: stickyNote.id,
    disabled: isEditing,
  })
  const textColor = getReadableTextColor(stickyNote.color)
  const tiltDeg = getStickyNoteTiltDeg(stickyNote.id)

  const startEditing = () => {
    setIsEditing(true)
    onBringToFront()
  }

  return (
    // role="button"/tabIndex come from useDraggable's `attributes` spread below; eslint
    // can't see through the spread statically.
    // eslint-disable-next-line jsx-a11y/no-static-element-interactions
    <div
      ref={setNodeRef}
      className={[styles.item, isDragging && styles.dragging, isEditing && styles.editing]
        .filter(Boolean)
        .join(' ')}
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
      onClick={isEditing ? undefined : startEditing}
      {...attributes}
      {...listeners}
      onKeyDown={(event) => {
        // dnd-kit's KeyboardSensor binds both Space and Enter (via `listeners.onKeyDown`
        // above) to start a keyboard drag. Enter is claimed here instead for the edit-mode
        // keyboard equivalent of a click, so keyboard users can still reach typing/drawing
        // without a mouse; Space is left alone and keeps starting a keyboard drag.
        if (!isEditing && event.key === 'Enter') {
          event.preventDefault()
          startEditing()
          return
        }
        listeners?.onKeyDown?.(event)
      }}
    >
      <div className={styles.header}>
        <StickyNoteColorPicker
          color={stickyNote.color}
          onChangeColor={onChangeColor}
          onOpen={onBringToFront}
          textColor={textColor}
        />
        <button
          type="button"
          className={styles.deleteButton}
          style={{ color: textColor }}
          aria-label="Delete sticky note"
          onClick={(event) => {
            event.stopPropagation()
            onDelete()
          }}
        >
          <Icon name="close" size={12} />
        </button>
      </div>
      {stickyNote.content.kind === 'text' ? (
        isEditing ? (
          <StickyNoteTextEditor
            text={stickyNote.content.text}
            textColor={textColor}
            onChange={(text) => onChangeContent({ kind: 'text', text })}
            onBlur={() => setIsEditing(false)}
          />
        ) : (
          <p
            className={styles.textPreview}
            style={{ color: textColor, opacity: stickyNote.content.text ? 1 : 0.5 }}
          >
            {stickyNote.content.text || 'Type a note…'}
          </p>
        )
      ) : isEditing ? (
        <StickyNoteSketchCanvas
          strokes={stickyNote.content.strokes}
          penColor={textColor}
          onChange={(strokes) => onChangeContent({ kind: 'sketch', strokes })}
          onBlur={() => setIsEditing(false)}
        />
      ) : (
        <svg className={styles.sketchPreview} role="img" aria-label="Sticky note sketch">
          {stickyNote.content.strokes.map((stroke, index) => (
            <path key={index} d={strokeToPath(stroke)} fill={stroke.color} />
          ))}
        </svg>
      )}
    </div>
  )
}
