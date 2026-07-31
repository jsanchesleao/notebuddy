import { DismissableDropdown } from '../../components/Menu/DismissableDropdown'
import dropdownStyles from '../../components/Menu/DismissableDropdown.module.css'
import { CalendarGrid } from './CalendarGrid'
import { TimeColumns } from './TimeColumns'
import styles from './DateTimeValueEditor.module.css'

interface DateTimeValueEditorProps {
  value: string | null
  onChange: (value: string | null) => void
  disabled?: boolean
}

// Below this width (comfortably above the Drawer panel's 22rem, below the
// Modal panel's 42rem) the calendar and time columns no longer fit
// side-by-side without overflowing, so they stack instead.
const STACK_BELOW_WIDTH_PX = 384

function splitValue(value: string | null): {
  date: string | null
  hour: string | null
  minute: string | null
} {
  if (!value) return { date: null, hour: null, minute: null }
  const [date, time] = value.split('T')
  const [hour, minute] = (time ?? '').split(':')
  return { date: date ?? null, hour: hour ?? null, minute: minute ?? null }
}

export function DateTimeValueEditor({ value, onChange, disabled }: DateTimeValueEditorProps) {
  const { date, hour, minute } = splitValue(value)

  const commit = (nextDate: string | null, nextHour: string | null, nextMinute: string | null) => {
    if (!nextDate) {
      onChange(null)
      return
    }
    onChange(`${nextDate}T${nextHour ?? '00'}:${nextMinute ?? '00'}`)
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
          {value ? value.replace('T', ' ') : 'Not set'}
        </button>
      )}
    >
      {({ availableWidth }) => (
        <div className={styles.combined} data-stacked={availableWidth < STACK_BELOW_WIDTH_PX}>
          <CalendarGrid
            selectedDate={date}
            onPick={(pickedDate) => commit(pickedDate, hour, minute)}
          />
          <TimeColumns
            hour={hour}
            minute={minute}
            onPickHour={(pickedHour) => commit(date, pickedHour, minute)}
            onPickMinute={(pickedMinute) => commit(date, hour, pickedMinute)}
          />
        </div>
      )}
    </DismissableDropdown>
  )
}
