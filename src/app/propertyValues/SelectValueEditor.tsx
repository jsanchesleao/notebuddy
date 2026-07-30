import { DismissableDropdown } from '../../components/Menu/DismissableDropdown'
import dropdownStyles from '../../components/Menu/DismissableDropdown.module.css'
import styles from './SelectValueEditor.module.css'
import type { SelectOption } from '../../domain/entities.types'

interface SelectValueEditorProps {
  options: SelectOption[]
  value: string | null
  onChange: (value: string | null) => void
  disabled?: boolean
}

export function SelectValueEditor({ options, value, onChange, disabled }: SelectValueEditorProps) {
  const active = options.find((option) => option.value === value)
  // A stored value that no longer matches any declared option — its option was removed
  // from an ad hoc property, or from a shared Option Set that other notes still reference —
  // is shown as-is rather than collapsed into "Not set", so the underlying data isn't hidden.
  const isStale = value !== null && !active

  return (
    <DismissableDropdown
      trigger={({ toggle, open }) => (
        <button
          type="button"
          className={dropdownStyles.trigger}
          aria-expanded={open}
          onClick={toggle}
          disabled={disabled}
        >
          {active ? (
            active.label
          ) : isStale ? (
            <span className={styles.stale}>{value} (unavailable)</span>
          ) : (
            'Not set'
          )}
        </button>
      )}
    >
      {({ close }) => (
        <>
          {options.map((option) => (
            <button
              key={option.id}
              type="button"
              role="menuitemradio"
              aria-checked={option.value === value}
              className={dropdownStyles.menuItem}
              onClick={() => {
                onChange(option.value)
                close()
              }}
            >
              {option.label}
            </button>
          ))}
          {value !== null && (
            <button
              type="button"
              className={dropdownStyles.menuItem}
              onClick={() => {
                onChange(null)
                close()
              }}
            >
              Clear
            </button>
          )}
        </>
      )}
    </DismissableDropdown>
  )
}
