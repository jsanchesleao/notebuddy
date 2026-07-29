import { useDismissableMenu } from '../../components/Menu/useDismissableMenu'
import { Icon } from '../../components/Icon/Icon'
import { SchemaKindMenu } from './SchemaKindMenu'
import { kindKeyFor, type SchemaKindOption } from './schemaKinds'
import type { DataTypeRef } from '../../domain/entities.types'
import styles from './SchemaKindSelect.module.css'

interface SchemaKindSelectProps {
  value: DataTypeRef
  options: SchemaKindOption[]
  onChange: (next: DataTypeRef) => void
}

export function SchemaKindSelect({ value, options, onChange }: SchemaKindSelectProps) {
  const { open, setOpen, containerRef } = useDismissableMenu<HTMLDivElement>()
  const activeKey = kindKeyFor(value)
  const active = options.find((option) => option.key === activeKey)

  return (
    <div className={styles.container} ref={containerRef}>
      <button
        type="button"
        className={styles.trigger}
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        <span className={styles.triggerLabel}>{active?.label ?? 'Choose type'}</span>
        <Icon name="chevronDown" size={12} />
      </button>
      {open && (
        <SchemaKindMenu
          options={options}
          activeKey={activeKey}
          onSelect={(option) => {
            onChange(option.build())
            setOpen(false)
          }}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  )
}
