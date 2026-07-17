import { useState, type FormEvent } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core'
import styles from './EntityPageHeader.module.css'

interface EntityPageHeaderProps {
  title: string
  icon: IconDefinition
  entityLabel: string
  onRename: (title: string) => void | Promise<void>
  onDelete: () => void | Promise<void>
}

export function EntityPageHeader({
  title,
  icon,
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
        <span className={styles.icon}>
          <FontAwesomeIcon icon={icon} fixedWidth />
        </span>
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
      <span className={styles.icon}>
        <FontAwesomeIcon icon={icon} fixedWidth />
      </span>
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
