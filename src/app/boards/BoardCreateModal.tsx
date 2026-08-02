import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { createBoard } from '../../domain/boards/boardRepository'
import { listCustomDataTypes } from '../../domain/dataTypes/dataTypeRepository'
import { Modal } from '../../components/Modal/Modal'
import { OptionSetPicker } from '../dataTypes/OptionSetPicker'
import styles from './BoardCreateModal.module.css'

interface BoardCreateModalProps {
  open: boolean
  onClose: () => void
  folderId: string | null
}

const TITLE_ID = 'board-create-modal-title'

export function BoardCreateModal({ open, onClose, folderId }: BoardCreateModalProps) {
  const navigate = useNavigate()
  const customTypes = useLiveQuery(() => listCustomDataTypes(), [], [])
  const [title, setTitle] = useState('')
  const [statusTypeId, setStatusTypeId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const reset = () => {
    setTitle('')
    setStatusTypeId(null)
    setError(null)
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  const handleSubmit = async () => {
    const trimmed = title.trim()
    if (!trimmed) return
    if (!statusTypeId) {
      setError('Choose or create a column set first.')
      return
    }

    const board = await createBoard({ title: trimmed, folderId, statusTypeId })
    reset()
    onClose()
    navigate(`/boards/${board.id}`)
  }

  return (
    <Modal open={open} onClose={handleClose} labelledBy={TITLE_ID}>
      {/* Not a <form> — OptionSetPicker below can render its own inline <form> (via
          OptionSetForm) when creating/editing an option set, and HTML forms can't nest;
          submitting a nested one would trigger a real native form submission / page reload. */}
      <div className={styles.form}>
        <h2 id={TITLE_ID} className={styles.heading}>
          New Board
        </h2>
        <input
          type="text"
          className={styles.titleInput}
          placeholder="Board title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              void handleSubmit()
            }
          }}
          aria-label="New board title"
        />
        <span className={styles.fieldLabel}>Columns</span>
        <OptionSetPicker
          availableCustomTypes={customTypes ?? []}
          value={statusTypeId}
          onChange={(id) => {
            setStatusTypeId(id)
            setError(null)
          }}
        />
        {error && <p className={styles.error}>{error}</p>}
        <div className={styles.actions}>
          <button type="button" className={styles.submit} onClick={() => void handleSubmit()}>
            Create board
          </button>
          <button type="button" className={styles.cancel} onClick={handleClose}>
            Cancel
          </button>
        </div>
      </div>
    </Modal>
  )
}
