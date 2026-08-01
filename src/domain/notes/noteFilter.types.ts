import type { PrimitiveKind, PropertyValueData, SelectOption } from '../entities.types'

export type PropertyOperator =
  'contains' | 'equals' | 'greaterThan' | 'lessThan' | 'before' | 'after'

export const OPERATORS_BY_PRIMITIVE: Record<PrimitiveKind, PropertyOperator[]> = {
  text: ['contains'],
  number: ['equals', 'greaterThan', 'lessThan'],
  date: ['equals', 'before', 'after'],
  time: ['equals', 'before', 'after'],
  datetime: ['equals', 'before', 'after'],
  boolean: ['equals'],
  select: ['equals'],
  color: ['equals'],
  link: ['equals'],
}

// A criterion is one atomic check. `id` is ephemeral UI state (never persisted to Dexie),
// generated with createId() purely to key React lists and target updates/removals.
export type FilterCriterion =
  | { id: string; kind: 'tag'; tag: string }
  | { id: string; kind: 'noteType'; noteTypeId: string | null }
  | { id: string; kind: 'title'; text: string }
  | {
      id: string
      kind: 'property'
      propertyKey: string
      primitive: PrimitiveKind
      options?: SelectOption[]
      operator: PropertyOperator
      operand: PropertyValueData
    }

export interface FilterBlock {
  id: string
  criteria: FilterCriterion[]
}

// mode drives a duality: 'and' combines criteria within each block via AND, but combines
// blocks with each other via OR ("OR of ANDs"); 'or' does the reverse ("AND of ORs").
export interface FilterState {
  mode: 'and' | 'or'
  blocks: FilterBlock[]
}

export interface FilterableProperty {
  key: string
  primitive: PrimitiveKind
  options?: SelectOption[]
}
