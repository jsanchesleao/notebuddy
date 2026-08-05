import { useEffect, useRef, useState } from 'react'
import { SAVE_DEBOUNCE_MS } from '../notes/blocks/blockEditing.constants'
import styles from './StickyNoteItem.module.css'

interface StickyNoteTextEditorProps {
  text: string
  textColor: string
  onChange: (text: string) => void
}

export function StickyNoteTextEditor({ text, textColor, onChange }: StickyNoteTextEditorProps) {
  const [value, setValue] = useState(text)
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
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
      className={styles.textEditor}
      style={{ color: textColor }}
      value={value}
      onChange={(event) => handleChange(event.target.value)}
      placeholder="Type a note…"
      aria-label="Sticky note text"
    />
  )
}
