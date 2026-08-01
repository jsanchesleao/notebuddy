import { resolveTypeRef } from '../../domain/dataTypes/resolveTypeRef'
import type { CustomDataType, DataTypeRef, PropertyValueData } from '../../domain/entities.types'
import { TextValueEditor } from './TextValueEditor'
import { NumberValueEditor } from './NumberValueEditor'
import { LinkValueEditor } from './LinkValueEditor'
import { BooleanToggle } from './BooleanToggle'
import { ColorValueEditor } from './ColorValueEditor'
import { DateValueEditor } from './DateValueEditor'
import { TimeValueEditor } from './TimeValueEditor'
import { DateTimeValueEditor } from './DateTimeValueEditor'
import { SelectValueEditor } from './SelectValueEditor'
import { ListValueEditor } from './ListValueEditor'
import { SetValueEditor } from './SetValueEditor'
import { TupleValueEditor } from './TupleValueEditor'
import { DictionaryValueEditor } from './DictionaryValueEditor'

export interface PropertyValueEditorProps {
  typeRef: DataTypeRef
  value: PropertyValueData
  onChange: (value: PropertyValueData) => void
  // Only set for a property whose schema is privately owned by the note (never forwarded
  // across a customTypeRef boundary) — lets list/set/tuple/dictionary editors add/retype/
  // remove/reorder their own item type(s) or fields, persisting typeRef and value together.
  onSchemaChange?: (typeRef: DataTypeRef, value: PropertyValueData) => void
  // Only meaningful for a `tuple` typeRef: reveals the per-slot type pickers and the
  // Add/Remove position controls as a group (see LiveEditPropertyRow's `isEditingTuple`
  // toggle). Defaults to hidden so other callers (SamplePreview, DictionaryValueEditor)
  // render tuples exactly as before.
  isEditingTuple?: boolean
  disabled?: boolean
  resolveCustomType: (id: string) => CustomDataType | undefined
  availableCustomTypes: CustomDataType[]
}

export function PropertyValueEditor({
  typeRef,
  value,
  onChange,
  onSchemaChange,
  isEditingTuple,
  disabled,
  resolveCustomType,
  availableCustomTypes,
}: PropertyValueEditorProps) {
  const resolved = resolveTypeRef(typeRef, resolveCustomType)
  if (!resolved) return <span>Unknown type</span>

  // Schema editing (and the tuple edit-mode toggle) must never be forwarded across a
  // customTypeRef boundary — once a property's type is a shared, registered CustomDataType
  // rather than a shape privately owned by the note, this component tree stops treating it
  // as editable, no matter how deeply nested the eventual list/set/tuple/dictionary is.
  const crossedCustomTypeRef = typeRef.kind === 'customTypeRef'
  const effectiveOnSchemaChange = crossedCustomTypeRef ? undefined : onSchemaChange
  const effectiveIsEditingTuple = crossedCustomTypeRef ? false : isEditingTuple

  switch (resolved.kind) {
    case 'primitive':
      return (
        <PrimitiveValueEditor
          primitiveType={resolved}
          value={value}
          onChange={onChange}
          disabled={disabled}
        />
      )
    case 'list':
      return (
        <ListValueEditor
          itemType={resolved.itemType}
          maxSize={resolved.maxSize}
          value={Array.isArray(value) ? value : []}
          onChange={onChange}
          onItemTypeChange={
            effectiveOnSchemaChange
              ? (nextItemType) =>
                  effectiveOnSchemaChange({ ...resolved, itemType: nextItemType }, [])
              : undefined
          }
          disabled={disabled}
          resolveCustomType={resolveCustomType}
          availableCustomTypes={availableCustomTypes}
        />
      )
    case 'set':
      return (
        <SetValueEditor
          itemType={resolved.itemType}
          value={Array.isArray(value) ? value : []}
          onChange={onChange}
          onItemTypeChange={
            effectiveOnSchemaChange
              ? (nextItemType) =>
                  effectiveOnSchemaChange({ ...resolved, itemType: nextItemType }, [])
              : undefined
          }
          disabled={disabled}
          resolveCustomType={resolveCustomType}
          availableCustomTypes={availableCustomTypes}
        />
      )
    case 'tuple':
      return (
        <TupleValueEditor
          itemTypes={resolved.itemTypes}
          value={Array.isArray(value) ? value : []}
          onChange={onChange}
          onItemTypesChange={
            effectiveOnSchemaChange
              ? (nextItemTypes, nextValue) =>
                  effectiveOnSchemaChange({ ...resolved, itemTypes: nextItemTypes }, nextValue)
              : undefined
          }
          isEditingTuple={effectiveIsEditingTuple ?? false}
          disabled={disabled}
          resolveCustomType={resolveCustomType}
          availableCustomTypes={availableCustomTypes}
        />
      )
    case 'dictionary':
      return (
        <DictionaryValueEditor
          fields={resolved.fields}
          value={value && typeof value === 'object' && !Array.isArray(value) ? value : {}}
          onChange={onChange}
          onFieldsChange={
            effectiveOnSchemaChange
              ? (nextFields, nextValue) =>
                  effectiveOnSchemaChange({ ...resolved, fields: nextFields }, nextValue)
              : undefined
          }
          disabled={disabled}
          resolveCustomType={resolveCustomType}
          availableCustomTypes={availableCustomTypes}
        />
      )
    case 'customTypeRef':
      return <span>Unknown type</span>
  }
}

export interface PrimitiveValueEditorProps {
  primitiveType: Extract<DataTypeRef, { kind: 'primitive' }>
  value: PropertyValueData
  onChange: (value: PropertyValueData) => void
  disabled?: boolean
}

export function PrimitiveValueEditor({
  primitiveType,
  value,
  onChange,
  disabled,
}: PrimitiveValueEditorProps) {
  switch (primitiveType.primitive) {
    case 'text':
      return (
        <TextValueEditor
          value={typeof value === 'string' ? value : ''}
          onChange={onChange}
          disabled={disabled}
        />
      )
    case 'number':
      return (
        <NumberValueEditor
          value={typeof value === 'number' ? value : null}
          onChange={onChange}
          disabled={disabled}
        />
      )
    case 'boolean':
      return <BooleanToggle value={value === true} onChange={onChange} disabled={disabled} />
    case 'link':
      return (
        <LinkValueEditor
          value={typeof value === 'string' ? value : ''}
          onChange={onChange}
          disabled={disabled}
        />
      )
    case 'color':
      return (
        <ColorValueEditor
          value={typeof value === 'string' ? value : ''}
          onChange={onChange}
          disabled={disabled}
        />
      )
    case 'date':
      return (
        <DateValueEditor
          value={typeof value === 'string' ? value : null}
          onChange={onChange}
          disabled={disabled}
        />
      )
    case 'time':
      return (
        <TimeValueEditor
          value={typeof value === 'string' ? value : null}
          onChange={onChange}
          disabled={disabled}
        />
      )
    case 'datetime':
      return (
        <DateTimeValueEditor
          value={typeof value === 'string' ? value : null}
          onChange={onChange}
          disabled={disabled}
        />
      )
    case 'select':
      return (
        <SelectValueEditor
          options={primitiveType.options ?? []}
          value={typeof value === 'string' ? value : null}
          onChange={onChange}
          disabled={disabled}
        />
      )
  }
}
