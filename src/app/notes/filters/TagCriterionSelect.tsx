import { DismissableDropdown } from '../../../components/Menu/DismissableDropdown'
import dropdownStyles from '../../../components/Menu/DismissableDropdown.module.css'
import { Icon } from '../../../components/Icon/Icon'
import type { TagRecord } from '../../../domain/entities.types'

interface TagCriterionSelectProps {
  value: string
  onChange: (tag: string) => void
  tags: TagRecord[]
}

export function TagCriterionSelect({ value, onChange, tags }: TagCriterionSelectProps) {
  return (
    <DismissableDropdown
      trigger={({ toggle, open }) => (
        <button
          type="button"
          className={dropdownStyles.trigger}
          aria-expanded={open}
          onClick={toggle}
        >
          {value || 'Choose a tag'} <Icon name="chevronDown" size={12} />
        </button>
      )}
    >
      {({ close }) => (
        <>
          {tags.length === 0 && <span className={dropdownStyles.menuItem}>No tags yet</span>}
          {tags.map((tag) => (
            <button
              key={tag.name}
              type="button"
              role="menuitemradio"
              aria-checked={tag.name === value}
              className={dropdownStyles.menuItem}
              onClick={() => {
                onChange(tag.name)
                close()
              }}
            >
              {tag.name}
            </button>
          ))}
        </>
      )}
    </DismissableDropdown>
  )
}
