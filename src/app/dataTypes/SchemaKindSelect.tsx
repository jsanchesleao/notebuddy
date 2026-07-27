import { DismissableDropdown } from '../../components/Menu/DismissableDropdown'
import dropdownStyles from '../../components/Menu/DismissableDropdown.module.css'
import { Icon } from '../../components/Icon/Icon'
import { kindKeyFor, type SchemaKindOption } from './schemaKinds'
import type { DataTypeRef } from '../../domain/entities.types'

interface SchemaKindSelectProps {
  value: DataTypeRef
  options: SchemaKindOption[]
  onChange: (next: DataTypeRef) => void
}

export function SchemaKindSelect({ value, options, onChange }: SchemaKindSelectProps) {
  const activeKey = kindKeyFor(value)
  const active = options.find((option) => option.key === activeKey)

  return (
    <DismissableDropdown
      trigger={({ toggle, open }) => (
        <button
          type="button"
          className={dropdownStyles.trigger}
          aria-expanded={open}
          onClick={toggle}
        >
          {active?.label ?? 'Choose type'} <Icon name="chevronDown" size={12} />
        </button>
      )}
    >
      {({ close }) => (
        <>
          {options.map((option) => (
            <button
              key={option.key}
              type="button"
              role="menuitemradio"
              aria-checked={option.key === activeKey}
              className={dropdownStyles.menuItem}
              onClick={() => {
                onChange(option.build())
                close()
              }}
            >
              {option.label}
            </button>
          ))}
        </>
      )}
    </DismissableDropdown>
  )
}
