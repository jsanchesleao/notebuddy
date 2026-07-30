import { useState, type KeyboardEvent } from 'react'
import { createId } from '../../domain/ids'
import { Icon } from '../../components/Icon/Icon'
import type { SelectOption } from '../../domain/entities.types'
import styles from './SelectOptionsEditor.module.css'

interface SelectOptionsEditorProps {
  options: SelectOption[]
  onChange: (options: SelectOption[]) => void
}

export function SelectOptionsEditor({ options, onChange }: SelectOptionsEditorProps) {
  const [draftLabel, setDraftLabel] = useState('')

  const addOption = () => {
    const trimmed = draftLabel.trim()
    if (!trimmed) return
    onChange([...options, { id: createId(), label: trimmed, value: trimmed }])
    setDraftLabel('')
  }

  const handleInputKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Enter') return
    event.preventDefault()
    addOption()
  }

  const removeOption = (id: string) => {
    onChange(options.filter((option) => option.id !== id))
  }

  const moveOption = (index: number, direction: -1 | 1) => {
    const target = index + direction
    if (target < 0 || target >= options.length) return
    const next = [...options]
    const [moved] = next.splice(index, 1)
    next.splice(target, 0, moved)
    onChange(next)
  }

  return (
    <div className={styles.container}>
      <ul className={styles.list}>
        {options.map((option, index) => (
          <li key={option.id} className={styles.item}>
            <span className={styles.label}>{option.label}</span>
            <button
              type="button"
              className={styles.iconButton}
              aria-label={`Move ${option.label} up`}
              disabled={index === 0}
              onClick={() => moveOption(index, -1)}
            >
              <Icon name="up" size={12} />
            </button>
            <button
              type="button"
              className={styles.iconButton}
              aria-label={`Move ${option.label} down`}
              disabled={index === options.length - 1}
              onClick={() => moveOption(index, 1)}
            >
              <Icon name="down" size={12} />
            </button>
            <button
              type="button"
              className={styles.iconButton}
              aria-label={`Remove ${option.label}`}
              onClick={() => removeOption(option.id)}
            >
              <Icon name="close" size={12} />
            </button>
          </li>
        ))}
      </ul>
      <div className={styles.addForm}>
        <input
          type="text"
          className={styles.addInput}
          placeholder="Option label"
          value={draftLabel}
          onChange={(event) => setDraftLabel(event.target.value)}
          onKeyDown={handleInputKeyDown}
          aria-label="New option label"
        />
        <button type="button" className={styles.addButton} onClick={addOption}>
          <Icon name="add" size={14} /> Add option
        </button>
      </div>
    </div>
  )
}
