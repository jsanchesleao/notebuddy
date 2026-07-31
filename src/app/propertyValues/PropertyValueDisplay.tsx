import type { CustomDataType, DataTypeRef, PropertyValueData } from '../../domain/entities.types'
import { PrimitiveValueDisplay } from './PrimitiveValueDisplay'
import { CollectionValueDisplay } from './CollectionValueDisplay'
import { TupleValueDisplay } from './TupleValueDisplay'
import { DictionaryValueDisplay } from './DictionaryValueDisplay'

export interface PropertyValueDisplayProps {
  typeRef: DataTypeRef
  value: PropertyValueData
  // Only meaningful when typeRef resolves (directly or through a customTypeRef) to a list/set
  // whose item type renders as a pill (text/select) — powers the confirmed "pill quick-edit"
  // exception, letting a pill's value still be edited by clicking it without entering the row's
  // full edit mode. Every other kind of value in this display tree is fully non-interactive.
  onChange?: (value: PropertyValueData) => void
  resolveCustomType: (id: string) => CustomDataType | undefined
  availableCustomTypes: CustomDataType[]
}

export function PropertyValueDisplay({
  typeRef,
  value,
  onChange,
  resolveCustomType,
  availableCustomTypes,
}: PropertyValueDisplayProps) {
  switch (typeRef.kind) {
    case 'primitive':
      return (
        <PrimitiveValueDisplay
          primitive={typeRef.primitive}
          value={value}
          options={typeRef.options}
        />
      )
    case 'customTypeRef': {
      const referenced = resolveCustomType(typeRef.customTypeId)
      if (!referenced) return <span>Unknown type</span>
      return (
        <PropertyValueDisplay
          typeRef={referenced.schema}
          value={value}
          onChange={onChange}
          resolveCustomType={resolveCustomType}
          availableCustomTypes={availableCustomTypes}
        />
      )
    }
    case 'list':
    case 'set':
      return (
        <CollectionValueDisplay
          itemType={typeRef.itemType}
          value={Array.isArray(value) ? value : []}
          onChange={onChange}
          resolveCustomType={resolveCustomType}
          availableCustomTypes={availableCustomTypes}
        />
      )
    case 'tuple':
      return (
        <TupleValueDisplay
          itemTypes={typeRef.itemTypes}
          value={Array.isArray(value) ? value : []}
          resolveCustomType={resolveCustomType}
          availableCustomTypes={availableCustomTypes}
        />
      )
    case 'dictionary':
      return (
        <DictionaryValueDisplay
          fields={typeRef.fields}
          value={value && typeof value === 'object' && !Array.isArray(value) ? value : {}}
          resolveCustomType={resolveCustomType}
          availableCustomTypes={availableCustomTypes}
        />
      )
  }
}
