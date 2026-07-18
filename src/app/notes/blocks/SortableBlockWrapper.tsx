import type { ReactNode } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Icon } from '../../../components/Icon/Icon'
import { useDismissableMenu } from '../../../components/Menu/useDismissableMenu'
import { BlockActionsMenu, type BlockAction } from './BlockActionsMenu'
import styles from './SortableBlockWrapper.module.css'

interface SortableBlockWrapperProps {
  id: string
  actions: BlockAction[]
  children: ReactNode
}

export function SortableBlockWrapper({ id, actions, children }: SortableBlockWrapperProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
  })
  const {
    open: menuOpen,
    setOpen: setMenuOpen,
    containerRef,
  } = useDismissableMenu<HTMLDivElement>()

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={isDragging ? `${styles.block} ${styles.dragging}` : styles.block}
    >
      <div className={styles.chrome}>
        <div className={styles.gripContainer} ref={containerRef}>
          <button
            type="button"
            className={styles.gripButton}
            aria-label="Reorder block"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            {...attributes}
            {...listeners}
            onClick={() => setMenuOpen(!menuOpen)}
          >
            <Icon name="grip" />
          </button>
          {menuOpen && <BlockActionsMenu actions={actions} onClose={() => setMenuOpen(false)} />}
        </div>
      </div>
      <div className={styles.content}>{children}</div>
    </div>
  )
}
