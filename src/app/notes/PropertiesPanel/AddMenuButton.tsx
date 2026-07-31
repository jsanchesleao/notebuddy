import type { RefObject } from 'react'
import { DismissableDropdown } from '../../../components/Menu/DismissableDropdown'
import dropdownStyles from '../../../components/Menu/DismissableDropdown.module.css'
import { Icon } from '../../../components/Icon/Icon'
import styles from './PropertiesPanelContent.module.css'

export type AddAction = 'tag' | 'property'

interface AddMenuButtonProps {
  activeAction: AddAction | null
  onSelect: (action: AddAction) => void
  onCloseActive: () => void
  triggerRef: RefObject<HTMLButtonElement | null>
}

export function AddMenuButton({
  activeAction,
  onSelect,
  onCloseActive,
  triggerRef,
}: AddMenuButtonProps) {
  return (
    <DismissableDropdown
      trigger={({ open, toggle }) => (
        <button
          ref={triggerRef}
          type="button"
          className={styles.iconButton}
          aria-label="Add tag or property"
          aria-haspopup="menu"
          aria-expanded={open}
          aria-pressed={activeAction !== null}
          onClick={() => {
            // A form is already open — re-clicking the trigger closes it rather than
            // opening the (currently-closed) dropdown menu.
            if (activeAction !== null) {
              onCloseActive()
              return
            }
            toggle()
          }}
        >
          <Icon name="add" size={16} />
        </button>
      )}
    >
      {({ close }) => (
        <>
          <button
            type="button"
            role="menuitem"
            className={dropdownStyles.menuItem}
            onClick={() => {
              onSelect('tag')
              close()
            }}
          >
            Add tag
          </button>
          <button
            type="button"
            role="menuitem"
            className={dropdownStyles.menuItem}
            onClick={() => {
              onSelect('property')
              close()
            }}
          >
            Add property
          </button>
        </>
      )}
    </DismissableDropdown>
  )
}
