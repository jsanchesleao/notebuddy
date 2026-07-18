import { Icon, type IconName } from '../../../components/Icon/Icon'
import styles from './BlockActionsMenu.module.css'

export interface BlockAction {
  key: string
  label: string
  icon: IconName
  onSelect: () => void
  danger?: boolean
}

interface BlockActionsMenuProps {
  actions: BlockAction[]
  onClose: () => void
}

export function BlockActionsMenu({ actions, onClose }: BlockActionsMenuProps) {
  return (
    <div role="menu" className={styles.menu}>
      {actions.map((action) => (
        <button
          key={action.key}
          type="button"
          role="menuitem"
          className={action.danger ? styles.dangerItem : styles.menuItem}
          onClick={() => {
            action.onSelect()
            onClose()
          }}
        >
          <Icon name={action.icon} size={14} /> {action.label}
        </button>
      ))}
    </div>
  )
}
