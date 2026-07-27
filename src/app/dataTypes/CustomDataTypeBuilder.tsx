import { useState, type FormEvent } from 'react'
import { createCustomDataType, updateCustomDataType } from '../../domain/dataTypes/dataTypeRepository'
import { SchemaNodeEditor } from './SchemaNodeEditor'
import { SamplePreview } from './SamplePreview'
import type { CustomDataType, DataTypeRef } from '../../domain/entities.types'
import styles from './CustomDataTypeBuilder.module.css'

const DEFAULT_ROOT_SCHEMA: DataTypeRef = { kind: 'dictionary', fields: [] }

interface CustomDataTypeBuilderProps {
  editing: CustomDataType | null
  availableCustomTypes: CustomDataType[]
  resolveCustomType: (id: string) => CustomDataType | undefined
  onDone: () => void
}

export function CustomDataTypeBuilder({
  editing,
  availableCustomTypes,
  resolveCustomType,
  onDone,
}: CustomDataTypeBuilderProps) {
  const [name, setName] = useState(editing?.name ?? '')
  const [schema, setSchema] = useState<DataTypeRef>(editing?.schema ?? DEFAULT_ROOT_SCHEMA)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return

    setError(null)
    try {
      if (editing) {
        await updateCustomDataType(editing.id, { name: trimmed, schema })
      } else {
        await createCustomDataType({ name: trimmed, schema })
      }
      onDone()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    }
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <input
        type="text"
        className={styles.nameInput}
        placeholder="Type name"
        value={name}
        onChange={(event) => setName(event.target.value)}
        aria-label="Custom data type name"
      />
      <SchemaNodeEditor
        value={schema}
        onChange={setSchema}
        availableCustomTypes={availableCustomTypes}
        ownerId={editing?.id ?? null}
        resolveCustomType={resolveCustomType}
        restrictToComposites
      />
      <div className={styles.previewSection}>
        <span className={styles.previewLabel}>Preview</span>
        <SamplePreview schema={schema} resolveCustomType={resolveCustomType} />
      </div>
      {error && <p className={styles.error}>{error}</p>}
      <div className={styles.actions}>
        <button type="submit" className={styles.submit}>
          {editing ? 'Save changes' : 'Create type'}
        </button>
        <button type="button" className={styles.cancel} onClick={onDone}>
          Cancel
        </button>
      </div>
    </form>
  )
}
