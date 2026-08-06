import { Icon } from '../../../components/Icon/Icon'
import styles from './NoteQuickSearch.module.css'

export interface NoteQuickSearchProps {
  value: string
  onChange: (next: string) => void
  placeholder?: string
  ariaLabel?: string
}

export function NoteQuickSearch({
  value,
  onChange,
  placeholder = 'Search titles...',
  ariaLabel = 'Search notes by title',
}: NoteQuickSearchProps) {
  return (
    <div className={styles.container}>
      <Icon name="search" size={14} className={styles.icon} />
      <input
        type="text"
        className={styles.input}
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-label={ariaLabel}
      />
      {value !== '' && (
        <button
          type="button"
          className={styles.clearButton}
          aria-label="Clear search"
          onClick={() => onChange('')}
        >
          <Icon name="close" size={12} />
        </button>
      )}
    </div>
  )
}
