import { useState, type FormEvent } from 'react'
import { Icon } from '../../components/Icon/Icon'
import styles from './InlineCreateForm.module.css'

interface InlineCreateFormProps {
  label: string
  onCreate: (title: string) => unknown
}

export function InlineCreateForm({ label, onCreate }: InlineCreateFormProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [title, setTitle] = useState('')

  const close = () => {
    setIsOpen(false)
    setTitle('')
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    const trimmed = title.trim()
    if (!trimmed) return
    await onCreate(trimmed)
    close()
  }

  if (!isOpen) {
    return (
      <button type="button" className={styles.trigger} onClick={() => setIsOpen(true)}>
        <Icon name="add" size={14} /> New {label}
      </button>
    )
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <input
        type="text"
        className={styles.input}
        placeholder={`${label} title`}
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Escape') close()
        }}
        aria-label={`New ${label.toLowerCase()} title`}
      />
      <button type="submit" className={styles.submit}>
        Add
      </button>
      <button type="button" className={styles.cancel} onClick={close}>
        Cancel
      </button>
    </form>
  )
}
