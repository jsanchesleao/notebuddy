import { useEffect, useRef, useState } from 'react'
import { filterSchemaKindOptions, type SchemaKindOption } from './schemaKinds'
import styles from './SchemaKindMenu.module.css'

interface SchemaKindMenuProps {
  options: SchemaKindOption[]
  activeKey: string
  onSelect: (option: SchemaKindOption) => void
  onClose: () => void
}

export function SchemaKindMenu({ options, activeKey, onSelect, onClose }: SchemaKindMenuProps) {
  const [query, setQuery] = useState('')
  const [highlightedIndex, setHighlightedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const matches = filterSchemaKindOptions(options, query)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const handleQueryChange = (value: string) => {
    setQuery(value)
    setHighlightedIndex(0)
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      if (matches.length === 0) return
      setHighlightedIndex((index) => (index + 1) % matches.length)
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      if (matches.length === 0) return
      setHighlightedIndex((index) => (index - 1 + matches.length) % matches.length)
    } else if (event.key === 'Enter') {
      event.preventDefault()
      if (matches.length === 0) return
      onSelect(matches[highlightedIndex])
    } else if (event.key === 'Escape') {
      event.preventDefault()
      onClose()
    }
  }

  return (
    <>
      <input
        ref={inputRef}
        type="text"
        className={styles.searchInput}
        placeholder="Search types…"
        value={query}
        onChange={(event) => handleQueryChange(event.target.value)}
        onKeyDown={handleKeyDown}
        aria-label="Search property types"
      />
      {matches.length === 0 ? (
        <p className={styles.empty}>No matching types</p>
      ) : (
        <div className={styles.list}>
          {matches.map((option, index) => (
            <button
              key={option.key}
              type="button"
              role="menuitemradio"
              aria-checked={option.key === activeKey}
              className={
                index === highlightedIndex
                  ? `${styles.menuItem} ${styles.highlighted}`
                  : styles.menuItem
              }
              onMouseEnter={() => setHighlightedIndex(index)}
              onClick={() => onSelect(option)}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </>
  )
}
