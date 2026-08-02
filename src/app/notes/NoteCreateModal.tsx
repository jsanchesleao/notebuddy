import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { createNote } from '../../domain/notes/noteRepository'
import { listNoteTypes } from '../../domain/noteTypes/noteTypeRepository'
import { Modal } from '../../components/Modal/Modal'
import { NoteTypeSelect } from '../dataTypes/NoteTypeSelect'
import type { Notebook } from '../../domain/entities.types'
import styles from './NoteCreateModal.module.css'

interface NoteCreateModalProps {
  open: boolean
  onClose: () => void
  notebook: Notebook | null
  boardId?: string | null
  // Which column a board card should start in — omitted defaults to the board's first
  // visible column (see createNote's statusValue). Ignored when boardId is not set.
  defaultStatusValue?: string
}

const TITLE_ID = 'note-create-modal-title'

export function NoteCreateModal({
  open,
  onClose,
  notebook,
  boardId,
  defaultStatusValue,
}: NoteCreateModalProps) {
  const navigate = useNavigate()
  const noteTypes = useLiveQuery(() => listNoteTypes(), [], [])
  const [title, setTitle] = useState('')
  const [noteTypeId, setNoteTypeId] = useState<string | null>(notebook?.defaultNoteTypeId ?? null)
  const [prevOpen, setPrevOpen] = useState(open)

  // Reseed the note type from the notebook's default every time the (persistently mounted)
  // modal transitions to open, rather than only on first mount.
  if (open !== prevOpen) {
    setPrevOpen(open)
    if (open) setNoteTypeId(notebook?.defaultNoteTypeId ?? null)
  }

  const reset = () => {
    setTitle('')
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    const trimmed = title.trim()
    const notebookId = notebook?.id ?? null
    if (!trimmed || (!notebookId && !boardId)) return

    const note = await createNote({
      notebookId,
      boardId,
      title: trimmed,
      noteTypeId,
      statusValue: defaultStatusValue,
    })
    reset()
    onClose()
    // Board cards stay on the kanban board instead of jumping into the full note editor, so
    // several cards can be added in a row without a round trip through each one.
    if (!boardId) {
      navigate(`/notes/${note.id}`)
    }
  }

  return (
    <Modal open={open} onClose={handleClose} labelledBy={TITLE_ID}>
      <form className={styles.form} onSubmit={handleSubmit}>
        <h2 id={TITLE_ID} className={styles.heading}>
          New Note
        </h2>
        <input
          type="text"
          className={styles.titleInput}
          placeholder="Note title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          aria-label="New note title"
        />
        <NoteTypeSelect value={noteTypeId} onChange={setNoteTypeId} noteTypes={noteTypes ?? []} />
        <div className={styles.actions}>
          <button type="submit" className={styles.submit}>
            Create note
          </button>
          <button type="button" className={styles.cancel} onClick={handleClose}>
            Cancel
          </button>
        </div>
      </form>
    </Modal>
  )
}
