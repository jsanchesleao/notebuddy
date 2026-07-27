import { useState, type FormEvent } from 'react'
import { setNoteTags } from '../../../domain/notes/noteRepository'
import { Icon } from '../../../components/Icon/Icon'
import styles from './TagsEditor.module.css'

interface TagsEditorProps {
  noteId: string
  tags: string[]
}

export function TagsEditor({ noteId, tags }: TagsEditorProps) {
  const [draft, setDraft] = useState('')

  const addTag = async (event: FormEvent) => {
    event.preventDefault()
    const trimmed = draft.trim()
    if (!trimmed || tags.includes(trimmed)) return
    await setNoteTags(noteId, [...tags, trimmed])
    setDraft('')
  }

  const removeTag = async (tag: string) => {
    await setNoteTags(
      noteId,
      tags.filter((existing) => existing !== tag),
    )
  }

  return (
    <div className={styles.container}>
      {tags.length > 0 && (
        <ul className={styles.chips}>
          {tags.map((tag) => (
            <li key={tag} className={styles.chip}>
              {tag}
              <button
                type="button"
                className={styles.chipRemove}
                aria-label={`Remove tag ${tag}`}
                onClick={() => removeTag(tag)}
              >
                <Icon name="close" size={10} />
              </button>
            </li>
          ))}
        </ul>
      )}
      <form className={styles.addForm} onSubmit={addTag}>
        <input
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
      </form>
    </div>
  )
}
