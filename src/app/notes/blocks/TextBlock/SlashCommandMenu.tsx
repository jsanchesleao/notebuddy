import { useEffect, useState } from 'react'
import { Icon } from '../../../../components/Icon/Icon'
import type { NoteBlockType } from '../../../../domain/blocks/blocks.types'
import { filterBlockTypes } from './slashCommand'
import styles from './SlashCommandMenu.module.css'

interface SlashCommandMenuProps {
  query: string
  onSelect: (type: NoteBlockType) => void
  onClose: () => void
}

export function SlashCommandMenu({ query, onSelect, onClose }: SlashCommandMenuProps) {
  const matches = filterBlockTypes(query)
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
        onSelect(matches[highlightedIndex].type)
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
      {matches.map(({ type, label, icon }, index) => (
        <button
          key={type}
          type="button"
          role="menuitem"
          className={
            index === highlightedIndex
              ? `${styles.menuItem} ${styles.highlighted}`
              : styles.menuItem
          }
          onMouseEnter={() => setHighlightedIndex(index)}
          onClick={() => onSelect(type)}
        >
          <Icon name={icon} size={14} /> {label}
        </button>
      ))}
    </div>
  )
}
