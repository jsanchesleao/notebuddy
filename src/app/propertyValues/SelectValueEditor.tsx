import { DismissableDropdown } from '../../components/Menu/DismissableDropdown'
import dropdownStyles from '../../components/Menu/DismissableDropdown.module.css'
import type { SelectOption } from '../../domain/entities.types'

interface SelectValueEditorProps {
  options: SelectOption[]
  value: string | null
  onChange: (value: string | null) => void
  disabled?: boolean
}

export function SelectValueEditor({ options, value, onChange, disabled }: SelectValueEditorProps) {
  const active = options.find((option) => option.value === value)

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
          {active?.label ?? 'Not set'}
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
