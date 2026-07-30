import { Icon } from '../../components/Icon/Icon'
import { createDefaultValue } from '../../domain/dataTypes/defaultValueGenerator'
import { buildItemTypeOptions } from '../dataTypes/schemaKinds'
import { SchemaKindSelect } from '../dataTypes/SchemaKindSelect'
import type { CustomDataType, DataTypeRef, PropertyValueData } from '../../domain/entities.types'
import { PropertyValueEditor } from './PropertyValueEditor'
import styles from './compositeEditors.module.css'

interface TupleValueEditorProps {
  itemTypes: DataTypeRef[]
  value: PropertyValueData[]
  onChange: (value: PropertyValueData[]) => void
  onItemTypesChange?: (itemTypes: DataTypeRef[], value: PropertyValueData[]) => void
  showItemTypes?: boolean
  disabled?: boolean
  resolveCustomType: (id: string) => CustomDataType | undefined
  availableCustomTypes: CustomDataType[]
}

export function TupleValueEditor({
  itemTypes,
  value,
  onChange,
  onItemTypesChange,
  showItemTypes = false,
  disabled,
  resolveCustomType,
  availableCustomTypes,
}: TupleValueEditorProps) {
  const updateItem = (index: number, next: PropertyValueData) => {
    const nextItems = [...value]
    nextItems[index] = next
    onChange(nextItems)
  }

  if (!onItemTypesChange) {
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
            availableCustomTypes={availableCustomTypes}
          />
        ))}
      </div>
    )
  }

  const itemTypeOptions = buildItemTypeOptions(availableCustomTypes)

  const retypeSlot = (index: number, nextType: DataTypeRef) => {
    const nextItemTypes = itemTypes.map((type, i) => (i === index ? nextType : type))
    const nextValue = [...value]
    nextValue[index] = createDefaultValue(nextType, { resolveCustomType })
    onItemTypesChange(nextItemTypes, nextValue)
  }

  const addSlot = () => {
    const newType: DataTypeRef = { kind: 'primitive', primitive: 'text' }
    onItemTypesChange(
      [...itemTypes, newType],
      [...value, createDefaultValue(newType, { resolveCustomType })],
    )
  }

  const removeSlot = (index: number) => {
    onItemTypesChange(
      itemTypes.filter((_, i) => i !== index),
      value.filter((_, i) => i !== index),
    )
  }

  return (
    <div className={styles.tupleEditable}>
      {itemTypes.map((itemType, index) => (
        <div key={index} className={styles.tupleSlotRow}>
          {showItemTypes && (
            <SchemaKindSelect
              value={itemType}
              options={itemTypeOptions}
              onChange={(next) => retypeSlot(index, next)}
            />
          )}
          <div className={styles.tupleValueSlot}>
            <PropertyValueEditor
              typeRef={itemType}
              value={value[index] ?? null}
              onChange={(next) => updateItem(index, next)}
              disabled={disabled}
              resolveCustomType={resolveCustomType}
              availableCustomTypes={availableCustomTypes}
            />
          </div>
          <button
            type="button"
            className={styles.removeButton}
            aria-label={`Remove position ${index + 1}`}
            onClick={() => removeSlot(index)}
            disabled={disabled}
          >
            <Icon name="close" size={12} />
          </button>
        </div>
      ))}
      <button type="button" className={styles.addButton} onClick={addSlot} disabled={disabled}>
        <Icon name="add" size={14} /> Add position
      </button>
    </div>
  )
}
