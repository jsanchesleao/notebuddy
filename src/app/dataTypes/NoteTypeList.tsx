import { useState } from 'react'
import { deleteNoteType } from '../../domain/noteTypes/noteTypeRepository'
import { Icon } from '../../components/Icon/Icon'
import type { CustomDataType, NoteType } from '../../domain/entities.types'
import styles from './NoteTypeList.module.css'

interface NoteTypeListProps {
  noteTypes: NoteType[]
  resolveCustomType: (id: string) => CustomDataType | undefined
  onEdit: (noteType: NoteType) => void
}

export function NoteTypeList({ noteTypes, resolveCustomType, onEdit }: NoteTypeListProps) {
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null)
  const [errorById, setErrorById] = useState<Record<string, string>>({})

  const handleDelete = async (id: string) => {
    try {
      await deleteNoteType(id)
      setConfirmingDeleteId(null)
      setErrorById((prev) => {
        const next = { ...prev }
        delete next[id]
        return next
      })
    } catch (err) {
      setErrorById((prev) => ({
        ...prev,
        [id]: err instanceof Error ? err.message : 'Failed to delete',
      }))
    }
  }

  if (noteTypes.length === 0) {
    return <p className={styles.empty}>No note types yet.</p>
  }

  return (
    <ul className={styles.list}>
      {noteTypes.map((noteType) => (
        <li key={noteType.id} className={styles.item}>
          <div className={styles.row}>
            <span className={styles.name}>{noteType.name}</span>
            <span className={styles.customTypeName}>
              {resolveCustomType(noteType.customTypeId)?.name ?? 'Unknown type'}
            </span>
            <button
              type="button"
              className={styles.iconButton}
              aria-label={`Edit ${noteType.name}`}
              onClick={() => onEdit(noteType)}
            >
              <Icon name="edit" size={14} />
            </button>
            {confirmingDeleteId === noteType.id ? (
              <>
                <button
                  type="button"
                  className={styles.confirmDelete}
                  onClick={() => handleDelete(noteType.id)}
                >
                  Confirm delete
                </button>
                <button
                  type="button"
                  className={styles.iconButton}
                  aria-label="Cancel delete"
                  onClick={() => setConfirmingDeleteId(null)}
                >
                  <Icon name="close" size={14} />
                </button>
              </>
            ) : (
              <button
                type="button"
                className={styles.iconButton}
                aria-label={`Delete ${noteType.name}`}
                onClick={() => setConfirmingDeleteId(noteType.id)}
              >
                <Icon name="delete" size={14} />
              </button>
            )}
          </div>
          {errorById[noteType.id] && <p className={styles.error}>{errorById[noteType.id]}</p>}
        </li>
      ))}
    </ul>
  )
}
