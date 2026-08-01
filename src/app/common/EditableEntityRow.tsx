import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Icon, type IconName } from '../../components/Icon/Icon'
import { getReadableTextColor } from '../../lib/color/contrastColor'
import styles from './EditableEntityRow.module.css'

interface EditableEntityRowProps {
  title: string
  icon: IconName
  to?: string
  tags?: string[]
  tagColors?: Map<string, string>
  onRename?: (title: string) => void | Promise<void>
  onMove?: () => void
  onDelete?: () => void | Promise<void>
}

export function EditableEntityRow({
  title,
  icon,
  to,
  tags,
  tagColors,
  onRename,
  onMove,
  onDelete,
}: EditableEntityRowProps) {
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
      <div className={styles.container}>
        <form className={styles.row} onSubmit={submitRename}>
          <span className={styles.icon}>
            <Icon name={icon} />
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
            <Icon name="check" />
          </button>
          <button
            type="button"
            className={styles.iconButton}
            aria-label="Cancel rename"
            onClick={() => setIsRenaming(false)}
          >
            <Icon name="close" />
          </button>
        </form>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <div className={styles.row}>
        <span className={styles.icon}>
          <Icon name={icon} />
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
            <Icon name="edit" />
          </button>
        )}
        {onMove && (
          <button
            type="button"
            className={styles.iconButton}
            aria-label={`Move ${title}`}
            onClick={onMove}
          >
            <Icon name="move" />
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
                <Icon name="close" />
              </button>
            </>
          ) : (
            <button
              type="button"
              className={styles.iconButton}
              aria-label={`Delete ${title}`}
              onClick={() => setConfirmingDelete(true)}
            >
              <Icon name="delete" />
            </button>
          ))}
      </div>
      {tags && tags.length > 0 && (
        <ul className={styles.tags}>
          {tags.map((tag) => {
            const color = tagColors?.get(tag)
            const pillStyle = color
              ? { background: color, color: getReadableTextColor(color) }
              : undefined
            return (
              <li key={tag} className={styles.tagPill} style={pillStyle}>
                {tag}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
