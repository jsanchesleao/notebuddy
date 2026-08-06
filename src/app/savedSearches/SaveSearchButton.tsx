import { useState, type FormEvent } from 'react'
import { Icon } from '../../components/Icon/Icon'
import { createSavedSearch } from '../../domain/savedSearches/savedSearchRepository'
import type { FilterState } from '../../domain/notes/noteFilter.types'
import styles from './SaveSearchButton.module.css'

interface SaveSearchButtonProps {
  query: string
  filter: FilterState
  notebookId: string | null
  boardId: string | null
}

// Enabled once there's a non-empty query or at least one active filter criterion — mirrors
// NoteFilter's own activeCriteriaCount check for "is this filter actually doing anything."
export function SaveSearchButton({ query, filter, notebookId, boardId }: SaveSearchButtonProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [name, setName] = useState('')

  const activeCriteriaCount = filter.blocks.reduce(
    (count, block) => count + block.criteria.length,
    0,
  )
  const canSave = query.trim() !== '' || activeCriteriaCount > 0
  if (!canSave) return null

  const close = () => {
    setIsOpen(false)
    setName('')
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    await createSavedSearch({ name: trimmed, notebookId, boardId, query, filter })
    close()
  }

  if (!isOpen) {
    return (
      <button type="button" className={styles.trigger} onClick={() => setIsOpen(true)}>
        <Icon name="add" size={14} /> Save search
      </button>
    )
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <input
        type="text"
        className={styles.input}
        placeholder="Name this search"
        value={name}
        onChange={(event) => setName(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Escape') close()
        }}
        aria-label="Saved search name"
      />
      <button type="submit" className={styles.submit}>
        Save
      </button>
      <button type="button" className={styles.cancel} onClick={close}>
        Cancel
      </button>
    </form>
  )
}
