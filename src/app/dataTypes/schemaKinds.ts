import type { CustomDataType, DataTypeRef, PrimitiveKind } from '../../domain/entities.types'

export interface SchemaKindOption {
  key: string
  label: string
  build: () => DataTypeRef
}

const PRIMITIVE_LABELS: { primitive: PrimitiveKind; label: string }[] = [
  { primitive: 'text', label: 'Text' },
  { primitive: 'date', label: 'Date' },
  { primitive: 'time', label: 'Time' },
  { primitive: 'datetime', label: 'Date & Time' },
  { primitive: 'boolean', label: 'Boolean' },
  { primitive: 'number', label: 'Number' },
  { primitive: 'select', label: 'Select' },
  { primitive: 'link', label: 'Link' },
  { primitive: 'color', label: 'Color' },
]

function defaultPrimitiveRef(): DataTypeRef {
  return { kind: 'primitive', primitive: 'text' }
}

export function kindKeyFor(typeRef: DataTypeRef): string {
  switch (typeRef.kind) {
    case 'primitive':
      return `primitive:${typeRef.primitive}`
    case 'list':
      return 'composite:list'
    case 'set':
      return 'composite:set'
    case 'tuple':
      return 'composite:tuple'
    case 'dictionary':
      return 'composite:dictionary'
    case 'customTypeRef':
      return `customType:${typeRef.customTypeId}`
  }
}

export function labelForTypeRef(
  typeRef: DataTypeRef,
  resolveCustomType: (id: string) => CustomDataType | undefined,
): string {
  switch (typeRef.kind) {
    case 'primitive':
      return PRIMITIVE_LABELS.find((option) => option.primitive === typeRef.primitive)?.label ?? typeRef.primitive
    case 'list':
      return 'List'
    case 'set':
      return 'Set'
    case 'tuple':
      return 'Tuple'
    case 'dictionary':
      return 'Dictionary'
    case 'customTypeRef':
      return resolveCustomType(typeRef.customTypeId)?.name ?? 'Unknown type'
  }
}

interface BuildSchemaKindOptionsParams {
  availableCustomTypes: CustomDataType[]
  includePrimitives: boolean
  isCustomTypeSelectable: (customTypeId: string) => boolean
}

export function buildSchemaKindOptions({
  availableCustomTypes,
  includePrimitives,
  isCustomTypeSelectable,
}: BuildSchemaKindOptionsParams): SchemaKindOption[] {
  const primitiveOptions: SchemaKindOption[] = includePrimitives
    ? PRIMITIVE_LABELS.map(({ primitive, label }) => ({
        key: `primitive:${primitive}`,
        label,
        build: (): DataTypeRef => ({ kind: 'primitive', primitive }),
      }))
    : []

  const compositeOptions: SchemaKindOption[] = [
    {
      key: 'composite:list',
      label: 'List',
      build: (): DataTypeRef => ({ kind: 'list', itemType: defaultPrimitiveRef() }),
    },
    {
      key: 'composite:set',
      label: 'Set',
      build: (): DataTypeRef => ({ kind: 'set', itemType: defaultPrimitiveRef() }),
    },
    {
      key: 'composite:tuple',
      label: 'Tuple',
      build: (): DataTypeRef => ({ kind: 'tuple', itemTypes: [defaultPrimitiveRef()] }),
    },
    {
      key: 'composite:dictionary',
      label: 'Dictionary',
      build: (): DataTypeRef => ({ kind: 'dictionary', fields: [] }),
    },
  ]

  const referenceOptions: SchemaKindOption[] = availableCustomTypes
    .filter((type) => isCustomTypeSelectable(type.id))
    .map((type) => ({
      key: `customType:${type.id}`,
      label: type.name,
      build: (): DataTypeRef => ({ kind: 'customTypeRef', customTypeId: type.id }),
    }))

  return [...primitiveOptions, ...compositeOptions, ...referenceOptions]
}

export function filterSchemaKindOptions(
  options: SchemaKindOption[],
  query: string,
): SchemaKindOption[] {
  const normalized = query.trim().toLowerCase()
  if (!normalized) return options
  return options.filter((option) => option.label.toLowerCase().includes(normalized))
}
