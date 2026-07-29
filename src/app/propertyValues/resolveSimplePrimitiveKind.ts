import type { CustomDataType, DataTypeRef } from '../../domain/entities.types'

export type SimplePrimitiveKind = 'text' | 'number' | 'link'

export function resolveSimplePrimitiveKind(
  typeRef: DataTypeRef,
  resolveCustomType: (id: string) => CustomDataType | undefined,
): SimplePrimitiveKind | null {
  switch (typeRef.kind) {
    case 'primitive':
      return typeRef.primitive === 'text' ||
        typeRef.primitive === 'number' ||
        typeRef.primitive === 'link'
        ? typeRef.primitive
        : null
    case 'customTypeRef': {
      const referenced = resolveCustomType(typeRef.customTypeId)
      return referenced ? resolveSimplePrimitiveKind(referenced.schema, resolveCustomType) : null
    }
    default:
      return null
  }
}
