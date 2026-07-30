import { useState, type FormEvent } from 'react'
import { SelectOptionsEditor } from '../propertyValues/SelectOptionsEditor'
import type { SelectOption } from '../../domain/entities.types'
import styles from './OptionSetForm.module.css'

interface OptionSetFormProps {
  initialName?: string
  initialOptions?: SelectOption[]
  nameLabel: string
  submitLabel: string
  onSubmit: (name: string, options: SelectOption[]) => Promise<void>
  onCancel: () => void
}

export function OptionSetForm({
  initialName = '',
  initialOptions = [],
  nameLabel,
  submitLabel,
  onSubmit,
  onCancel,
}: OptionSetFormProps) {
  const [name, setName] = useState(initialName)
  const [options, setOptions] = useState<SelectOption[]>(initialOptions)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return

    setError(null)
    try {
      await onSubmit(trimmed, options)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    }
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <input
        type="text"
        className={styles.nameInput}
        placeholder="Set name"
        value={name}
        onChange={(event) => setName(event.target.value)}
        aria-label={nameLabel}
      />
      <SelectOptionsEditor options={options} onChange={setOptions} />
      <div className={styles.actions}>
        <button type="submit" className={styles.saveButton}>
          {submitLabel}
        </button>
        <button type="button" className={styles.cancelButton} onClick={onCancel}>
          Cancel
        </button>
      </div>
      {error && <p className={styles.error}>{error}</p>}
    </form>
  )
}
