import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core'
import styles from './EditableEntityRow.module.css'

interface EditableEntityRowProps {
  title: string
  icon: IconDefinition
  to?: string
  onRename?: (title: string) => void | Promise<void>
  onDelete?: () => void | Promise<void>
}

export function EditableEntityRow({ title, icon, to, onRename, onDelete }: EditableEntityRowProps) {
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
    if (trimmed && trimmed !== title && onRename) {
      await onRename(trimmed)
    }
    setIsRenaming(false)
  }

  if (isRenaming) {
    return (
      <form className={styles.row} onSubmit={submitRename}>
        <span className={styles.icon}>
          <FontAwesomeIcon icon={icon} fixedWidth />
        </span>
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
      <span className={styles.icon}>
        <FontAwesomeIcon icon={icon} fixedWidth />
      </span>
      {to ? (
        <Link to={to} className={styles.link}>
          {title}
        </Link>
      ) : (
        <span className={styles.link}>{title}</span>
      )}
      {onRename && (
        <button
          type="button"
          className={styles.iconButton}
          aria-label={`Rename ${title}`}
          onClick={startRename}
        >
          ✎
        </button>
      )}
      {onDelete &&
        (confirmingDelete ? (
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
        ))}
    </div>
  )
}
