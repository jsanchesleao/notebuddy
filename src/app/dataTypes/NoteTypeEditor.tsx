import { useState, type FormEvent } from 'react'
import { createNoteType, updateNoteType } from '../../domain/noteTypes/noteTypeRepository'
import { DismissableDropdown } from '../../components/Menu/DismissableDropdown'
import dropdownStyles from '../../components/Menu/DismissableDropdown.module.css'
import { Icon } from '../../components/Icon/Icon'
import type { CustomDataType, NoteType } from '../../domain/entities.types'
import styles from './NoteTypeEditor.module.css'

interface NoteTypeEditorProps {
  editing: NoteType | null
  dictionaryCustomTypes: CustomDataType[]
  onDone: () => void
}

export function NoteTypeEditor({ editing, dictionaryCustomTypes, onDone }: NoteTypeEditorProps) {
  const [name, setName] = useState(editing?.name ?? '')
  const [customTypeId, setCustomTypeId] = useState<string | null>(
    editing?.customTypeId ?? dictionaryCustomTypes[0]?.id ?? null,
  )
  const [error, setError] = useState<string | null>(null)

  const selected = dictionaryCustomTypes.find((type) => type.id === customTypeId)

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    const trimmed = name.trim()
    if (!trimmed || !customTypeId) return

    setError(null)
    try {
      if (editing) {
        await updateNoteType(editing.id, { name: trimmed, customTypeId })
      } else {
        await createNoteType({ name: trimmed, customTypeId })
      }
      onDone()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    }
  }

  if (dictionaryCustomTypes.length === 0) {
    return (
      <div className={styles.form}>
        <p className={styles.empty}>
          Create a Dictionary-shaped Custom Data Type first to use as a Note Type blueprint.
        </p>
        <button type="button" className={styles.cancel} onClick={onDone}>
          Close
        </button>
      </div>
    )
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <input
        type="text"
        className={styles.nameInput}
        placeholder="Note type name"
        value={name}
        onChange={(event) => setName(event.target.value)}
        aria-label="Note type name"
      />
      <DismissableDropdown
        trigger={({ toggle, open }) => (
          <button
            type="button"
            className={dropdownStyles.trigger}
            aria-expanded={open}
            onClick={toggle}
          >
            {selected?.name ?? 'Choose a Dictionary type'} <Icon name="chevronDown" size={12} />
          </button>
        )}
      >
        {({ close }) => (
          <>
            {dictionaryCustomTypes.map((type) => (
              <button
                key={type.id}
                type="button"
                role="menuitemradio"
                aria-checked={type.id === customTypeId}
                className={dropdownStyles.menuItem}
                onClick={() => {
                  setCustomTypeId(type.id)
                  close()
                }}
              >
                {type.name}
              </button>
            ))}
          </>
        )}
      </DismissableDropdown>
      {error && <p className={styles.error}>{error}</p>}
      <div className={styles.actions}>
        <button type="submit" className={styles.submit}>
          {editing ? 'Save changes' : 'Create note type'}
        </button>
        <button type="button" className={styles.cancel} onClick={onDone}>
          Cancel
        </button>
      </div>
    </form>
  )
}
