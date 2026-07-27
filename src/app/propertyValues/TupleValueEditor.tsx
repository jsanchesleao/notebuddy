import type { CustomDataType, DataTypeRef, PropertyValueData } from '../../domain/entities.types'
import { PropertyValueEditor } from './PropertyValueEditor'
import styles from './compositeEditors.module.css'

interface TupleValueEditorProps {
  itemTypes: DataTypeRef[]
  value: PropertyValueData[]
  onChange: (value: PropertyValueData[]) => void
  disabled?: boolean
  resolveCustomType: (id: string) => CustomDataType | undefined
}

export function TupleValueEditor({
  itemTypes,
  value,
  onChange,
  disabled,
  resolveCustomType,
}: TupleValueEditorProps) {
  const updateItem = (index: number, next: PropertyValueData) => {
    const nextItems = [...value]
    nextItems[index] = next
    onChange(nextItems)
  }

  return (
    <div className={styles.tuple}>
      {itemTypes.map((itemType, index) => (
        <PropertyValueEditor
          key={index}
          typeRef={itemType}
          value={value[index] ?? null}
          onChange={(next) => updateItem(index, next)}
          disabled={disabled}
          resolveCustomType={resolveCustomType}
        />
      ))}
    </div>
  )
}
