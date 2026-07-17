import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import styles from './EditableEntityRow.module.css'

interface EditableEntityRowProps {
  title: string
  to: string
  onRename: (title: string) => void | Promise<void>
  onDelete: () => void | Promise<void>
}

export function EditableEntityRow({ title, to, onRename, onDelete }: EditableEntityRowProps) {
  const [isRenaming, setIsRenaming] = useState(false)
  const [draftTitle, setDraftTitle] = useState(title)
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  const startRename = () => {
    setDraftTitle(title)
    setIsRenaming(true)
  }

  const submitRename = async (event: FormEvent) => {
    event.preventDefault()
    const trimmed = draftTitle.trim()
    if (trimmed && trimmed !== title) {
      await onRename(trimmed)
    }
    setIsRenaming(false)
  }

  if (isRenaming) {
    return (
      <form className={styles.row} onSubmit={submitRename}>
        <input
          type="text"
          className={styles.input}
          value={draftTitle}
          onChange={(event) => setDraftTitle(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Escape') setIsRenaming(false)
          }}
          aria-label={`Rename ${title}`}
        />
        <button type="submit" className={styles.iconButton} aria-label="Save name">
          ✓
        </button>
        <button
          type="button"
          className={styles.iconButton}
          aria-label="Cancel rename"
          onClick={() => setIsRenaming(false)}
        >
          ✕
        </button>
      </form>
    )
  }

  return (
    <div className={styles.row}>
      <Link to={to} className={styles.link}>
        {title}
      </Link>
      <button
        type="button"
        className={styles.iconButton}
        aria-label={`Rename ${title}`}
        onClick={startRename}
      >
        ✎
      </button>
      {confirmingDelete ? (
        <>
          <button
            type="button"
            className={styles.confirmDelete}
            onClick={() => {
              void onDelete()
            }}
          >
            Confirm delete
          </button>
          <button
            type="button"
            className={styles.iconButton}
            aria-label="Cancel delete"
            onClick={() => setConfirmingDelete(false)}
          >
            ✕
          </button>
        </>
      ) : (
        <button
          type="button"
          className={styles.iconButton}
          aria-label={`Delete ${title}`}
          onClick={() => setConfirmingDelete(true)}
        >
          🗑
        </button>
      )}
    </div>
  )
}
