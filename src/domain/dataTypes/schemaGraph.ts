import type { CustomDataType, DataTypeRef } from '../entities.types'

export function collectCustomTypeReferences(schema: DataTypeRef): string[] {
  const ids: string[] = []

  const visit = (ref: DataTypeRef) => {
    switch (ref.kind) {
      case 'primitive':
        return
      case 'list':
      case 'set':
        visit(ref.itemType)
        return
      case 'tuple':
        ref.itemTypes.forEach(visit)
        return
      case 'dictionary':
        ref.fields.forEach((field) => visit(field.typeRef))
        return
      case 'customTypeRef':
        ids.push(ref.customTypeId)
        return
    }
  }

  visit(schema)
  return ids
}

export function wouldCreateCycle(
  ownerId: string | null,
  schema: DataTypeRef,
  resolveCustomType: (id: string) => CustomDataType | undefined,
): boolean {
  if (ownerId === null) return false

  const visited = new Set<string>()

  const visit = (ref: DataTypeRef): boolean => {
    switch (ref.kind) {
      case 'primitive':
        return false
      case 'list':
      case 'set':
        return visit(ref.itemType)
      case 'tuple':
        return ref.itemTypes.some(visit)
      case 'dictionary':
        return ref.fields.some((field) => visit(field.typeRef))
      case 'customTypeRef': {
        if (ref.customTypeId === ownerId) return true
        if (visited.has(ref.customTypeId)) return false
        visited.add(ref.customTypeId)
        const referenced = resolveCustomType(ref.customTypeId)
        if (!referenced) return false
        return visit(referenced.schema)
      }
    }
  }

  return visit(schema)
}

export function findCustomDataTypesReferencing(
  customTypeId: string,
  allTypes: CustomDataType[],
): CustomDataType[] {
  return allTypes.filter((type) => collectCustomTypeReferences(type.schema).includes(customTypeId))
}
