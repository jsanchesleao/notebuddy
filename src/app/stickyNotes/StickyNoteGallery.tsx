import { useState } from 'react'
import { Modal } from '../../components/Modal/Modal'
import { Icon } from '../../components/Icon/Icon'
import { getReadableTextColor } from '../../lib/color/contrastColor'
import { StickyNoteTextEditor } from './StickyNoteTextEditor'
import { StickyNoteSketchCanvas } from './StickyNoteSketchCanvas'
import type { StickyNote } from '../../domain/entities.types'
import styles from './StickyNoteGallery.module.css'

interface StickyNoteGalleryProps {
  open: boolean
  onClose: () => void
  stickyNotes: StickyNote[]
  onChangeContent: (stickyNoteId: string, content: StickyNote['content']) => void | Promise<void>
  onDelete: (stickyNoteId: string) => void | Promise<void>
}

const TITLE_ID = 'sticky-note-gallery-title'

// Mobile-only counterpart to StickyNoteLayer (per spec.md §4.6): position is ignored, notes
// show as a grid of cards. Tapping a card expands it inline for editing, rather than
// stacking a second Modal on top of this one (no modal-in-modal precedent in the codebase).
export function StickyNoteGallery({
  open,
  onClose,
  stickyNotes,
  onChangeContent,
  onDelete,
}: StickyNoteGalleryProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  return (
    <Modal open={open} onClose={onClose} labelledBy={TITLE_ID}>
      <div className={styles.panel}>
        <h2 id={TITLE_ID} className={styles.heading}>
          Sticky notes
        </h2>
        {stickyNotes.length === 0 ? (
          <p className={styles.empty}>No sticky notes yet — use the + button to add one.</p>
        ) : (
          <ul className={styles.grid}>
            {stickyNotes.map((stickyNote) => {
              const isExpanded = stickyNote.id === expandedId
              const textColor = getReadableTextColor(stickyNote.color)

              return (
                <li
                  key={stickyNote.id}
                  className={isExpanded ? `${styles.card} ${styles.expanded}` : styles.card}
                  style={{ background: stickyNote.color }}
                >
                  <div className={styles.cardHeader}>
                    <button
                      type="button"
                      className={styles.iconButton}
                      style={{ color: textColor }}
                      aria-label={isExpanded ? 'Collapse sticky note' : 'Expand sticky note'}
                      onClick={() => setExpandedId(isExpanded ? null : stickyNote.id)}
                    >
                      <Icon name={isExpanded ? 'collapse' : 'expand'} size={12} />
                    </button>
                    <button
                      type="button"
                      className={styles.iconButton}
                      style={{ color: textColor }}
                      aria-label="Delete sticky note"
                      onClick={() => onDelete(stickyNote.id)}
                    >
                      <Icon name="close" size={12} />
                    </button>
                  </div>
                  {isExpanded ? (
                    stickyNote.content.kind === 'text' ? (
                      <StickyNoteTextEditor
                        text={stickyNote.content.text}
                        textColor={textColor}
                        onChange={(text) => onChangeContent(stickyNote.id, { kind: 'text', text })}
                      />
                    ) : (
                      <StickyNoteSketchCanvas
                        strokes={stickyNote.content.strokes}
                        penColor={textColor}
                        onChange={(strokes) =>
                          onChangeContent(stickyNote.id, { kind: 'sketch', strokes })
                        }
                      />
                    )
                  ) : (
                    <p className={styles.preview} style={{ color: textColor }}>
                      {stickyNote.content.kind === 'text'
                        ? stickyNote.content.text || 'Empty note'
                        : 'Sketch'}
                    </p>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </Modal>
  )
}
