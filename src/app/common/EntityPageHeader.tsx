import { useState, type FormEvent } from 'react'
import styles from './EntityPageHeader.module.css'

interface EntityPageHeaderProps {
  title: string
  entityLabel: string
  onRename: (title: string) => void | Promise<void>
  onDelete: () => void | Promise<void>
}

export function EntityPageHeader({
  title,
  entityLabel,
  onRename,
  onDelete,
}: EntityPageHeaderProps) {
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
      <form className={styles.header} onSubmit={submitRename}>
        <input
          type="text"
          className={styles.titleInput}
          value={draftTitle}
          onChange={(event) => setDraftTitle(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Escape') setIsRenaming(false)
          }}
          aria-label={`Rename ${entityLabel}`}
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
    <div className={styles.header}>
      <h1 className={styles.title}>{title}</h1>
      <button
        type="button"
        className={styles.iconButton}
        aria-label={`Rename ${entityLabel}`}
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
          aria-label={`Delete ${entityLabel}`}
          onClick={() => setConfirmingDelete(true)}
        >
          🗑
        </button>
      )}
    </div>
  )
}
