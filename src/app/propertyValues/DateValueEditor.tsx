import { DismissableDropdown } from '../../components/Menu/DismissableDropdown'
import dropdownStyles from '../../components/Menu/DismissableDropdown.module.css'
import { CalendarGrid } from './CalendarGrid'
import styles from './valueEditors.module.css'

interface DateValueEditorProps {
  value: string | null
  onChange: (value: string | null) => void
  disabled?: boolean
}

export function DateValueEditor({ value, onChange, disabled }: DateValueEditorProps) {
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
          {value ?? 'Not set'}
        </button>
      )}
    >
      {({ close }) => (
        <>
          <CalendarGrid
            selectedDate={value}
            onPick={(date) => {
              onChange(date)
              close()
            }}
          />
          {value && (
            <button
              type="button"
              className={styles.clearButton}
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
