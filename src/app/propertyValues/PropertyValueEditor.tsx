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
  switch (typeRef.kind) {
    case 'primitive':
      return (
        <PrimitiveValueEditor
          primitiveType={typeRef}
          value={value}
          onChange={onChange}
          disabled={disabled}
        />
      )
    case 'customTypeRef': {
      const referenced = resolveCustomType(typeRef.customTypeId)
      if (!referenced) return <span>Unknown type</span>
      return (
        <PropertyValueEditor
          typeRef={referenced.schema}
          value={value}
          onChange={onChange}
          disabled={disabled}
          resolveCustomType={resolveCustomType}
          availableCustomTypes={availableCustomTypes}
        />
      )
    }
    case 'list':
      return (
        <ListValueEditor
          itemType={typeRef.itemType}
          maxSize={typeRef.maxSize}
          value={Array.isArray(value) ? value : []}
          onChange={onChange}
          disabled={disabled}
          resolveCustomType={resolveCustomType}
          availableCustomTypes={availableCustomTypes}
        />
      )
    case 'set':
      return (
        <SetValueEditor
          itemType={typeRef.itemType}
          value={Array.isArray(value) ? value : []}
          onChange={onChange}
          disabled={disabled}
          resolveCustomType={resolveCustomType}
          availableCustomTypes={availableCustomTypes}
        />
      )
    case 'tuple':
      return (
        <TupleValueEditor
          itemTypes={typeRef.itemTypes}
          value={Array.isArray(value) ? value : []}
          onChange={onChange}
          onItemTypesChange={
            onSchemaChange
              ? (nextItemTypes, nextValue) =>
                  onSchemaChange({ ...typeRef, itemTypes: nextItemTypes }, nextValue)
              : undefined
          }
          isEditingTuple={isEditingTuple ?? false}
          disabled={disabled}
          resolveCustomType={resolveCustomType}
          availableCustomTypes={availableCustomTypes}
        />
      )
    case 'dictionary':
      return (
        <DictionaryValueEditor
          fields={typeRef.fields}
          value={value && typeof value === 'object' && !Array.isArray(value) ? value : {}}
          onChange={onChange}
          onFieldsChange={
            onSchemaChange
              ? (nextFields, nextValue) =>
                  onSchemaChange({ ...typeRef, fields: nextFields }, nextValue)
              : undefined
          }
          disabled={disabled}
          resolveCustomType={resolveCustomType}
          availableCustomTypes={availableCustomTypes}
        />
      )
  }
}

interface PrimitiveValueEditorProps {
  primitiveType: Extract<DataTypeRef, { kind: 'primitive' }>
  value: PropertyValueData
  onChange: (value: PropertyValueData) => void
  disabled?: boolean
}

function PrimitiveValueEditor({
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
