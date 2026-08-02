import { DismissableDropdown } from '../../components/Menu/DismissableDropdown'
import { Icon } from '../../components/Icon/Icon'
import { setColumnVisibility } from '../../domain/boards/boardRepository'
import type { BoardColumn } from '../../domain/entities.types'
import styles from './HiddenColumnsControl.module.css'

interface HiddenColumnsControlProps {
  boardId: string
  columns: BoardColumn[]
}

export function HiddenColumnsControl({ boardId, columns }: HiddenColumnsControlProps) {
  const hiddenColumns = columns.filter((column) => !column.visible)
  if (hiddenColumns.length === 0) return null

  return (
    <DismissableDropdown
      trigger={({ toggle, open }) => (
        <button type="button" className={styles.trigger} aria-expanded={open} onClick={toggle}>
          <Icon name="hidden" size={14} /> Hidden ({hiddenColumns.length})
        </button>
      )}
    >
      {() => (
        <div className={styles.panel}>
          {hiddenColumns.map((column) => (
            <div key={column.id} className={styles.row}>
              <span className={styles.swatch} style={{ background: column.color }} />
              <span className={styles.name}>{column.name}</span>
              <button
                type="button"
                className={styles.showButton}
                aria-label={`Show column ${column.name}`}
                onClick={() => setColumnVisibility(boardId, column.id, true)}
              >
                <Icon name="visible" size={12} />
              </button>
            </div>
          ))}
        </div>
      )}
    </DismissableDropdown>
  )
}
