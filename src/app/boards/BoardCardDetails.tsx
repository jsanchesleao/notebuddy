import { useEffect, useRef, useState } from 'react'
import { setNoteCardImagePath, setNoteDescription } from '../../domain/notes/noteRepository'
import { useOpfsImageUpload } from '../notes/useOpfsImageUpload'
import { useOpfsBlobUrl } from '../notes/useOpfsBlobUrl'
import { SAVE_DEBOUNCE_MS } from '../notes/blocks/blockEditing.constants'
import { Icon } from '../../components/Icon/Icon'
import type { Note } from '../../domain/entities.types'
import styles from './BoardCardDetails.module.css'

interface BoardCardDetailsProps {
  note: Note
}

// Board-card-only fields (description/image), edited from the note's own page rather than
// the kanban card itself — the card is a compact preview of these, not their editor.
export function BoardCardDetails({ note }: BoardCardDetailsProps) {
  const [description, setDescription] = useState(note.description ?? '')
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const imageUrl = useOpfsBlobUrl(note.cardImagePath ?? '')
  const uploadImage = useOpfsImageUpload({
    ownerId: note.id,
    currentPath: note.cardImagePath,
    onUploaded: (path) => setNoteCardImagePath(note.id, path),
  })

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    }
  }, [])

  const handleDescriptionChange = (value: string) => {
    setDescription(value)
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    saveTimeoutRef.current = setTimeout(() => setNoteDescription(note.id, value), SAVE_DEBOUNCE_MS)
  }

  return (
    <section className={styles.section}>
      <h2 className={styles.heading}>Card details</h2>
      {imageUrl && <img src={imageUrl} alt="" className={styles.image} />}
      <label className={styles.uploadButton}>
        <Icon name="image" size={14} /> {note.cardImagePath ? 'Replace image' : 'Add image'}
        <input
          type="file"
          accept="image/*"
          className={styles.hiddenInput}
          onChange={(event) => {
            const file = event.target.files?.[0]
            if (file) uploadImage(file)
            event.target.value = ''
          }}
        />
      </label>
      <textarea
        className={styles.textarea}
        placeholder="Description shown on the card"
        value={description}
        onChange={(event) => handleDescriptionChange(event.target.value)}
        aria-label="Card description"
      />
    </section>
  )
}
