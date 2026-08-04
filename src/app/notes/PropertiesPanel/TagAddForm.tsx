import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
  type RefObject,
} from 'react'
import { setNoteTags } from '../../../domain/notes/noteRepository'
import { queryTagSuggestions } from '../../../domain/tags/tagSearchIndexClient'
import { useDismissOnOutsideOrEscape } from '../../../components/Menu/useDismissOnOutsideOrEscape'
import { Icon } from '../../../components/Icon/Icon'
import styles from './TagsEditor.module.css'

const TAG_SEARCH_DEBOUNCE_MS = 150

interface TagAddFormProps {
  noteId: string
  existingTags: string[]
  onCancel: () => void
  ignoreRef: RefObject<HTMLElement | null>
}

export function TagAddForm({ noteId, existingTags, onCancel, ignoreRef }: TagAddFormProps) {
  const [draft, setDraft] = useState('')
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [highlightedIndex, setHighlightedIndex] = useState(0)
  const [draftForHighlight, setDraftForHighlight] = useState(draft)
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const formRef = useDismissOnOutsideOrEscape<HTMLFormElement>(onCancel, ignoreRef)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // Debounced, worker-backed suggestion query — see tagSearchIndexClient.ts. Only one query
  // is ever in flight per keystroke burst since the pending timeout is cleared before a new
  // one is scheduled, so there's no out-of-order-response risk to guard against here.
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)

    const trimmed = draft.trim()
    if (trimmed === '') return

    debounceRef.current = setTimeout(() => {
      queryTagSuggestions(trimmed, existingTags).then(setSuggestions)
    }, TAG_SEARCH_DEBOUNCE_MS)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [draft, existingTags])

  // An empty draft always hides suggestions, regardless of what the last query resolved to
  // (avoids setState in the effect above purely to clear stale results on an empty draft).
  const visibleSuggestions = draft.trim() === '' ? [] : suggestions

  if (draft !== draftForHighlight) {
    setDraftForHighlight(draft)
    setHighlightedIndex(0)
  }

  const commitTag = async (name: string) => {
    const trimmed = name.trim()
    if (!trimmed || existingTags.includes(trimmed)) return
    await setNoteTags(noteId, [...existingTags, trimmed])
    setDraft('')
    setSuggestions([])
  }

  const addTag = async (event: FormEvent) => {
    event.preventDefault()
    await commitTag(draft)
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (visibleSuggestions.length === 0) return

    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setHighlightedIndex((index) => (index + 1) % visibleSuggestions.length)
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setHighlightedIndex(
        (index) => (index - 1 + visibleSuggestions.length) % visibleSuggestions.length,
      )
    } else if (event.key === 'Enter') {
      event.preventDefault()
      void commitTag(visibleSuggestions[highlightedIndex])
    } else if (event.key === 'Escape') {
      // Closes only the suggestion dropdown, keeping the typed draft — the outer
      // useDismissOnOutsideOrEscape listener checks defaultPrevented and skips dismissing
      // the whole form when this fires, so a second Escape is needed to cancel adding a tag.
      event.preventDefault()
      setSuggestions([])
    }
  }

  return (
    <form ref={formRef} className={styles.addForm} onSubmit={addTag}>
      <div className={styles.addInputWrapper}>
        <input
          ref={inputRef}
          type="text"
          className={styles.addInput}
          placeholder="Add tag"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={handleKeyDown}
          aria-label="New tag"
          autoComplete="off"
        />
        {visibleSuggestions.length > 0 && (
          <div role="menu" className={styles.suggestions}>
            {visibleSuggestions.map((name, index) => (
              <button
                key={name}
                type="button"
                role="menuitem"
                className={
                  index === highlightedIndex
                    ? `${styles.suggestionItem} ${styles.highlighted}`
                    : styles.suggestionItem
                }
                onMouseEnter={() => setHighlightedIndex(index)}
                onClick={() => commitTag(name)}
              >
                {name}
              </button>
            ))}
          </div>
        )}
      </div>
      <button type="submit" className={styles.addButton} aria-label="Add tag">
        <Icon name="add" size={14} />
      </button>
      <button
        type="button"
        className={styles.cancelButton}
        aria-label="Cancel adding tag"
        onClick={onCancel}
      >
        <Icon name="close" size={12} />
      </button>
    </form>
  )
}
