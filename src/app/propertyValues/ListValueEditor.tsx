import { Icon } from '../../components/Icon/Icon'
import { createDefaultValue } from '../../domain/dataTypes/defaultValueGenerator'
import { buildItemTypeOptions } from '../dataTypes/schemaKinds'
import { SchemaKindSelect } from '../dataTypes/SchemaKindSelect'
import type { CustomDataType, DataTypeRef, PropertyValueData } from '../../domain/entities.types'
import { PropertyValueEditor } from './PropertyValueEditor'
import { PillListEditor } from './PillListEditor'
import { resolvePillItemKind } from './resolvePillItemKind'
import styles from './compositeEditors.module.css'

interface ListValueEditorProps {
  itemType: DataTypeRef
  maxSize?: number
  value: PropertyValueData[]
  onChange: (value: PropertyValueData[]) => void
  onItemTypeChange?: (itemType: DataTypeRef) => void
  disabled?: boolean
  resolveCustomType: (id: string) => CustomDataType | undefined
  availableCustomTypes: CustomDataType[]
}

export function ListValueEditor({
  itemType,
  maxSize,
  value,
  onChange,
  onItemTypeChange,
  disabled,
  resolveCustomType,
  availableCustomTypes,
}: ListValueEditorProps) {
  const itemTypeRow = onItemTypeChange && (
    <div className={styles.itemTypeRow}>
      <span className={styles.itemTypeLabel}>Item type</span>
      <SchemaKindSelect
        value={itemType}
        options={buildItemTypeOptions(availableCustomTypes)}
        onChange={onItemTypeChange}
      />
    </div>
  )

  const pillKind = resolvePillItemKind(itemType, resolveCustomType)
  if (pillKind) {
    return (
      <div className={styles.list}>
        {itemTypeRow}
        <PillListEditor
          pillKind={pillKind}
          maxSize={maxSize}
          value={value}
          onChange={onChange}
          disabled={disabled}
        />
      </div>
    )
  }

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
      {itemTypeRow}
      {value.map((item, index) => (
        <div key={index} className={styles.listRow}>
          <PropertyValueEditor
            typeRef={itemType}
            value={item}
            onChange={(next) => updateItem(index, next)}
            disabled={disabled}
            resolveCustomType={resolveCustomType}
            availableCustomTypes={availableCustomTypes}
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
