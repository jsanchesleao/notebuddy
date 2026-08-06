import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { NoteQuickSearch } from '../notes/filters/NoteQuickSearch'
import styles from './HeaderSearchInput.module.css'

// A persistent entry point into global search, independent of SearchPage's own query box —
// submitting here always navigates to /search?q=..., it doesn't stay in sync with whatever
// query is currently showing there.
export function HeaderSearchInput() {
  const [value, setValue] = useState('')
  const navigate = useNavigate()

  return (
    <form
      className={styles.form}
      onSubmit={(event) => {
        event.preventDefault()
        navigate(`/search?q=${encodeURIComponent(value.trim())}`)
      }}
    >
      <NoteQuickSearch
        value={value}
        onChange={setValue}
        placeholder="Search everything..."
        ariaLabel="Search all notes"
      />
    </form>
  )
}
