import { DismissableDropdown } from '../../components/Menu/DismissableDropdown'
import dropdownStyles from '../../components/Menu/DismissableDropdown.module.css'
import { TimeColumns } from './TimeColumns'

interface TimeValueEditorProps {
  value: string | null
  onChange: (value: string | null) => void
  disabled?: boolean
}

function splitTime(value: string | null): [string | null, string | null] {
  if (!value) return [null, null]
  const [hour, minute] = value.split(':')
  return [hour ?? null, minute ?? null]
}

export function TimeValueEditor({ value, onChange, disabled }: TimeValueEditorProps) {
  const [hour, minute] = splitTime(value)

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
        <TimeColumns
          hour={hour}
          minute={minute}
          onPickHour={(pickedHour) => onChange(`${pickedHour}:${minute ?? '00'}`)}
          onPickMinute={(pickedMinute, commit) => {
            onChange(`${hour ?? '00'}:${pickedMinute}`)
            if (commit) close()
          }}
        />
      )}
    </DismissableDropdown>
  )
}
