import { useState, type FormEvent } from 'react'
import { setNoteProperty } from '../../../domain/notes/noteRepository'
import { createDefaultValue } from '../../../domain/dataTypes/defaultValueGenerator'
import { SchemaKindSelect } from '../../dataTypes/SchemaKindSelect'
import { buildSchemaKindOptions } from '../../dataTypes/schemaKinds'
import { Icon } from '../../../components/Icon/Icon'
import type { CustomDataType, DataTypeRef } from '../../../domain/entities.types'
import styles from './AddPropertyControl.module.css'

interface AddPropertyControlProps {
  noteId: string
  existingKeys: string[]
  availableCustomTypes: CustomDataType[]
}

const DEFAULT_TYPE: DataTypeRef = { kind: 'primitive', primitive: 'text' }

export function AddPropertyControl({
  noteId,
  existingKeys,
  availableCustomTypes,
}: AddPropertyControlProps) {
  const [key, setKey] = useState('')
  const [typeRef, setTypeRef] = useState<DataTypeRef>(DEFAULT_TYPE)
  const [error, setError] = useState<string | null>(null)

  const resolveCustomType = (id: string) => availableCustomTypes.find((type) => type.id === id)
  const options = buildSchemaKindOptions({
    availableCustomTypes,
    includePrimitives: true,
    isCustomTypeSelectable: () => true,
  })

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    const trimmed = key.trim()
    if (!trimmed) return
    if (existingKeys.includes(trimmed)) {
      setError('A property with this name already exists.')
      return
    }

    setError(null)
    const value = createDefaultValue(typeRef, { resolveCustomType })
    await setNoteProperty(noteId, trimmed, { typeRef, value })
    setKey('')
    setTypeRef(DEFAULT_TYPE)
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <div className={styles.row}>
        <input
          type="text"
          className={styles.keyInput}
          placeholder="Property name"
          value={key}
          onChange={(event) => setKey(event.target.value)}
          aria-label="New property name"
        />
        <SchemaKindSelect value={typeRef} options={options} onChange={setTypeRef} />
      </div>
      <button type="submit" className={styles.addButton}>
        <Icon name="add" size={14} /> Add property
      </button>
      {error && <p className={styles.error}>{error}</p>}
    </form>
  )
}
