import { useEffect, useRef, useState } from 'react'
import { SAVE_DEBOUNCE_MS } from '../notes/blocks/blockEditing.constants'
import styles from './StickyNoteItem.module.css'

interface StickyNoteTextEditorProps {
  text: string
  textColor: string
  onChange: (text: string) => void
  onBlur?: () => void
}

// Autofocused on mount since it's only ever mounted while the note is in edit mode
// (StickyNoteItem swaps this in for a read-only preview on click) — losing focus is what
// tells the parent to swap back to the preview and re-enable dragging.
export function StickyNoteTextEditor({
  text,
  textColor,
  onChange,
  onBlur,
}: StickyNoteTextEditorProps) {
  const [value, setValue] = useState(text)
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    textareaRef.current?.focus()
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    }
  }, [])

  const handleChange = (next: string) => {
    setValue(next)
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    saveTimeoutRef.current = setTimeout(() => onChange(next), SAVE_DEBOUNCE_MS)
  }

  return (
    <textarea
      ref={textareaRef}
      className={styles.textEditor}
      style={{ color: textColor }}
      value={value}
      onChange={(event) => handleChange(event.target.value)}
      onBlur={onBlur}
      placeholder="Type a note…"
      aria-label="Sticky note text"
    />
  )
}
