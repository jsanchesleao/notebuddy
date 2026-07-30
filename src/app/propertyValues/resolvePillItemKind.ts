import type { CustomDataType, DataTypeRef, SelectOption } from '../../domain/entities.types'

export type PillItemKind = { kind: 'text' } | { kind: 'select'; options: SelectOption[] }

// A List/Set item type renders as a compact pill only when it boils down to a single
// label — plain text, or a value picked from a select primitive / Option Set. Everything
// else (number, date, boolean, link, color, nested list/tuple/dictionary) keeps the
// existing full row-editor rendering, since a pill doesn't fit those shapes.
export function resolvePillItemKind(
  typeRef: DataTypeRef,
  resolveCustomType: (id: string) => CustomDataType | undefined,
): PillItemKind | null {
  switch (typeRef.kind) {
    case 'primitive':
      if (typeRef.primitive === 'text') return { kind: 'text' }
      if (typeRef.primitive === 'select') return { kind: 'select', options: typeRef.options ?? [] }
      return null
    case 'customTypeRef': {
      const referenced = resolveCustomType(typeRef.customTypeId)
      return referenced ? resolvePillItemKind(referenced.schema, resolveCustomType) : null
    }
    default:
      return null
  }
}
