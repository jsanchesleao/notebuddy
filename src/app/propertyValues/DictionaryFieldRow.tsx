import type { ReactNode } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Icon } from '../../components/Icon/Icon'
import styles from './compositeEditors.module.css'

interface DictionaryFieldRowProps {
  id: string
  children: ReactNode
  disabled?: boolean
}

export function DictionaryFieldRow({ id, children, disabled }: DictionaryFieldRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
    disabled,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={
        isDragging ? `${styles.dictionaryEntryRow} ${styles.dragging}` : styles.dictionaryEntryRow
      }
    >
      <button
        type="button"
        className={styles.dragHandle}
        aria-label="Reorder entry"
        disabled={disabled}
        {...attributes}
        {...listeners}
      >
        <Icon name="grip" size={12} />
      </button>
      <div className={styles.dictionaryEntryContent}>{children}</div>
    </div>
  )
}
