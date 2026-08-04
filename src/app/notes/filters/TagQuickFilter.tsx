import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { Icon } from '../../../components/Icon/Icon'
import { getReadableTextColor } from '../../../lib/color/contrastColor'
import type { TagRecord } from '../../../domain/entities.types'
import styles from './TagQuickFilter.module.css'

export interface TagQuickFilterProps {
  value: string[]
  onChange: (next: string[]) => void
  tags: TagRecord[]
}

// Type-to-search quick filter for tags, alongside NoteQuickSearch's title box — matched tags
// become removable pills. A note must have every selected tag (AND), combined via AND with
// title search and the advanced Filter panel, same combination style as the rest of the toolbar.
export function TagQuickFilter({ value, onChange, tags }: TagQuickFilterProps) {
  const [query, setQuery] = useState('')
  const [highlightedIndex, setHighlightedIndex] = useState(0)
  const [queryForHighlight, setQueryForHighlight] = useState(query)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const colorByName = new Map(tags.map((tag) => [tag.name, tag.color]))

  const trimmed = query.trim().toLowerCase()
  const matches =
    trimmed === ''
      ? []
      : tags
          .filter((tag) => !value.includes(tag.name) && tag.name.toLowerCase().includes(trimmed))
          .slice(0, 8)

  if (query !== queryForHighlight) {
    setQueryForHighlight(query)
    setHighlightedIndex(0)
  }

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setQuery('')
      }
    }
    document.addEventListener('pointerdown', handlePointerDown, true)
    return () => document.removeEventListener('pointerdown', handlePointerDown, true)
  }, [])

  const selectTag = (name: string) => {
    onChange([...value, name])
    setQuery('')
    inputRef.current?.focus()
  }

  const removeTag = (name: string) => {
    onChange(value.filter((tag) => tag !== name))
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Backspace' && query === '' && value.length > 0) {
      removeTag(value[value.length - 1])
      return
    }
    if (matches.length === 0) return

    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setHighlightedIndex((index) => (index + 1) % matches.length)
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setHighlightedIndex((index) => (index - 1 + matches.length) % matches.length)
    } else if (event.key === 'Enter') {
      event.preventDefault()
      selectTag(matches[highlightedIndex].name)
    } else if (event.key === 'Escape') {
      event.preventDefault()
      setQuery('')
    }
  }

  return (
    <div className={styles.container} ref={containerRef}>
      <Icon name="properties" size={14} className={styles.icon} />
      {value.map((name) => {
        const color = colorByName.get(name)
        const pillStyle = color
          ? { background: color, color: getReadableTextColor(color) }
          : undefined
        return (
          <span key={name} className={styles.pill} style={pillStyle}>
            {name}
            <button
              type="button"
              className={styles.pillRemove}
              aria-label={`Remove tag filter ${name}`}
              onClick={() => removeTag(name)}
            >
              <Icon name="close" size={10} />
            </button>
          </span>
        )
      })}
      <input
        ref={inputRef}
        type="text"
        className={styles.input}
        placeholder={value.length === 0 ? 'Filter by tag...' : 'Add tag...'}
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        onKeyDown={handleKeyDown}
        aria-label="Filter notes by tag"
      />
      {matches.length > 0 && (
        <div role="menu" className={styles.menu}>
          {matches.map((tag, index) => (
            <button
              key={tag.name}
              type="button"
              role="menuitem"
              className={
                index === highlightedIndex
                  ? `${styles.menuItem} ${styles.highlighted}`
                  : styles.menuItem
              }
              onMouseEnter={() => setHighlightedIndex(index)}
              onClick={() => selectTag(tag.name)}
            >
              {tag.name}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
