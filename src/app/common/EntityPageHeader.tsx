import { useState, type FormEvent } from 'react'
import { Icon, type IconName } from '../../components/Icon/Icon'
import { useIsDesktop } from '../useIsDesktop'
import styles from './EntityPageHeader.module.css'

interface EntityPageHeaderProps {
  title: string
  icon: IconName
  entityLabel: string
  onRename: (title: string) => void | Promise<void>
  onDelete: () => void | Promise<void>
  wideMode?: { isWide: boolean; onToggle: () => void }
}

export function EntityPageHeader({
  title,
  icon,
  entityLabel,
  onRename,
  onDelete,
  wideMode,
}: EntityPageHeaderProps) {
  const [isRenaming, setIsRenaming] = useState(false)
  const isDesktop = useIsDesktop()
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
          <Icon name={icon} />
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
    )
  }

  return (
    <div className={styles.header}>
      <span className={styles.icon}>
        <Icon name={icon} />
      </span>
      <h1 className={styles.title}>{title}</h1>
      {wideMode && isDesktop && (
        <button
          type="button"
          className={styles.iconButton}
          aria-label={wideMode.isWide ? 'Use normal width' : 'Use wide width'}
          onClick={wideMode.onToggle}
        >
          <Icon name={wideMode.isWide ? 'collapse' : 'expand'} />
        </button>
      )}
      <button
        type="button"
        className={styles.iconButton}
        aria-label={`Rename ${entityLabel}`}
        onClick={startRename}
      >
        <Icon name="edit" />
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
            <Icon name="close" />
          </button>
        </>
      ) : (
        <button
          type="button"
          className={styles.iconButton}
          aria-label={`Delete ${entityLabel}`}
          onClick={() => setConfirmingDelete(true)}
        >
          <Icon name="delete" />
        </button>
      )}
    </div>
  )
}
