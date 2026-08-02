import { useState } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { DismissableDropdown } from '../../components/Menu/DismissableDropdown'
import { Icon } from '../../components/Icon/Icon'
import { setColumnColor, setColumnVisibility } from '../../domain/boards/boardRepository'
import { PILL_PALETTE } from '../../domain/tags/tagPalette'
import { HEX_COLOR_REGEX } from '../../lib/color/hexColor'
import type { BoardColumn } from '../../domain/entities.types'
import styles from './BoardColumnHeader.module.css'

interface BoardColumnHeaderProps {
  boardId: string
  column: BoardColumn
  cardCount: number
}

export function BoardColumnHeader({ boardId, column, cardCount }: BoardColumnHeaderProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: column.id,
    data: { type: 'column' },
  })
  const [draft, setDraft] = useState(column.color)

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div ref={setNodeRef} style={style} className={styles.header}>
      <button
        type="button"
        className={styles.gripButton}
        aria-label={`Reorder ${column.name}`}
        {...attributes}
        {...listeners}
      >
        <Icon name="grip" size={12} />
      </button>
      <DismissableDropdown
        trigger={({ toggle, open }) => (
          <button
            type="button"
            className={styles.swatch}
            style={{ background: column.color }}
            aria-expanded={open}
            aria-label={`Change color for column ${column.name}`}
            onClick={() => {
              setDraft(column.color)
              toggle()
            }}
          />
        )}
      >
        {({ close }) => (
          <div className={styles.picker}>
            <div className={styles.swatchGrid}>
              {PILL_PALETTE.map((swatch) => (
                <button
                  key={swatch}
                  type="button"
                  className={styles.swatchOption}
                  style={{ background: swatch }}
                  aria-label={swatch}
                  aria-pressed={swatch === column.color}
                  onClick={async () => {
                    await setColumnColor(boardId, column.id, swatch)
                    close()
                  }}
                />
              ))}
            </div>
            <form
              className={styles.hexForm}
              onSubmit={async (event) => {
                event.preventDefault()
                if (!HEX_COLOR_REGEX.test(draft)) return
                await setColumnColor(boardId, column.id, draft)
                close()
              }}
            >
              <input
                type="text"
                className={styles.hexInput}
                value={draft}
                placeholder="#rrggbb"
                onChange={(event) => setDraft(event.target.value)}
                aria-label="Hex color"
              />
              <button type="submit" disabled={!HEX_COLOR_REGEX.test(draft)}>
                Set
              </button>
            </form>
          </div>
        )}
      </DismissableDropdown>
      <span className={styles.name}>{column.name}</span>
      <span className={styles.count}>{cardCount}</span>
      <button
        type="button"
        className={styles.visibilityButton}
        aria-label={column.visible ? `Hide column ${column.name}` : `Show column ${column.name}`}
        aria-pressed={column.visible}
        onClick={() => setColumnVisibility(boardId, column.id, !column.visible)}
      >
        <Icon name={column.visible ? 'visible' : 'hidden'} size={12} />
      </button>
    </div>
  )
}
