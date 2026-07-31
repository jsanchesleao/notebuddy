import type {
  CustomDataType,
  DictionaryField,
  PropertyValueData,
} from '../../domain/entities.types'
import { PropertyValueDisplay } from './PropertyValueDisplay'
import styles from './compositeDisplay.module.css'

interface DictionaryValueDisplayProps {
  fields: DictionaryField[]
  value: Record<string, PropertyValueData>
  resolveCustomType: (id: string) => CustomDataType | undefined
  availableCustomTypes: CustomDataType[]
}

export function DictionaryValueDisplay({
  fields,
  value,
  resolveCustomType,
  availableCustomTypes,
}: DictionaryValueDisplayProps) {
  if (fields.length === 0) {
    return <span className={styles.notSet}>Not set</span>
  }

  return (
    <div className={styles.dictionary}>
      {fields.map((field) => (
        <div key={field.key} className={styles.dictionaryRow}>
          <span className={styles.dictionaryKey}>{field.key}:</span>
          <PropertyValueDisplay
            typeRef={field.typeRef}
            value={value[field.key] ?? null}
            resolveCustomType={resolveCustomType}
            availableCustomTypes={availableCustomTypes}
          />
        </div>
      ))}
    </div>
  )
}
