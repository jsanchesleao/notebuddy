import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { StickyNoteItem } from './StickyNoteItem'
import type { StickyNote } from '../../domain/entities.types'
import styles from './StickyNoteLayer.module.css'

interface StickyNoteLayerProps {
  stickyNotes: StickyNote[]
  onChangeContent: (stickyNoteId: string, content: StickyNote['content']) => void | Promise<void>
  onChangeColor: (stickyNoteId: string, color: string) => void | Promise<void>
  onDelete: (stickyNoteId: string) => void | Promise<void>
  onMove: (stickyNoteId: string, x: number, y: number) => void | Promise<void>
  onBringToFront: (stickyNoteId: string) => void | Promise<void>
  scrollOffsetX?: number
}

// Position is anchored to the page's own content flow (this element is a plain
// `position: absolute; inset: 0` child of the page wrapper, not the viewport), so notes
// scroll along with nearby content. Dragging is unconstrained — no restrictToParentElement
// modifier — event.delta is added directly to the stored x/y.
//
// Vertical scroll tethering falls out of that for free (the page wrapper is the thing that
// scrolls). Horizontal scroll on a board happens in a nested container instead (KanbanBoard's
// .columns), so scrollOffsetX is passed down from BoardPage and applied as a translateX
// compensation to keep notes visually tethered to the board content on that axis too.
export function StickyNoteLayer({
  stickyNotes,
  onChangeContent,
  onChangeColor,
  onDelete,
  onMove,
  onBringToFront,
  scrollOffsetX = 0,
}: StickyNoteLayerProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor),
  )

  const handleDragStart = async (event: DragStartEvent) => {
    await onBringToFront(String(event.active.id))
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const stickyNoteId = String(event.active.id)
    const stickyNote = stickyNotes.find((note) => note.id === stickyNoteId)
    if (!stickyNote) return
    await onMove(stickyNoteId, stickyNote.x + event.delta.x, stickyNote.y + event.delta.y)
  }

  return (
    <div className={styles.layer} style={{ transform: `translateX(${-scrollOffsetX}px)` }}>
      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        {stickyNotes.map((stickyNote) => (
          <StickyNoteItem
            key={stickyNote.id}
            stickyNote={stickyNote}
            onChangeContent={(content) => onChangeContent(stickyNote.id, content)}
            onChangeColor={(color) => onChangeColor(stickyNote.id, color)}
            onDelete={() => onDelete(stickyNote.id)}
            onBringToFront={() => onBringToFront(stickyNote.id)}
          />
        ))}
      </DndContext>
    </div>
  )
}
