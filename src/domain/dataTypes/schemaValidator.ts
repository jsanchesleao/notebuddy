import type { CustomDataType, DataTypeRef, PropertyValueData } from '../entities.types'

export interface ValidationContext {
  resolveCustomType: (id: string) => CustomDataType | undefined
}

export interface ValidationIssue {
  path: string
  message: string
}

export class SchemaValidationError extends Error {
  issues: ValidationIssue[]

  constructor(issues: ValidationIssue[]) {
    super(issues.map((issue) => `${issue.path}: ${issue.message}`).join('; '))
    this.name = 'SchemaValidationError'
    this.issues = issues
  }
}

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/
const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/
const COLOR_REGEX = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/

function isPlainObject(value: unknown): value is Record<string, PropertyValueData> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

// Note: this exactness check (no missing/extra keys) only ever runs on a dictionary-typed
// VALUE nested inside a schema. The top-level `note.metadata.properties` bag is never itself
// validated as a dictionary — each entry is validated independently against its own typeRef —
// which is what leaves ad hoc note properties unconstrained.
export function validateValue(
  typeRef: DataTypeRef,
  value: PropertyValueData,
  ctx: ValidationContext,
  path = 'value',
): ValidationIssue[] {
  switch (typeRef.kind) {
    case 'primitive':
      return validatePrimitive(typeRef, value, path)
    case 'list': {
      if (!Array.isArray(value)) return [{ path, message: 'must be a list' }]
      if (typeRef.maxSize !== undefined && value.length > typeRef.maxSize) {
        return [{ path, message: `must have at most ${typeRef.maxSize} items` }]
      }
      return value.flatMap((item, index) =>
        validateValue(typeRef.itemType, item, ctx, `${path}[${index}]`),
      )
    }
    case 'set': {
      if (!Array.isArray(value)) return [{ path, message: 'must be a set' }]
      const issues = value.flatMap((item, index) =>
        validateValue(typeRef.itemType, item, ctx, `${path}[${index}]`),
      )
      const seen = new Set<string>()
      for (const item of value) {
        const key = JSON.stringify(item)
        if (seen.has(key)) {
          issues.push({ path, message: 'must not contain duplicate values' })
          break
        }
        seen.add(key)
      }
      return issues
    }
    case 'tuple': {
      if (!Array.isArray(value)) return [{ path, message: 'must be a tuple' }]
      if (value.length !== typeRef.itemTypes.length) {
        return [{ path, message: `must have exactly ${typeRef.itemTypes.length} items` }]
      }
      return typeRef.itemTypes.flatMap((itemType, index) =>
        validateValue(itemType, value[index], ctx, `${path}[${index}]`),
      )
    }
    case 'dictionary': {
      if (!isPlainObject(value)) return [{ path, message: 'must be an object' }]
      const declaredKeys = new Set(typeRef.fields.map((field) => field.key))
      const issues: ValidationIssue[] = []

      for (const field of typeRef.fields) {
        if (!(field.key in value)) {
          issues.push({ path: `${path}.${field.key}`, message: 'is required' })
        } else {
          issues.push(
            ...validateValue(field.typeRef, value[field.key], ctx, `${path}.${field.key}`),
          )
        }
      }
      for (const key of Object.keys(value)) {
        if (!declaredKeys.has(key)) {
          issues.push({ path: `${path}.${key}`, message: 'is not a declared field' })
        }
      }
      return issues
    }
    case 'customTypeRef': {
      const referenced = ctx.resolveCustomType(typeRef.customTypeId)
      if (!referenced) return [{ path, message: 'references an unknown custom type' }]
      return validateValue(referenced.schema, value, ctx, path)
    }
  }
}

function validatePrimitive(
  typeRef: Extract<DataTypeRef, { kind: 'primitive' }>,
  value: PropertyValueData,
  path: string,
): ValidationIssue[] {
  switch (typeRef.primitive) {
    case 'text':
      return typeof value === 'string' ? [] : [{ path, message: 'must be text' }]
    case 'number':
      return value === null || (typeof value === 'number' && Number.isFinite(value))
        ? []
        : [{ path, message: 'must be a finite number or empty' }]
    case 'boolean':
      return typeof value === 'boolean' ? [] : [{ path, message: 'must be true or false' }]
    case 'date':
      return value === null || (typeof value === 'string' && DATE_REGEX.test(value))
        ? []
        : [{ path, message: 'must be a date (YYYY-MM-DD) or empty' }]
    case 'time':
      return value === null || (typeof value === 'string' && TIME_REGEX.test(value))
        ? []
        : [{ path, message: 'must be a time (HH:mm) or empty' }]
    case 'datetime':
      return value === null || (typeof value === 'string' && !Number.isNaN(Date.parse(value)))
        ? []
        : [{ path, message: 'must be a valid date/time or empty' }]
    case 'color':
      return value === null ||
        value === '' ||
        (typeof value === 'string' && COLOR_REGEX.test(value))
        ? []
        : [{ path, message: 'must be a hex color or empty' }]
    case 'link':
      if (value === null || value === '') return []
      if (typeof value !== 'string') return [{ path, message: 'must be a URL' }]
      try {
        new URL(value)
        return []
      } catch {
        return [{ path, message: 'must be a valid URL' }]
      }
    case 'select': {
      if (value === null) return []
      const options = typeRef.options ?? []
      return typeof value === 'string' && options.some((option) => option.value === value)
        ? []
        : [{ path, message: 'must match one of the declared options' }]
    }
  }
}

export function assertValid(
  typeRef: DataTypeRef,
  value: PropertyValueData,
  ctx: ValidationContext,
): void {
  const issues = validateValue(typeRef, value, ctx)
  if (issues.length > 0) {
    throw new SchemaValidationError(issues)
  }
}
