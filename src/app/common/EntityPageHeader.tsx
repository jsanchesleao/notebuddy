import { useState, type FormEvent } from 'react'
import { Icon, type IconName } from '../../components/Icon/Icon'
import { useIsDesktop } from '../useIsDesktop'
import { NoteTypeSelect } from '../dataTypes/NoteTypeSelect'
import { DismissableDropdown } from '../../components/Menu/DismissableDropdown'
import dropdownStyles from '../../components/Menu/DismissableDropdown.module.css'
import type { NoteType } from '../../domain/entities.types'
import styles from './EntityPageHeader.module.css'

export interface EntityPageHeaderMenuAction {
  label: string
  icon: IconName
  onClick: () => void | Promise<void>
}

interface EntityPageHeaderProps {
  title: string
  icon: IconName
  entityLabel: string
  onRename: (title: string) => void | Promise<void>
  onDelete: () => void | Promise<void>
  wideMode?: { isWide: boolean; onToggle: () => void }
  onToggleProperties?: () => void
  defaultNoteType?: {
    value: string | null
    noteTypes: NoteType[]
    onChange: (id: string | null) => void
  }
  stickyNotes?: {
    visible: boolean
    onToggleVisibility: () => void
    onAdd: (kind: 'text' | 'sketch') => void
  }
  // When provided, the edit icon opens a menu with "Rename" plus these actions instead of
  // jumping straight into inline rename — used by board notes to fold "Add image" etc. into
  // the same trigger rather than adding more standalone header buttons.
  menuActions?: EntityPageHeaderMenuAction[]
}

export function EntityPageHeader({
  title,
  icon,
  entityLabel,
  onRename,
  onDelete,
  wideMode,
  onToggleProperties,
  defaultNoteType,
  stickyNotes,
  menuActions,
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
      {defaultNoteType && (
        <NoteTypeSelect
          value={defaultNoteType.value}
          onChange={defaultNoteType.onChange}
          noteTypes={defaultNoteType.noteTypes}
          triggerPrefix="Default:"
        />
      )}
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
      {onToggleProperties && (
        <button
          type="button"
          className={styles.iconButton}
          aria-label="Toggle properties"
          onClick={onToggleProperties}
        >
          <Icon name="properties" />
        </button>
      )}
      {stickyNotes && (
        <>
          <button
            type="button"
            className={styles.iconButton}
            aria-label={stickyNotes.visible ? 'Hide sticky notes' : 'Show sticky notes'}
            aria-pressed={stickyNotes.visible}
            onClick={stickyNotes.onToggleVisibility}
          >
            <Icon name={stickyNotes.visible ? 'stickyNotesVisible' : 'stickyNotesHidden'} />
          </button>
          <DismissableDropdown
            trigger={({ toggle, open }) => (
              <button
                type="button"
                className={styles.iconButton}
                aria-label="Add sticky note"
                aria-expanded={open}
                onClick={toggle}
              >
                <Icon name="stickyNoteAdd" />
              </button>
            )}
          >
            {({ close }) => (
              <>
                <button
                  type="button"
                  className={dropdownStyles.menuItem}
                  onClick={() => {
                    if (!stickyNotes.visible) stickyNotes.onToggleVisibility()
                    stickyNotes.onAdd('text')
                    close()
                  }}
                >
                  <Icon name="text" size={14} /> Text note
                </button>
                <button
                  type="button"
                  className={dropdownStyles.menuItem}
                  onClick={() => {
                    if (!stickyNotes.visible) stickyNotes.onToggleVisibility()
                    stickyNotes.onAdd('sketch')
                    close()
                  }}
                >
                  <Icon name="sketch" size={14} /> Sketch note
                </button>
              </>
            )}
          </DismissableDropdown>
        </>
      )}
      {menuActions && menuActions.length > 0 ? (
        <DismissableDropdown
          trigger={({ toggle, open }) => (
            <button
              type="button"
              className={styles.iconButton}
              aria-label={`Edit ${entityLabel}`}
              aria-expanded={open}
              onClick={toggle}
            >
              <Icon name="edit" />
            </button>
          )}
        >
          {({ close }) => (
            <>
              <button
                type="button"
                className={dropdownStyles.menuItem}
                onClick={() => {
                  startRename()
                  close()
                }}
              >
                <Icon name="edit" size={14} /> Rename
              </button>
              {menuActions.map((action) => (
                <button
                  key={action.label}
                  type="button"
                  className={dropdownStyles.menuItem}
                  onClick={() => {
                    void action.onClick()
                    close()
                  }}
                >
                  <Icon name={action.icon} size={14} /> {action.label}
                </button>
              ))}
            </>
          )}
        </DismissableDropdown>
      ) : (
        <button
          type="button"
          className={styles.iconButton}
          aria-label={`Rename ${entityLabel}`}
          onClick={startRename}
        >
          <Icon name="edit" />
        </button>
      )}
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
