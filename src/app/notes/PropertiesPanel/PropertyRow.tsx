import { useState } from 'react'
import { removeNoteProperty, setNoteProperty } from '../../../domain/notes/noteRepository'
import { PropertyValueEditor } from '../../propertyValues/PropertyValueEditor'
import { Icon } from '../../../components/Icon/Icon'
import type {
  CustomDataType,
  DataTypeRef,
  PropertyValue,
  PropertyValueData,
} from '../../../domain/entities.types'
import styles from './PropertyRow.module.css'

interface PropertyRowProps {
  noteId: string
  propertyKey: string
  property: PropertyValue
  resolveCustomType: (id: string) => CustomDataType | undefined
}

// `localValue`/`localTypeRef` are intentionally initialized once and never resynced from the
// `property` prop while mounted (React keeps this component instance alive across re-renders
// as long as `propertyKey` — its list `key` — doesn't change, per PropertiesPanelContent).
// Resyncing on every prop change would race the async round-trip through
// setNoteProperty/useLiveQuery: a stale echo of an earlier keystroke could land after a later
// one and clobber it, dropping characters while typing quickly into an auto-saving field.
export function PropertyRow({
  noteId,
  propertyKey,
  property,
  resolveCustomType,
}: PropertyRowProps) {
  const [localValue, setLocalValue] = useState(property.value)
  const [localTypeRef, setLocalTypeRef] = useState(property.typeRef)
  const [error, setError] = useState<string | null>(null)

  const handleChange = async (nextValue: PropertyValueData) => {
    setLocalValue(nextValue)
    try {
      await setNoteProperty(noteId, propertyKey, { typeRef: localTypeRef, value: nextValue })
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid value')
    }
  }

  // Used by a dictionary property to add/rename/retype/remove/reorder its own fields —
  // typeRef and value must persist together in one call, since the schema validator
  // rejects a value whose keys don't exactly match the declared fields.
  const handleSchemaChange = async (nextTypeRef: DataTypeRef, nextValue: PropertyValueData) => {
    setLocalTypeRef(nextTypeRef)
    setLocalValue(nextValue)
    try {
      await setNoteProperty(noteId, propertyKey, { typeRef: nextTypeRef, value: nextValue })
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid value')
    }
  }

  return (
    <div className={styles.row}>
      <div className={styles.rowHeader}>
        <span className={styles.key}>{propertyKey}</span>
        <button
          type="button"
          className={styles.removeButton}
          aria-label={`Remove property ${propertyKey}`}
          onClick={() => removeNoteProperty(noteId, propertyKey)}
        >
          <Icon name="close" size={12} />
        </button>
      </div>
      <PropertyValueEditor
        typeRef={localTypeRef}
        value={localValue}
        onChange={handleChange}
        onSchemaChange={handleSchemaChange}
        resolveCustomType={resolveCustomType}
      />
      {error && <p className={styles.error}>{error}</p>}
    </div>
  )
}
