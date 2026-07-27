import { useState } from 'react'
import { DismissableDropdown } from '../../components/Menu/DismissableDropdown'
import dropdownStyles from '../../components/Menu/DismissableDropdown.module.css'
import { CalendarGrid } from './CalendarGrid'
import { getCalendarWeeks, parseDateParts } from './dateMath'
import styles from './valueEditors.module.css'

interface DateValueEditorProps {
  value: string | null
  onChange: (value: string | null) => void
  disabled?: boolean
}

export function DateValueEditor({ value, onChange, disabled }: DateValueEditorProps) {
  const initial = parseDateParts(value)
  const [viewYear, setViewYear] = useState(initial.year)
  const [viewMonth, setViewMonth] = useState(initial.month)

  const navigate = (direction: -1 | 1) => {
    const next = new Date(viewYear, viewMonth + direction, 1)
    setViewYear(next.getFullYear())
    setViewMonth(next.getMonth())
  }

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
            viewYear={viewYear}
            viewMonth={viewMonth}
            weeks={getCalendarWeeks(viewYear, viewMonth)}
            selectedDate={value}
            onNavigate={navigate}
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
