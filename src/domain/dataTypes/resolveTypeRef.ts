import type { CustomDataType, DataTypeRef } from '../entities.types'

// Follows a chain of `customTypeRef`s down to the concrete (non-ref) DataTypeRef they
// ultimately point at. Returns null if any link in the chain points at a custom type that
// no longer exists. Assumes the chain is acyclic — callers that persist a CustomDataType's
// schema must have already gone through schemaGraph.wouldCreateCycle to guarantee that.
export function resolveTypeRef(
  typeRef: DataTypeRef,
  resolveCustomType: (id: string) => CustomDataType | undefined,
): DataTypeRef | null {
  if (typeRef.kind !== 'customTypeRef') return typeRef

  const referenced = resolveCustomType(typeRef.customTypeId)
  return referenced ? resolveTypeRef(referenced.schema, resolveCustomType) : null
}
