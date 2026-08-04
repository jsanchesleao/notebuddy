import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { BoardColumnHeader } from './BoardColumnHeader'
import { BoardCard } from './BoardCard'
import { Icon } from '../../components/Icon/Icon'
import type { BoardColumn, Note } from '../../domain/entities.types'
import styles from './BoardColumnView.module.css'

// Prefixed so this droppable's id can't collide with the column header's own sortable id
// (used for column reordering) within the same DndContext — dnd-kit ids must be unique.
export const COLUMN_DROP_PREFIX = 'column-drop-'

interface BoardColumnViewProps {
  boardId: string
  column: BoardColumn
  notes: Note[]
  onNewCard: (column: BoardColumn) => void
  tagColors: Map<string, string>
}

export function BoardColumnView({
  boardId,
  column,
  notes,
  onNewCard,
  tagColors,
}: BoardColumnViewProps) {
  const { setNodeRef, isOver } = useDroppable({ id: `${COLUMN_DROP_PREFIX}${column.id}` })

  return (
    <div className={styles.column}>
      <BoardColumnHeader boardId={boardId} column={column} cardCount={notes.length} />
      <div
        ref={setNodeRef}
        className={isOver ? `${styles.body} ${styles.dropTarget}` : styles.body}
      >
        <SortableContext
          items={notes.map((note) => note.id)}
          strategy={verticalListSortingStrategy}
        >
          {notes.length === 0 && <p className={styles.empty}>No cards</p>}
          {notes.map((note) => (
            <BoardCard key={note.id} note={note} tagColors={tagColors} />
          ))}
        </SortableContext>
      </div>
      <button type="button" className={styles.newCardButton} onClick={() => onNewCard(column)}>
        <Icon name="add" size={14} /> New card
      </button>
    </div>
  )
}
