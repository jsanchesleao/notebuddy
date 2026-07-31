import { resolveTypeRef } from '../../domain/dataTypes/resolveTypeRef'
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
  const resolved = resolveTypeRef(typeRef, resolveCustomType)
  if (!resolved || resolved.kind !== 'primitive') return null

  if (resolved.primitive === 'text') return { kind: 'text' }
  if (resolved.primitive === 'select') return { kind: 'select', options: resolved.options ?? [] }
  return null
}
