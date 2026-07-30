import { useState } from 'react'
import { deleteCustomDataType } from '../../domain/dataTypes/dataTypeRepository'
import { Icon } from '../../components/Icon/Icon'
import type { CustomDataType } from '../../domain/entities.types'
import styles from './OptionSetList.module.css'

interface OptionSetListProps {
  types: CustomDataType[]
  onEdit: (type: CustomDataType) => void
}

function optionCount(type: CustomDataType): number {
  return type.schema.kind === 'primitive' && type.schema.primitive === 'select'
    ? (type.schema.options?.length ?? 0)
    : 0
}

export function OptionSetList({ types, onEdit }: OptionSetListProps) {
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
    return <p className={styles.empty}>No option sets yet.</p>
  }

  return (
    <ul className={styles.list}>
      {types.map((type) => {
        const count = optionCount(type)
        return (
          <li key={type.id} className={styles.item}>
            <div className={styles.row}>
              <span className={styles.name}>{type.name}</span>
              <span className={styles.count}>
                {count} option{count === 1 ? '' : 's'}
              </span>
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
        )
      })}
    </ul>
  )
}
