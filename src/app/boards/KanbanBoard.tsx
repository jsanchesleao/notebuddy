import { useState } from 'react'
import {
  closestCorners,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { SortableContext, horizontalListSortingStrategy } from '@dnd-kit/sortable'
import { useBoardCards } from './useBoardCards'
import { groupCardsByColumn } from './groupCardsByColumn'
import { BoardColumnView, COLUMN_DROP_PREFIX } from './BoardColumnView'
import { NoteCreateModal } from '../notes/NoteCreateModal'
import { reorderColumns } from '../../domain/boards/boardRepository'
import { setNoteProperty } from '../../domain/notes/noteRepository'
import type { Board, BoardColumn, Note } from '../../domain/entities.types'
import styles from './KanbanBoard.module.css'

interface KanbanBoardProps {
  board: Board
  notes: Note[]
}

// Callers must remount (key={board.cardsDocId}) on board switch — see useBoardCards.
export function KanbanBoard({ board, notes }: KanbanBoardProps) {
  const { cardOrder, moveCard } = useBoardCards(board.cardsDocId)
  const [activeDrag, setActiveDrag] = useState<{ type: 'card' | 'column'; id: string } | null>(null)
  const [newCardColumn, setNewCardColumn] = useState<BoardColumn | null>(null)

  const visibleColumns = board.columns.filter((column) => column.visible)
  const grouped = groupCardsByColumn(board.columns, cardOrder, notes)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor),
  )

  const resolveDropColumnId = (overId: string): string | null => {
    if (overId.startsWith(COLUMN_DROP_PREFIX)) return overId.slice(COLUMN_DROP_PREFIX.length)
    for (const [columnId, columnNotes] of grouped) {
      if (columnNotes.some((note) => note.id === overId)) return columnId
    }
    return null
  }

  const handleDragStart = (event: DragStartEvent) => {
    const type = event.active.data.current?.type === 'column' ? 'column' : 'card'
    setActiveDrag({ type, id: String(event.active.id) })
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveDrag(null)
    const overId = event.over?.id
    if (overId === undefined) return
    const activeId = String(event.active.id)

    if (event.active.data.current?.type === 'column') {
      const fromIndex = board.columns.findIndex((column) => column.id === activeId)
      const toIndex = board.columns.findIndex((column) => column.id === String(overId))
      if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) return
      await reorderColumns(board.id, fromIndex, toIndex)
      return
    }

    const targetColumnId = resolveDropColumnId(String(overId))
    if (!targetColumnId) return
    const targetColumn = board.columns.find((column) => column.id === targetColumnId)
    if (!targetColumn) return

    const targetNotes = grouped.get(targetColumnId) ?? []
    const overIndex = targetNotes.findIndex((note) => note.id === overId)
    const insertIndex = overIndex === -1 ? targetNotes.length : overIndex

    await moveCard(activeId, targetColumnId, insertIndex)

    const draggedNote = notes.find((note) => note.id === activeId)
    const currentStatus = draggedNote?.metadata.properties.status
    if (currentStatus && currentStatus.value !== targetColumn.tag) {
      await setNoteProperty(activeId, 'status', { ...currentStatus, value: targetColumn.tag })
    }
  }

  const overlayNote = activeDrag?.type === 'card' ? notes.find((n) => n.id === activeDrag.id) : null
  const overlayColumn =
    activeDrag?.type === 'column' ? board.columns.find((c) => c.id === activeDrag.id) : null

  if (visibleColumns.length === 0) {
    return <p className={styles.empty}>No visible columns — add or unhide one to get started.</p>
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={visibleColumns.map((column) => column.id)}
        strategy={horizontalListSortingStrategy}
      >
        <div className={styles.columns}>
          {visibleColumns.map((column) => (
            <BoardColumnView
              key={column.id}
              boardId={board.id}
              column={column}
              notes={grouped.get(column.id) ?? []}
              onNewCard={setNewCardColumn}
            />
          ))}
        </div>
      </SortableContext>
      <DragOverlay>
        {overlayNote && <div className={styles.overlayCard}>{overlayNote.title}</div>}
        {overlayColumn && <div className={styles.overlayColumn}>{overlayColumn.name}</div>}
      </DragOverlay>
      <NoteCreateModal
        open={newCardColumn !== null}
        onClose={() => setNewCardColumn(null)}
        notebook={null}
        boardId={board.id}
        defaultStatusValue={newCardColumn?.tag}
      />
    </DndContext>
  )
}
