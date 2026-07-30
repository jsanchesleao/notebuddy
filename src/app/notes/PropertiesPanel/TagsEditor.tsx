import { useState, type FormEvent } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { setNoteTags } from '../../../domain/notes/noteRepository'
import { listTags } from '../../../domain/tags/tagRepository'
import { getReadableTextColor } from '../../../lib/color/contrastColor'
import { Icon } from '../../../components/Icon/Icon'
import { TagColorPicker } from './TagColorPicker'
import styles from './TagsEditor.module.css'

interface TagsEditorProps {
  noteId: string
  tags: string[]
}

export function TagsEditor({ noteId, tags }: TagsEditorProps) {
  const [draft, setDraft] = useState('')
  const allTags = useLiveQuery(() => listTags(), [])
  const tagColors = new Map((allTags ?? []).map((tag) => [tag.name, tag.color]))

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
          {tags.map((tag) => {
            const color = tagColors.get(tag)
            const chipStyle = color
              ? { background: color, color: getReadableTextColor(color) }
              : undefined
            return (
              <li key={tag} className={styles.chip} style={chipStyle}>
                <TagColorPicker tagName={tag} color={color} />
                <button
                  type="button"
                  className={styles.chipRemove}
                  aria-label={`Remove tag ${tag}`}
                  onClick={() => removeTag(tag)}
                >
                  <Icon name="close" size={10} />
                </button>
              </li>
            )
          })}
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
