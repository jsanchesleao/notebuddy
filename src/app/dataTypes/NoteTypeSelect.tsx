import { DismissableDropdown } from '../../components/Menu/DismissableDropdown'
import dropdownStyles from '../../components/Menu/DismissableDropdown.module.css'
import { Icon } from '../../components/Icon/Icon'
import type { NoteType } from '../../domain/entities.types'

interface NoteTypeSelectProps {
  value: string | null
  onChange: (id: string | null) => void
  noteTypes: NoteType[]
  triggerPrefix?: string
  disabled?: boolean
}

export function NoteTypeSelect({
  value,
  onChange,
  noteTypes,
  triggerPrefix,
  disabled,
}: NoteTypeSelectProps) {
  const selectedNoteType = noteTypes.find((type) => type.id === value)
  const triggerLabel = selectedNoteType?.name ?? 'Blank'

  return (
    <DismissableDropdown
      trigger={({ toggle, open: menuOpen }) => (
        <button
          type="button"
          className={dropdownStyles.trigger}
          aria-expanded={menuOpen}
          onClick={toggle}
          disabled={disabled}
        >
          {triggerPrefix ? `${triggerPrefix} ${triggerLabel}` : triggerLabel}{' '}
          <Icon name="chevronDown" size={12} />
        </button>
      )}
    >
      {({ close }) => (
        <>
          <button
            type="button"
            role="menuitemradio"
            aria-checked={value === null}
            className={dropdownStyles.menuItem}
            onClick={() => {
              onChange(null)
              close()
            }}
          >
            Blank
          </button>
          {noteTypes.map((type) => (
            <button
              key={type.id}
              type="button"
              role="menuitemradio"
              aria-checked={type.id === value}
              className={dropdownStyles.menuItem}
              onClick={() => {
                onChange(type.id)
                close()
              }}
            >
              {type.name}
            </button>
          ))}
        </>
      )}
    </DismissableDropdown>
  )
}
