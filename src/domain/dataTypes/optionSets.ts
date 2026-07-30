import type { DataTypeRef } from '../entities.types'

// A CustomDataType whose schema is a select primitive is treated as a reusable, named
// "Option set" — a shared list of SelectOption values that many notes can reference via
// customTypeRef instead of each keeping their own private option list.
export function isOptionSetSchema(schema: DataTypeRef): boolean {
  return schema.kind === 'primitive' && schema.primitive === 'select'
}
