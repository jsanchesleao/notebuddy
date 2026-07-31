import type { RefObject } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { setNoteTags } from '../../../domain/notes/noteRepository'
import { listTags } from '../../../domain/tags/tagRepository'
import { getReadableTextColor } from '../../../lib/color/contrastColor'
import { Icon } from '../../../components/Icon/Icon'
import { TagColorPicker } from './TagColorPicker'
import { TagAddForm } from './TagAddForm'
import styles from './TagsEditor.module.css'

interface TagsEditorProps {
  noteId: string
  tags: string[]
  isAdding: boolean
  onCancelAdd: () => void
  ignoreRef: RefObject<HTMLElement | null>
}

export function TagsEditor({ noteId, tags, isAdding, onCancelAdd, ignoreRef }: TagsEditorProps) {
  const allTags = useLiveQuery(() => listTags(), [])
  const tagColors = new Map((allTags ?? []).map((tag) => [tag.name, tag.color]))

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
      {isAdding && (
        <TagAddForm noteId={noteId} existingTags={tags} onCancel={onCancelAdd} ignoreRef={ignoreRef} />
      )}
    </div>
  )
}
