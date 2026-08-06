import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Icon } from '../../components/Icon/Icon'
import { DismissableDropdown } from '../../components/Menu/DismissableDropdown'
import { createSavedSearch } from '../../domain/savedSearches/savedSearchRepository'
import type { FilterState } from '../../domain/notes/noteFilter.types'
import styles from './SaveSearchButton.module.css'

interface SaveSearchButtonProps {
  query: string
  filter: FilterState
  selectedTags: string[]
  notebookId: string | null
  boardId: string | null
}

// Enabled once there's a non-empty query, at least one active filter criterion, or a selected
// tag pill — mirrors NoteFilter's own activeCriteriaCount check for "is this search actually
// doing anything."
export function SaveSearchButton({
  query,
  filter,
  selectedTags,
  notebookId,
  boardId,
}: SaveSearchButtonProps) {
  const activeCriteriaCount = filter.blocks.reduce(
    (count, block) => count + block.criteria.length,
    0,
  )
  const canSave = query.trim() !== '' || activeCriteriaCount > 0 || selectedTags.length > 0
  if (!canSave) return null

  return (
    <DismissableDropdown
      className={styles.container}
      menuClassName={styles.panel}
      trigger={({ toggle, open }) => (
        <button type="button" className={styles.toggle} aria-expanded={open} onClick={toggle}>
          <Icon name="add" size={14} /> Save search
        </button>
      )}
    >
      {({ close }) => (
        <SaveSearchForm
          query={query}
          filter={filter}
          selectedTags={selectedTags}
          notebookId={notebookId}
          boardId={boardId}
          onClose={close}
        />
      )}
    </DismissableDropdown>
  )
}

interface SaveSearchFormProps extends SaveSearchButtonProps {
  onClose: () => void
}

function SaveSearchForm({
  query,
  filter,
  selectedTags,
  notebookId,
  boardId,
  onClose,
}: SaveSearchFormProps) {
  const [name, setName] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    await createSavedSearch({ name: trimmed, notebookId, boardId, query, filter, selectedTags })
    onClose()
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <input
        ref={inputRef}
        type="text"
        className={styles.input}
        placeholder="Name this search"
        value={name}
        onChange={(event) => setName(event.target.value)}
        aria-label="Saved search name"
      />
      <button type="submit" className={styles.submit}>
        Save
      </button>
      <button type="button" className={styles.cancel} onClick={onClose}>
        Cancel
      </button>
    </form>
  )
}
