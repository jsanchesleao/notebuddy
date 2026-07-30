import { useState, type FormEvent } from 'react'
import { setNoteProperty } from '../../../domain/notes/noteRepository'
import { createDefaultValue } from '../../../domain/dataTypes/defaultValueGenerator'
import { isOptionSetSchema } from '../../../domain/dataTypes/optionSets'
import { SchemaKindSelect } from '../../dataTypes/SchemaKindSelect'
import { OptionSetPicker } from '../../dataTypes/OptionSetPicker'
import { buildItemTypeOptions, buildSchemaKindOptions } from '../../dataTypes/schemaKinds'
import { SelectOptionsEditor } from '../../propertyValues/SelectOptionsEditor'
import { Icon } from '../../../components/Icon/Icon'
import type { CustomDataType, DataTypeRef } from '../../../domain/entities.types'
import styles from './AddPropertyControl.module.css'
import compositeStyles from '../../propertyValues/compositeEditors.module.css'

interface AddPropertyControlProps {
  noteId: string
  existingKeys: string[]
  availableCustomTypes: CustomDataType[]
}

const DEFAULT_TYPE: DataTypeRef = { kind: 'primitive', primitive: 'text' }
const EMPTY_SELECT: DataTypeRef = { kind: 'primitive', primitive: 'select', options: [] }

type SelectMode = 'custom' | 'set' | null

function isSelectPrimitive(
  typeRef: DataTypeRef,
): typeRef is DataTypeRef & { kind: 'primitive'; primitive: 'select' } {
  return typeRef.kind === 'primitive' && typeRef.primitive === 'select'
}

export function AddPropertyControl({
  noteId,
  existingKeys,
  availableCustomTypes,
}: AddPropertyControlProps) {
  const [key, setKey] = useState('')
  const [typeRef, setTypeRef] = useState<DataTypeRef>(DEFAULT_TYPE)
  const [selectMode, setSelectMode] = useState<SelectMode>(null)
  const [error, setError] = useState<string | null>(null)

  const resolveCustomType = (id: string) => availableCustomTypes.find((type) => type.id === id)
  const itemTypeOptions = buildItemTypeOptions(availableCustomTypes)
  const options = buildSchemaKindOptions({
    availableCustomTypes,
    includePrimitives: true,
    // Select-shaped custom types (Option Sets) are reached via the "Use existing set" toggle
    // below rather than listed directly here, alongside the generic "Select" primitive.
    isCustomTypeSelectable: (id) => {
      const type = resolveCustomType(id)
      return !type || !isOptionSetSchema(type.schema)
    },
  })

  const handleTypeChange = (next: DataTypeRef) => {
    if (isSelectPrimitive(next)) {
      setSelectMode('custom')
      setTypeRef(EMPTY_SELECT)
    } else {
      setSelectMode(null)
      setTypeRef(next)
    }
  }

  const canSubmit = selectMode !== 'set' || typeRef.kind === 'customTypeRef'

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    const trimmed = key.trim()
    if (!trimmed) return
    if (existingKeys.includes(trimmed)) {
      setError('A property with this name already exists.')
      return
    }
    if (!canSubmit) {
      setError('Choose an option set first.')
      return
    }

    setError(null)
    const value = createDefaultValue(typeRef, { resolveCustomType })
    await setNoteProperty(noteId, trimmed, { typeRef, value })
    setKey('')
    setTypeRef(DEFAULT_TYPE)
    setSelectMode(null)
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
        <SchemaKindSelect value={typeRef} options={options} onChange={handleTypeChange} />
      </div>

      {selectMode !== null && (
        <div className={styles.selectModeToggle} role="group" aria-label="Select options source">
          <button
            type="button"
            className={styles.selectModeButton}
            aria-pressed={selectMode === 'custom'}
            onClick={() => {
              setSelectMode('custom')
              setTypeRef(EMPTY_SELECT)
            }}
          >
            Custom options
          </button>
          <button
            type="button"
            className={styles.selectModeButton}
            aria-pressed={selectMode === 'set'}
            onClick={() => setSelectMode('set')}
          >
            Use existing set
          </button>
        </div>
      )}

      {selectMode === 'custom' && isSelectPrimitive(typeRef) && (
        <SelectOptionsEditor
          options={typeRef.options ?? []}
          onChange={(nextOptions) => setTypeRef({ ...typeRef, options: nextOptions })}
        />
      )}

      {selectMode === 'set' && (
        <OptionSetPicker
          availableCustomTypes={availableCustomTypes}
          value={typeRef.kind === 'customTypeRef' ? typeRef.customTypeId : null}
          onChange={(customTypeId) => setTypeRef({ kind: 'customTypeRef', customTypeId })}
        />
      )}

      {(typeRef.kind === 'list' || typeRef.kind === 'set') && (
        <div className={compositeStyles.itemTypeRow}>
          <span className={compositeStyles.itemTypeLabel}>Item type</span>
          <SchemaKindSelect
            value={typeRef.itemType}
            options={itemTypeOptions}
            onChange={(nextItemType) => setTypeRef({ ...typeRef, itemType: nextItemType })}
          />
        </div>
      )}

      {typeRef.kind === 'tuple' && (
        <div className={compositeStyles.tupleEditable}>
          {typeRef.itemTypes.map((slotType, index) => (
            <div key={index} className={compositeStyles.tupleSlotRow}>
              <SchemaKindSelect
                value={slotType}
                options={itemTypeOptions}
                onChange={(next) => {
                  const nextItemTypes = [...typeRef.itemTypes]
                  nextItemTypes[index] = next
                  setTypeRef({ ...typeRef, itemTypes: nextItemTypes })
                }}
              />
              <button
                type="button"
                className={compositeStyles.removeButton}
                aria-label={`Remove position ${index + 1}`}
                onClick={() =>
                  setTypeRef({
                    ...typeRef,
                    itemTypes: typeRef.itemTypes.filter((_, i) => i !== index),
                  })
                }
              >
                <Icon name="close" size={12} />
              </button>
            </div>
          ))}
          <button
            type="button"
            className={compositeStyles.addButton}
            onClick={() =>
              setTypeRef({
                ...typeRef,
                itemTypes: [...typeRef.itemTypes, { kind: 'primitive', primitive: 'text' }],
              })
            }
          >
            <Icon name="add" size={14} /> Add position
          </button>
        </div>
      )}

      <button type="submit" className={styles.addButton}>
        <Icon name="add" size={14} /> Add property
      </button>
      {error && <p className={styles.error}>{error}</p>}
    </form>
  )
}
