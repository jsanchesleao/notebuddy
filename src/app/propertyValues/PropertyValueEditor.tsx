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
  disabled?: boolean
  resolveCustomType: (id: string) => CustomDataType | undefined
}

export function PropertyValueEditor({
  typeRef,
  value,
  onChange,
  disabled,
  resolveCustomType,
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
        />
      )
    case 'tuple':
      return (
        <TupleValueEditor
          itemTypes={typeRef.itemTypes}
          value={Array.isArray(value) ? value : []}
          onChange={onChange}
          disabled={disabled}
          resolveCustomType={resolveCustomType}
        />
      )
    case 'dictionary':
      return (
        <DictionaryValueEditor
          fields={typeRef.fields}
          value={value && typeof value === 'object' && !Array.isArray(value) ? value : {}}
          onChange={onChange}
          disabled={disabled}
          resolveCustomType={resolveCustomType}
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

function PrimitiveValueEditor({ primitiveType, value, onChange, disabled }: PrimitiveValueEditorProps) {
  switch (primitiveType.primitive) {
    case 'text':
      return (
        <TextValueEditor value={typeof value === 'string' ? value : ''} onChange={onChange} disabled={disabled} />
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
        <LinkValueEditor value={typeof value === 'string' ? value : ''} onChange={onChange} disabled={disabled} />
      )
    case 'color':
      return (
        <ColorValueEditor value={typeof value === 'string' ? value : ''} onChange={onChange} disabled={disabled} />
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
