import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { createNote } from '../../domain/notes/noteRepository'
import { listNoteTypes } from '../../domain/noteTypes/noteTypeRepository'
import { Modal } from '../../components/Modal/Modal'
import { DismissableDropdown } from '../../components/Menu/DismissableDropdown'
import dropdownStyles from '../../components/Menu/DismissableDropdown.module.css'
import { Icon } from '../../components/Icon/Icon'
import styles from './NoteCreateModal.module.css'

interface NoteCreateModalProps {
  open: boolean
  onClose: () => void
  notebookId: string | null
  boardId?: string | null
}

const TITLE_ID = 'note-create-modal-title'

export function NoteCreateModal({ open, onClose, notebookId, boardId }: NoteCreateModalProps) {
  const navigate = useNavigate()
  const noteTypes = useLiveQuery(() => listNoteTypes(), [], [])
  const [title, setTitle] = useState('')
  const [noteTypeId, setNoteTypeId] = useState<string | null>(null)

  const selectedNoteType = noteTypes?.find((type) => type.id === noteTypeId)

  const reset = () => {
    setTitle('')
    setNoteTypeId(null)
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    const trimmed = title.trim()
    if (!trimmed || !notebookId) return

    const note = await createNote({ notebookId, boardId, title: trimmed, noteTypeId })
    reset()
    onClose()
    navigate(`/notes/${note.id}`)
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
        <DismissableDropdown
          trigger={({ toggle, open: menuOpen }) => (
            <button
              type="button"
              className={dropdownStyles.trigger}
              aria-expanded={menuOpen}
              onClick={toggle}
            >
              {selectedNoteType?.name ?? 'Blank'} <Icon name="chevronDown" size={12} />
            </button>
          )}
        >
          {({ close }) => (
            <>
              <button
                type="button"
                role="menuitemradio"
                aria-checked={noteTypeId === null}
                className={dropdownStyles.menuItem}
                onClick={() => {
                  setNoteTypeId(null)
                  close()
                }}
              >
                Blank
              </button>
              {(noteTypes ?? []).map((type) => (
                <button
                  key={type.id}
                  type="button"
                  role="menuitemradio"
                  aria-checked={type.id === noteTypeId}
                  className={dropdownStyles.menuItem}
                  onClick={() => {
                    setNoteTypeId(type.id)
                    close()
                  }}
                >
                  {type.name}
                </button>
              ))}
            </>
          )}
        </DismissableDropdown>
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
