import { useState } from 'react'
import { deleteCustomDataType } from '../../domain/dataTypes/dataTypeRepository'
import { Icon } from '../../components/Icon/Icon'
import type { CustomDataType } from '../../domain/entities.types'
import styles from './CustomDataTypeList.module.css'

interface CustomDataTypeListProps {
  types: CustomDataType[]
  onEdit: (type: CustomDataType) => void
}

export function CustomDataTypeList({ types, onEdit }: CustomDataTypeListProps) {
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null)
  const [errorById, setErrorById] = useState<Record<string, string>>({})

  const handleDelete = async (id: string) => {
    try {
      await deleteCustomDataType(id)
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

  if (types.length === 0) {
    return <p className={styles.empty}>No custom data types yet.</p>
  }

  return (
    <ul className={styles.list}>
      {types.map((type) => (
        <li key={type.id} className={styles.item}>
          <div className={styles.row}>
            <span className={styles.name}>{type.name}</span>
            <button
              type="button"
              className={styles.iconButton}
              aria-label={`Edit ${type.name}`}
              onClick={() => onEdit(type)}
            >
              <Icon name="edit" size={14} />
            </button>
            {confirmingDeleteId === type.id ? (
              <>
                <button
                  type="button"
                  className={styles.confirmDelete}
                  onClick={() => handleDelete(type.id)}
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
                aria-label={`Delete ${type.name}`}
                onClick={() => setConfirmingDeleteId(type.id)}
              >
                <Icon name="delete" size={14} />
              </button>
            )}
          </div>
          {errorById[type.id] && <p className={styles.error}>{errorById[type.id]}</p>}
        </li>
      ))}
    </ul>
  )
}
