import type { CustomDataType, DictionaryField, PropertyValueData } from '../../domain/entities.types'
import { PropertyValueEditor } from './PropertyValueEditor'
import styles from './compositeEditors.module.css'

interface DictionaryValueEditorProps {
  fields: DictionaryField[]
  value: Record<string, PropertyValueData>
  onChange: (value: Record<string, PropertyValueData>) => void
  disabled?: boolean
  resolveCustomType: (id: string) => CustomDataType | undefined
}

export function DictionaryValueEditor({
  fields,
  value,
  onChange,
  disabled,
  resolveCustomType,
}: DictionaryValueEditorProps) {
  const updateField = (key: string, next: PropertyValueData) => {
    onChange({ ...value, [key]: next })
  }

  return (
    <div className={styles.dictionary}>
      {fields.map((field) => (
        <div key={field.key} className={styles.dictionaryRow}>
          <span className={styles.dictionaryLabel}>{field.key}</span>
          <PropertyValueEditor
            typeRef={field.typeRef}
            value={value[field.key] ?? null}
            onChange={(next) => updateField(field.key, next)}
            disabled={disabled}
            resolveCustomType={resolveCustomType}
          />
        </div>
      ))}
    </div>
  )
}
