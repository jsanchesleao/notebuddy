import { resolveTypeRef } from '../../domain/dataTypes/resolveTypeRef'
import type { CustomDataType, DataTypeRef } from '../../domain/entities.types'

export type SimplePrimitiveKind = 'text' | 'number' | 'link'

export function resolveSimplePrimitiveKind(
  typeRef: DataTypeRef,
  resolveCustomType: (id: string) => CustomDataType | undefined,
): SimplePrimitiveKind | null {
  const resolved = resolveTypeRef(typeRef, resolveCustomType)
  if (!resolved || resolved.kind !== 'primitive') return null

  return resolved.primitive === 'text' ||
    resolved.primitive === 'number' ||
    resolved.primitive === 'link'
    ? resolved.primitive
    : null
}
