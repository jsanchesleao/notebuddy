import { useState } from 'react'
import { deleteTags } from '../../domain/tags/tagRepository'
import { getReadableTextColor } from '../../lib/color/contrastColor'
import { Icon } from '../../components/Icon/Icon'
import type { TagUsage } from '../../domain/tags/tagUsage'
import styles from './TagUsageList.module.css'

interface TagUsageListProps {
  tags: TagUsage[]
  onMutated: () => void
}

export function TagUsageList({ tags, onMutated }: TagUsageListProps) {
  const [confirmingName, setConfirmingName] = useState<string | null>(null)
  const [errorByName, setErrorByName] = useState<Record<string, string>>({})

  const handleDelete = async (name: string) => {
    try {
      await deleteTags([name])
      setConfirmingName(null)
      setErrorByName((prev) => {
        const next = { ...prev }
        delete next[name]
        return next
      })
      onMutated()
    } catch (err) {
      setErrorByName((prev) => ({
        ...prev,
        [name]: err instanceof Error ? err.message : 'Failed to delete',
      }))
    }
  }

  if (tags.length === 0) {
    return <p className={styles.empty}>No tags match your search.</p>
  }

  return (
    <ul className={styles.list}>
      {tags.map((tag) => (
        <li key={tag.name} className={styles.item}>
          <div className={styles.row}>
            <span
              className={styles.pill}
              style={{ background: tag.color, color: getReadableTextColor(tag.color) }}
            >
              {tag.name}
            </span>
            <span className={styles.count}>
              {tag.count} note{tag.count === 1 ? '' : 's'}
            </span>
            {confirmingName === tag.name ? (
              <>
                <button
                  type="button"
                  className={styles.confirmDelete}
                  onClick={() => handleDelete(tag.name)}
                >
                  {tag.count > 0
                    ? `Confirm delete (used by ${tag.count} note${tag.count === 1 ? '' : 's'})`
                    : 'Confirm delete'}
                </button>
                <button
                  type="button"
                  className={styles.iconButton}
                  aria-label="Cancel delete"
                  onClick={() => setConfirmingName(null)}
                >
                  <Icon name="close" size={14} />
                </button>
              </>
            ) : (
              <button
                type="button"
                className={styles.iconButton}
                aria-label={`Delete tag ${tag.name}`}
                onClick={() => setConfirmingName(tag.name)}
              >
                <Icon name="delete" size={14} />
              </button>
            )}
          </div>
          {errorByName[tag.name] && <p className={styles.error}>{errorByName[tag.name]}</p>}
        </li>
      ))}
    </ul>
  )
}
