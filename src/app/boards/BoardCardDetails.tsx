import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { setNoteDescription } from '../../domain/notes/noteRepository'
import { useOpfsBlobUrl } from '../notes/useOpfsBlobUrl'
import { Icon } from '../../components/Icon/Icon'
import type { Note } from '../../domain/entities.types'
import styles from './BoardCardDetails.module.css'

interface BoardCardDetailsProps {
  note: Note
}

// Board-card-only fields (description/image preview), edited from the note's own page rather
// than the kanban card itself — the card is a compact preview of these, not their editor.
// Image upload/replace/remove lives in the page header's edit menu (EntityPageHeader
// menuActions); this section only previews the image and hosts the click-to-edit description.
export function BoardCardDetails({ note }: BoardCardDetailsProps) {
  const [expanded, setExpanded] = useState(false)
  const imageUrl = useOpfsBlobUrl(note.cardImagePath ?? '')

  return (
    <section className={styles.section}>
      <button
        type="button"
        className={styles.toggle}
        aria-expanded={expanded}
        onClick={() => setExpanded((value) => !value)}
      >
        <Icon name={expanded ? 'chevronDown' : 'chevronRight'} size={12} />
        Card details
      </button>
      {expanded && (
        <div className={styles.content}>
          {imageUrl && <img src={imageUrl} alt="" className={styles.image} />}
          <DescriptionField note={note} />
        </div>
      )}
    </section>
  )
}

interface DescriptionFieldProps {
  note: Note
}

// Click-to-edit, same shape as PropertyRow's SimplePropertyRow: view mode shows plain text
// (or an "Add description" affordance when empty), edit mode mounts a form that commits on
// blur and discards the draft on Escape. Enter inserts a newline as expected in a textarea;
// Ctrl/Cmd+Enter commits explicitly for anyone who wants to save without blurring.
function DescriptionField({ note }: DescriptionFieldProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [draft, setDraft] = useState(note.description ?? '')
  const formRef = useRef<HTMLFormElement>(null)
  const cancelledRef = useRef(false)

  useEffect(() => {
    if (!isEditing) return
    const textarea = formRef.current?.querySelector('textarea')
    textarea?.focus()
  }, [isEditing])

  const startEditing = () => {
    setDraft(note.description ?? '')
    cancelledRef.current = false
    setIsEditing(true)
  }

  const commit = async () => {
    await setNoteDescription(note.id, draft)
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    await commit()
    setIsEditing(false)
  }

  const handleBlur = async () => {
    if (cancelledRef.current) {
      cancelledRef.current = false
      return
    }
    await commit()
    setIsEditing(false)
  }

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      cancelledRef.current = true
      setIsEditing(false)
    } else if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
      event.preventDefault()
      void commit().then(() => setIsEditing(false))
    }
  }

  if (isEditing) {
    return (
      /* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions --
         onBlur/onKeyDown manage the commit/cancel lifecycle of the textarea rendered inside,
         not the form itself. */
      <form
        ref={formRef}
        className={styles.descriptionForm}
        onSubmit={handleSubmit}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
      >
        <textarea
          className={styles.textarea}
          placeholder="Description shown on the card"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          aria-label="Card description"
        />
      </form>
    )
  }

  if (note.description) {
    return (
      <button type="button" className={styles.descriptionText} onClick={startEditing}>
        {note.description}
      </button>
    )
  }

  return (
    <button type="button" className={styles.addDescriptionButton} onClick={startEditing}>
      <Icon name="add" size={12} /> Add description
    </button>
  )
}
