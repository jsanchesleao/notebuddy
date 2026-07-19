import { useEffect, useState } from 'react'
import { Icon } from '../../../../components/Icon/Icon'
import { filterSlashCommands, type SlashCommandEntry } from './slashCommand'
import styles from './SlashCommandMenu.module.css'

interface SlashCommandMenuProps {
  query: string
  onSelect: (entry: SlashCommandEntry) => void
  onClose: () => void
}

export function SlashCommandMenu({ query, onSelect, onClose }: SlashCommandMenuProps) {
  const matches = filterSlashCommands(query)
  const [highlightedIndex, setHighlightedIndex] = useState(0)
  const [queryForHighlight, setQueryForHighlight] = useState(query)

  if (query !== queryForHighlight) {
    setQueryForHighlight(query)
    setHighlightedIndex(0)
  }

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (matches.length === 0) return

      if (event.key === 'ArrowDown') {
        event.preventDefault()
        setHighlightedIndex((index) => (index + 1) % matches.length)
      } else if (event.key === 'ArrowUp') {
        event.preventDefault()
        setHighlightedIndex((index) => (index - 1 + matches.length) % matches.length)
      } else if (event.key === 'Enter') {
        event.preventDefault()
        onSelect(matches[highlightedIndex])
      } else if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown, true)
    return () => document.removeEventListener('keydown', handleKeyDown, true)
  }, [matches, highlightedIndex, onSelect, onClose])

  if (matches.length === 0) return null

  return (
    <div role="menu" className={styles.menu}>
      {matches.map((entry, index) => (
        <button
          key={entry.kind === 'blockType' ? entry.type : entry.label}
          type="button"
          role="menuitem"
          className={
            index === highlightedIndex
              ? `${styles.menuItem} ${styles.highlighted}`
              : styles.menuItem
          }
          onMouseEnter={() => setHighlightedIndex(index)}
          onClick={() => onSelect(entry)}
        >
          <Icon name={entry.icon} size={14} /> {entry.label}
        </button>
      ))}
    </div>
  )
}
