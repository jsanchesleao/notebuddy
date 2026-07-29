import { useState } from 'react'
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import { arrayMove, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { Icon } from '../../components/Icon/Icon'
import { createId } from '../../domain/ids'
import { createDefaultValue } from '../../domain/dataTypes/defaultValueGenerator'
import { buildSchemaKindOptions } from '../dataTypes/schemaKinds'
import { SchemaKindSelect } from '../dataTypes/SchemaKindSelect'
import type {
  CustomDataType,
  DataTypeRef,
  DictionaryField,
  PropertyValueData,
} from '../../domain/entities.types'
import { PropertyValueEditor } from './PropertyValueEditor'
import { DictionaryFieldRow } from './DictionaryFieldRow'
import styles from './compositeEditors.module.css'

interface DictionaryValueEditorProps {
  fields: DictionaryField[]
  value: Record<string, PropertyValueData>
  onChange: (value: Record<string, PropertyValueData>) => void
  // Only set when this dictionary's schema is privately owned by the note (see
  // PropertyValueEditor) — enables add/rename/retype/remove/reorder of fields. When absent,
  // this renders read-only-structure, one row per already-declared field, matching the
  // previous behavior used for a dictionary reached through a shared Custom Data Type.
  onFieldsChange?: (fields: DictionaryField[], value: Record<string, PropertyValueData>) => void
  disabled?: boolean
  resolveCustomType: (id: string) => CustomDataType | undefined
}

const PRIMITIVE_TYPE_OPTIONS = buildSchemaKindOptions({
  availableCustomTypes: [],
  includePrimitives: true,
  isCustomTypeSelectable: () => false,
}).filter((option) => option.key.startsWith('primitive:'))

export function DictionaryValueEditor({
  fields,
  value,
  onChange,
  onFieldsChange,
  disabled,
  resolveCustomType,
}: DictionaryValueEditorProps) {
  // Ephemeral, component-local identity for React keys / dnd-kit sortable ids — dictionary
  // fields have no persisted id of their own, and none is needed: every mutation below
  // updates this array in lockstep with `fields` in the same handler that calls
  // onFieldsChange, so it never needs to be reconciled against the incoming prop.
  const [rowIds, setRowIds] = useState(() => fields.map(() => createId()))
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor),
  )

  const updateValue = (key: string, next: PropertyValueData) => {
    onChange({ ...value, [key]: next })
  }

  if (!onFieldsChange) {
    return (
      <div className={styles.dictionary}>
        {fields.map((field) => (
          <div key={field.key} className={styles.dictionaryRow}>
            <span className={styles.dictionaryLabel}>{field.key}</span>
            <PropertyValueEditor
              typeRef={field.typeRef}
              value={value[field.key] ?? null}
              onChange={(next) => updateValue(field.key, next)}
              disabled={disabled}
              resolveCustomType={resolveCustomType}
            />
          </div>
        ))}
      </div>
    )
  }

  const addField = () => {
    const newField: DictionaryField = { key: '', typeRef: { kind: 'primitive', primitive: 'text' } }
    const nextValue = { ...value, '': createDefaultValue(newField.typeRef, { resolveCustomType }) }
    setRowIds([...rowIds, createId()])
    onFieldsChange([...fields, newField], nextValue)
  }

  const removeField = (index: number) => {
    const removedKey = fields[index].key
    const nextValue = { ...value }
    delete nextValue[removedKey]
    setRowIds(rowIds.filter((_, i) => i !== index))
    onFieldsChange(
      fields.filter((_, i) => i !== index),
      nextValue,
    )
  }

  const renameField = (index: number, newKey: string) => {
    const oldKey = fields[index].key
    const nextFields = fields.map((field, i) => (i === index ? { ...field, key: newKey } : field))
    const nextValue = { ...value }
    if (oldKey in nextValue) {
      nextValue[newKey] = nextValue[oldKey]
      if (oldKey !== newKey) delete nextValue[oldKey]
    }
    onFieldsChange(nextFields, nextValue)
  }

  const retypeField = (index: number, nextTypeRef: DataTypeRef) => {
    const field = fields[index]
    const nextFields = fields.map((f, i) => (i === index ? { ...f, typeRef: nextTypeRef } : f))
    const nextValue = { ...value, [field.key]: createDefaultValue(nextTypeRef, { resolveCustomType }) }
    onFieldsChange(nextFields, nextValue)
  }

  const moveField = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= fields.length || fromIndex === toIndex) return
    setRowIds((ids) => arrayMove(ids, fromIndex, toIndex))
    onFieldsChange(arrayMove(fields, fromIndex, toIndex), value)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const overId = event.over?.id
    if (overId === undefined) return
    const fromIndex = rowIds.indexOf(String(event.active.id))
    const toIndex = rowIds.indexOf(String(overId))
    if (fromIndex === -1 || toIndex === -1) return
    moveField(fromIndex, toIndex)
  }

  const hasDuplicateKeys = fields.some(
    (field, index) =>
      field.key.trim().length > 0 && fields.findIndex((other) => other.key === field.key) !== index,
  )

  return (
    <div className={styles.dictionary}>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={rowIds} strategy={verticalListSortingStrategy}>
          {fields.map((field, index) => (
            <DictionaryFieldRow key={rowIds[index]} id={rowIds[index]} disabled={disabled}>
              <div className={styles.dictionaryEntryTopLine}>
                <input
                  type="text"
                  className={styles.dictionaryKeyInput}
                  placeholder="Key"
                  value={field.key}
                  onChange={(event) => renameField(index, event.target.value)}
                  disabled={disabled}
                  aria-label={`Entry key ${index + 1}`}
                />
                <SchemaKindSelect
                  value={field.typeRef}
                  options={PRIMITIVE_TYPE_OPTIONS}
                  onChange={(nextTypeRef) => retypeField(index, nextTypeRef)}
                />
              </div>
              <div className={styles.dictionaryEntryBottomLine}>
                <div className={styles.dictionaryValueSlot}>
                  <PropertyValueEditor
                    typeRef={field.typeRef}
                    value={value[field.key] ?? null}
                    onChange={(next) => updateValue(field.key, next)}
                    disabled={disabled}
                    resolveCustomType={resolveCustomType}
                  />
                </div>
                <button
                  type="button"
                  className={styles.moveButton}
                  aria-label={`Move entry ${index + 1} up`}
                  onClick={() => moveField(index, index - 1)}
                  disabled={disabled || index === 0}
                >
                  <Icon name="up" size={12} />
                </button>
                <button
                  type="button"
                  className={styles.moveButton}
                  aria-label={`Move entry ${index + 1} down`}
                  onClick={() => moveField(index, index + 1)}
                  disabled={disabled || index === fields.length - 1}
                >
                  <Icon name="down" size={12} />
                </button>
                <button
                  type="button"
                  className={styles.removeButton}
                  aria-label={`Remove entry ${index + 1}`}
                  onClick={() => removeField(index)}
                  disabled={disabled}
                >
                  <Icon name="close" size={12} />
                </button>
              </div>
            </DictionaryFieldRow>
          ))}
        </SortableContext>
      </DndContext>
      {hasDuplicateKeys && <p className={styles.warning}>Field names must be unique.</p>}
      <button type="button" className={styles.addButton} onClick={addField} disabled={disabled}>
        <Icon name="add" size={14} /> Add entry
      </button>
    </div>
  )
}
