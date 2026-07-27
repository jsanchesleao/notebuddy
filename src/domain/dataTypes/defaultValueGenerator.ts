import type { CustomDataType, DataTypeRef, PrimitiveKind, PropertyValueData } from '../entities.types'

export interface DefaultValueContext {
  resolveCustomType: (id: string) => CustomDataType | undefined
}

export function createDefaultValue(typeRef: DataTypeRef, ctx: DefaultValueContext): PropertyValueData {
  switch (typeRef.kind) {
    case 'primitive':
      return createPrimitiveDefault(typeRef.primitive)
    case 'list':
    case 'set':
      return []
    case 'tuple':
      return typeRef.itemTypes.map((itemType) => createDefaultValue(itemType, ctx))
    case 'dictionary': {
      const result: Record<string, PropertyValueData> = {}
      for (const field of typeRef.fields) {
        result[field.key] = createDefaultValue(field.typeRef, ctx)
      }
      return result
    }
    case 'customTypeRef': {
      const referenced = ctx.resolveCustomType(typeRef.customTypeId)
      if (!referenced) return null
      return createDefaultValue(referenced.schema, ctx)
    }
  }
}

function createPrimitiveDefault(primitive: PrimitiveKind): PropertyValueData {
  switch (primitive) {
    case 'text':
    case 'link':
    case 'color':
      return ''
    case 'number':
    case 'date':
    case 'time':
    case 'datetime':
    case 'select':
      return null
    case 'boolean':
      return false
  }
}
