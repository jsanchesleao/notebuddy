import { Icon } from '../../components/Icon/Icon'
import { SelectOptionsEditor } from '../propertyValues/SelectOptionsEditor'
import { wouldCreateCycle } from '../../domain/dataTypes/schemaGraph'
import { SchemaKindSelect } from './SchemaKindSelect'
import { buildSchemaKindOptions } from './schemaKinds'
import type { CustomDataType, DataTypeRef } from '../../domain/entities.types'
import styles from './SchemaNodeEditor.module.css'

interface SchemaNodeEditorProps {
  value: DataTypeRef
  onChange: (next: DataTypeRef) => void
  availableCustomTypes: CustomDataType[]
  ownerId: string | null
  resolveCustomType: (id: string) => CustomDataType | undefined
  restrictToComposites?: boolean
}

export function SchemaNodeEditor({
  value,
  onChange,
  availableCustomTypes,
  ownerId,
  resolveCustomType,
  restrictToComposites,
}: SchemaNodeEditorProps) {
  const options = buildSchemaKindOptions({
    availableCustomTypes,
    includePrimitives: !restrictToComposites,
    isCustomTypeSelectable: (customTypeId) =>
      !restrictToComposites &&
      customTypeId !== ownerId &&
      !wouldCreateCycle(ownerId, { kind: 'customTypeRef', customTypeId }, resolveCustomType),
  })

  return (
    <div className={styles.node}>
      <SchemaKindSelect value={value} options={options} onChange={onChange} />

      {value.kind === 'primitive' && value.primitive === 'select' && (
        <div className={styles.nested}>
          <SelectOptionsEditor
            options={value.options ?? []}
            onChange={(nextOptions) => onChange({ ...value, options: nextOptions })}
          />
        </div>
      )}

      {value.kind === 'list' && (
        <div className={styles.nested}>
          <span className={styles.fieldLabel}>Item type</span>
          <SchemaNodeEditor
            value={value.itemType}
            onChange={(itemType) => onChange({ ...value, itemType })}
            availableCustomTypes={availableCustomTypes}
            ownerId={ownerId}
            resolveCustomType={resolveCustomType}
          />
          <label className={styles.fieldLabel}>
            Max size (optional)
            <input
              type="number"
              className={styles.maxSizeInput}
              value={value.maxSize ?? ''}
              onChange={(event) => {
                const raw = event.target.value
                onChange({ ...value, maxSize: raw === '' ? undefined : Number(raw) })
              }}
            />
          </label>
        </div>
      )}

      {value.kind === 'set' && (
        <div className={styles.nested}>
          <span className={styles.fieldLabel}>Item type</span>
          <SchemaNodeEditor
            value={value.itemType}
            onChange={(itemType) => onChange({ ...value, itemType })}
            availableCustomTypes={availableCustomTypes}
            ownerId={ownerId}
            resolveCustomType={resolveCustomType}
          />
        </div>
      )}

      {value.kind === 'tuple' && (
        <div className={styles.nested}>
          {value.itemTypes.map((itemType, index) => (
            <div key={index} className={styles.slot}>
              <span className={styles.slotLabel}>Position {index + 1}</span>
              <SchemaNodeEditor
                value={itemType}
                onChange={(next) => {
                  const nextItemTypes = [...value.itemTypes]
                  nextItemTypes[index] = next
                  onChange({ ...value, itemTypes: nextItemTypes })
                }}
                availableCustomTypes={availableCustomTypes}
                ownerId={ownerId}
                resolveCustomType={resolveCustomType}
              />
              <button
                type="button"
                className={styles.removeButton}
                aria-label={`Remove position ${index + 1}`}
                onClick={() =>
                  onChange({ ...value, itemTypes: value.itemTypes.filter((_, i) => i !== index) })
                }
              >
                <Icon name="close" size={12} />
              </button>
            </div>
          ))}
          <button
            type="button"
            className={styles.addButton}
            onClick={() =>
              onChange({
                ...value,
                itemTypes: [...value.itemTypes, { kind: 'primitive', primitive: 'text' }],
              })
            }
          >
            <Icon name="add" size={14} /> Add position
          </button>
        </div>
      )}

      {value.kind === 'dictionary' && (
        <div className={styles.nested}>
          {value.fields.map((field, index) => {
            const isDuplicate =
              field.key.trim().length > 0 &&
              value.fields.filter((other) => other.key === field.key).length > 1

            return (
              <div key={index} className={styles.slot}>
                <input
                  type="text"
                  className={isDuplicate ? `${styles.fieldNameInput} ${styles.duplicate}` : styles.fieldNameInput}
                  placeholder="Field name"
                  value={field.key}
                  onChange={(event) => {
                    const nextFields = [...value.fields]
                    nextFields[index] = { ...field, key: event.target.value }
                    onChange({ ...value, fields: nextFields })
                  }}
                />
                <SchemaNodeEditor
                  value={field.typeRef}
                  onChange={(typeRef) => {
                    const nextFields = [...value.fields]
                    nextFields[index] = { ...field, typeRef }
                    onChange({ ...value, fields: nextFields })
                  }}
                  availableCustomTypes={availableCustomTypes}
                  ownerId={ownerId}
                  resolveCustomType={resolveCustomType}
                />
                <button
                  type="button"
                  className={styles.removeButton}
                  aria-label={`Remove field ${field.key || index + 1}`}
                  onClick={() =>
                    onChange({ ...value, fields: value.fields.filter((_, i) => i !== index) })
                  }
                >
                  <Icon name="close" size={12} />
                </button>
              </div>
            )
          })}
          {value.fields.some(
            (field, index) =>
              field.key.trim().length > 0 &&
              value.fields.findIndex((other) => other.key === field.key) !== index,
          ) && <p className={styles.warning}>Field names must be unique.</p>}
          <button
            type="button"
            className={styles.addButton}
            onClick={() =>
              onChange({
                ...value,
                fields: [...value.fields, { key: '', typeRef: { kind: 'primitive', primitive: 'text' } }],
              })
            }
          >
            <Icon name="add" size={14} /> Add field
          </button>
        </div>
      )}
    </div>
  )
}
