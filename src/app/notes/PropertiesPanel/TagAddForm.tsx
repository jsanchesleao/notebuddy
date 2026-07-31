import { useEffect, useRef, useState, type FormEvent, type RefObject } from 'react'
import { setNoteTags } from '../../../domain/notes/noteRepository'
import { useDismissOnOutsideOrEscape } from '../../../components/Menu/useDismissOnOutsideOrEscape'
import { Icon } from '../../../components/Icon/Icon'
import styles from './TagsEditor.module.css'

interface TagAddFormProps {
  noteId: string
  existingTags: string[]
  onCancel: () => void
  ignoreRef: RefObject<HTMLElement | null>
}

export function TagAddForm({ noteId, existingTags, onCancel, ignoreRef }: TagAddFormProps) {
  const [draft, setDraft] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const formRef = useDismissOnOutsideOrEscape<HTMLFormElement>(onCancel, ignoreRef)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const addTag = async (event: FormEvent) => {
    event.preventDefault()
    const trimmed = draft.trim()
    if (!trimmed || existingTags.includes(trimmed)) return
    await setNoteTags(noteId, [...existingTags, trimmed])
    setDraft('')
  }

  return (
    <form ref={formRef} className={styles.addForm} onSubmit={addTag}>
      <input
        ref={inputRef}
        type="text"
        className={styles.addInput}
        placeholder="Add tag"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        aria-label="New tag"
      />
      <button type="submit" className={styles.addButton} aria-label="Add tag">
        <Icon name="add" size={14} />
      </button>
      <button
        type="button"
        className={styles.cancelButton}
        aria-label="Cancel adding tag"
        onClick={onCancel}
      >
        <Icon name="close" size={12} />
      </button>
    </form>
  )
}
