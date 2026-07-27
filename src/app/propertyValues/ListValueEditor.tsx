import { Icon } from '../../components/Icon/Icon'
import { createDefaultValue } from '../../domain/dataTypes/defaultValueGenerator'
import type { CustomDataType, DataTypeRef, PropertyValueData } from '../../domain/entities.types'
import { PropertyValueEditor } from './PropertyValueEditor'
import styles from './compositeEditors.module.css'

interface ListValueEditorProps {
  itemType: DataTypeRef
  maxSize?: number
  value: PropertyValueData[]
  onChange: (value: PropertyValueData[]) => void
  disabled?: boolean
  resolveCustomType: (id: string) => CustomDataType | undefined
}

export function ListValueEditor({
  itemType,
  maxSize,
  value,
  onChange,
  disabled,
  resolveCustomType,
}: ListValueEditorProps) {
  const atMax = maxSize !== undefined && value.length >= maxSize

  const addItem = () => {
    onChange([...value, createDefaultValue(itemType, { resolveCustomType })])
  }

  const removeItem = (index: number) => {
    onChange(value.filter((_, itemIndex) => itemIndex !== index))
  }

  const updateItem = (index: number, next: PropertyValueData) => {
    onChange(value.map((item, itemIndex) => (itemIndex === index ? next : item)))
  }

  return (
    <div className={styles.list}>
      {value.map((item, index) => (
        <div key={index} className={styles.listRow}>
          <PropertyValueEditor
            typeRef={itemType}
            value={item}
            onChange={(next) => updateItem(index, next)}
            disabled={disabled}
            resolveCustomType={resolveCustomType}
          />
          <button
            type="button"
            className={styles.removeButton}
            aria-label={`Remove item ${index + 1}`}
            onClick={() => removeItem(index)}
            disabled={disabled}
          >
            <Icon name="close" size={12} />
          </button>
        </div>
      ))}
      <button
        type="button"
        className={styles.addButton}
        onClick={addItem}
        disabled={disabled || atMax}
      >
        <Icon name="add" size={14} /> Add item
      </button>
    </div>
  )
}
