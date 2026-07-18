import { Icon } from '../../../components/Icon/Icon'
import { useDismissableMenu } from '../../../components/Menu/useDismissableMenu'
import type { NoteBlockType } from '../../../domain/blocks/blocks.types'
import { BLOCK_TYPE_CATALOG } from './blockTypeCatalog'
import styles from './AddBlockMenu.module.css'

interface AddBlockMenuProps {
  onInsert: (type: NoteBlockType) => void
}

export function AddBlockMenu({ onInsert }: AddBlockMenuProps) {
  const {
    open: menuOpen,
    setOpen: setMenuOpen,
    containerRef,
  } = useDismissableMenu<HTMLDivElement>()

  return (
    <div className={styles.container} ref={containerRef}>
      <button
        type="button"
        className={styles.trigger}
        aria-label="Add block"
        aria-expanded={menuOpen}
        onClick={() => setMenuOpen(!menuOpen)}
      >
        <Icon name="add" size={14} />
      </button>
      {menuOpen && (
        <div className={styles.menu}>
          {BLOCK_TYPE_CATALOG.map(({ type, label, icon }) => (
            <button
              key={type}
              type="button"
              className={styles.menuItem}
              onClick={() => {
                onInsert(type)
                setMenuOpen(false)
              }}
            >
              <Icon name={icon} size={14} /> {label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
