import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Icon } from '../../components/Icon/Icon'
import { DismissableDropdown } from '../../components/Menu/DismissableDropdown'
import dropdownStyles from '../../components/Menu/DismissableDropdown.module.css'
import valueEditorStyles from './valueEditors.module.css'
import styles from './PillListEditor.module.css'
import type { PropertyValueData, SelectOption } from '../../domain/entities.types'
import type { PillItemKind } from './resolvePillItemKind'

interface PillListEditorProps {
  pillKind: PillItemKind
  value: PropertyValueData[]
  onChange: (value: PropertyValueData[]) => void
  disabled?: boolean
  maxSize?: number
}

export function PillListEditor({
  pillKind,
  value,
  onChange,
  disabled,
  maxSize,
}: PillListEditorProps) {
  const atMax = maxSize !== undefined && value.length >= maxSize

  const addItem = (item: string) => {
    onChange([...value, item])
  }

  const removeItem = (index: number) => {
    onChange(value.filter((_, itemIndex) => itemIndex !== index))
  }

  const updateItem = (index: number, next: string) => {
    onChange(value.map((item, itemIndex) => (itemIndex === index ? next : item)))
  }

  return (
    <ul className={styles.pillRow}>
      {value.map((item, index) => (
        <li key={index} className={styles.pill}>
          {pillKind.kind === 'text' ? (
            <TextPill
              value={typeof item === 'string' ? item : ''}
              onChange={(next) => updateItem(index, next)}
              disabled={disabled}
            />
          ) : (
            <SelectPill
              options={pillKind.options}
              value={typeof item === 'string' ? item : null}
              onChange={(next) => updateItem(index, next)}
              disabled={disabled}
            />
          )}
          <button
            type="button"
            className={styles.pillRemove}
            aria-label={`Remove item ${index + 1}`}
            onClick={() => removeItem(index)}
            disabled={disabled}
          >
            <Icon name="close" size={10} />
          </button>
        </li>
      ))}
      <li>
        {pillKind.kind === 'text' ? (
          <TextAdd onAdd={addItem} disabled={disabled || atMax} />
        ) : (
          <SelectAdd options={pillKind.options} onAdd={addItem} disabled={disabled || atMax} />
        )}
      </li>
    </ul>
  )
}

interface TextPillProps {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
}

function TextPill({ value, onChange, disabled }: TextPillProps) {
  return (
    <DismissableDropdown
      trigger={({ toggle, open }) => (
        <button
          type="button"
          className={styles.pillLabel}
          aria-expanded={open}
          onClick={toggle}
          disabled={disabled}
        >
          {value || <span className={styles.empty}>(empty)</span>}
        </button>
      )}
    >
      {({ close }) => <TextPillEditForm value={value} onChange={onChange} close={close} />}
    </DismissableDropdown>
  )
}

interface TextPillEditFormProps {
  value: string
  onChange: (value: string) => void
  close: () => void
}

function TextPillEditForm({ value, onChange, close }: TextPillEditFormProps) {
  const [draft, setDraft] = useState(value)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const submit = (event: FormEvent) => {
    event.preventDefault()
    onChange(draft.trim())
    close()
  }

  return (
    <form className={styles.editForm} onSubmit={submit}>
      <input
        ref={inputRef}
        type="text"
        className={valueEditorStyles.textInput}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        aria-label="Edit item"
      />
      <div className={styles.editFormActions}>
        <button type="button" className={styles.editFormCancel} onClick={close}>
          Cancel
        </button>
        <button type="submit" className={styles.editFormSave}>
          Save
        </button>
      </div>
    </form>
  )
}

interface SelectPillProps {
  options: SelectOption[]
  value: string | null
  onChange: (value: string) => void
  disabled?: boolean
}

function SelectPill({ options, value, onChange, disabled }: SelectPillProps) {
  const active = options.find((option) => option.value === value)
  const isStale = value !== null && !active

  return (
    <DismissableDropdown
      trigger={({ toggle, open }) => (
        <button
          type="button"
          className={styles.pillLabel}
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
        </>
      )}
    </DismissableDropdown>
  )
}

interface TextAddProps {
  onAdd: (value: string) => void
  disabled?: boolean
}

function TextAdd({ onAdd, disabled }: TextAddProps) {
  const [draft, setDraft] = useState('')

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const trimmed = draft.trim()
    if (!trimmed) return
    onAdd(trimmed)
    setDraft('')
  }

  return (
    <form className={styles.addForm} onSubmit={submit}>
      <input
        type="text"
        className={styles.addInput}
        placeholder="Add item"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        disabled={disabled}
        aria-label="New item"
      />
      <button type="submit" className={styles.addButton} aria-label="Add item" disabled={disabled}>
        <Icon name="add" size={14} />
      </button>
    </form>
  )
}

interface SelectAddProps {
  options: SelectOption[]
  onAdd: (value: string) => void
  disabled?: boolean
}

function SelectAdd({ options, onAdd, disabled }: SelectAddProps) {
  return (
    <DismissableDropdown
      trigger={({ toggle, open }) => (
        <button
          type="button"
          className={styles.addButton}
          aria-label="Add item"
          aria-expanded={open}
          onClick={toggle}
          disabled={disabled}
        >
          <Icon name="add" size={14} />
        </button>
      )}
    >
      {({ close }) => (
        <>
          {options.map((option) => (
            <button
              key={option.id}
              type="button"
              role="menuitem"
              className={dropdownStyles.menuItem}
              onClick={() => {
                onAdd(option.value)
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
