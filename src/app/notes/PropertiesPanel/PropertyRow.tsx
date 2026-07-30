import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
  type ReactNode,
} from 'react'
import { removeNoteProperty, setNoteProperty } from '../../../domain/notes/noteRepository'
import { PropertyValueEditor } from '../../propertyValues/PropertyValueEditor'
import { PrimitiveValueDisplay } from '../../propertyValues/PrimitiveValueDisplay'
import { SelectOptionsEditor } from '../../propertyValues/SelectOptionsEditor'
import {
  resolveSimplePrimitiveKind,
  type SimplePrimitiveKind,
} from '../../propertyValues/resolveSimplePrimitiveKind'
import { TextValueEditor } from '../../propertyValues/TextValueEditor'
import { NumberValueEditor } from '../../propertyValues/NumberValueEditor'
import { LinkValueEditor } from '../../propertyValues/LinkValueEditor'
import { DismissableDropdown } from '../../../components/Menu/DismissableDropdown'
import { Icon } from '../../../components/Icon/Icon'
import type {
  CustomDataType,
  DataTypeRef,
  PropertyValue,
  PropertyValueData,
  SelectOption,
} from '../../../domain/entities.types'
import styles from './PropertyRow.module.css'

interface PropertyRowProps {
  noteId: string
  propertyKey: string
  property: PropertyValue
  resolveCustomType: (id: string) => CustomDataType | undefined
  availableCustomTypes: CustomDataType[]
  mode: 'drawer' | 'modal'
}

export function PropertyRow({
  noteId,
  propertyKey,
  property,
  resolveCustomType,
  availableCustomTypes,
  mode,
}: PropertyRowProps) {
  const simpleKind = resolveSimplePrimitiveKind(property.typeRef, resolveCustomType)

  if (simpleKind) {
    return (
      <SimplePropertyRow
        noteId={noteId}
        propertyKey={propertyKey}
        property={property}
        kind={simpleKind}
        mode={mode}
      />
    )
  }

  return (
    <LiveEditPropertyRow
      noteId={noteId}
      propertyKey={propertyKey}
      property={property}
      resolveCustomType={resolveCustomType}
      availableCustomTypes={availableCustomTypes}
      mode={mode}
    />
  )
}

// Shared row chrome: key label + value area on one line (in modal mode) or stacked below them
// (in drawer mode — the drawer is always narrow, so it never gets the inline layout, see
// PropertyRow.module.css) with a hover/touch-revealed actions group, and an optional error line
// underneath.
interface PropertyRowLayoutProps {
  propertyKey: string
  value: ReactNode
  actions: ReactNode
  error: string | null
  mode: 'drawer' | 'modal'
}

function PropertyRowLayout({ propertyKey, value, actions, error, mode }: PropertyRowLayoutProps) {
  return (
    <div className={styles.row} data-mode={mode}>
      <div className={styles.mainLine}>
        <div className={styles.content}>
          <span className={styles.key}>{propertyKey}</span>
          <div className={styles.value}>{value}</div>
        </div>
        <div className={styles.actions}>{actions}</div>
      </div>
      {error && <p className={styles.error}>{error}</p>}
    </div>
  )
}

// `localValue`/`localTypeRef` are intentionally initialized once and never resynced from the
// `property` prop while mounted (React keeps this component instance alive across re-renders
// as long as `propertyKey` — its list `key` — doesn't change, per PropertiesPanelContent).
// Resyncing on every prop change would race the async round-trip through
// setNoteProperty/useLiveQuery: a stale echo of an earlier keystroke could land after a later
// one and clobber it, dropping characters while typing quickly into an auto-saving field.
// This applies to boolean/select/date/time/datetime/color and composite properties, all of
// which stay always-live (no view/edit split) — see SimplePropertyRow for text/number/link.
function LiveEditPropertyRow({
  noteId,
  propertyKey,
  property,
  resolveCustomType,
  availableCustomTypes,
  mode,
}: PropertyRowProps) {
  const [localValue, setLocalValue] = useState(property.value)
  const [localTypeRef, setLocalTypeRef] = useState(property.typeRef)
  const [error, setError] = useState<string | null>(null)

  const handleChange = async (nextValue: PropertyValueData) => {
    setLocalValue(nextValue)
    try {
      await setNoteProperty(noteId, propertyKey, { typeRef: localTypeRef, value: nextValue })
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid value')
    }
  }

  // Used by a dictionary property to add/rename/retype/remove/reorder its own fields —
  // typeRef and value must persist together in one call, since the schema validator
  // rejects a value whose keys don't exactly match the declared fields.
  const handleSchemaChange = async (nextTypeRef: DataTypeRef, nextValue: PropertyValueData) => {
    setLocalTypeRef(nextTypeRef)
    setLocalValue(nextValue)
    try {
      await setNoteProperty(noteId, propertyKey, { typeRef: nextTypeRef, value: nextValue })
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid value')
    }
  }

  // Options only editable here for an ad hoc select — its typeRef is privately owned by this
  // note. A customTypeRef-backed select shares its options with every note referencing it, so
  // it's edited from the Option Set picker instead, never from an individual note's row.
  const isAdHocSelect = localTypeRef.kind === 'primitive' && localTypeRef.primitive === 'select'

  const handleOptionsChange = (nextOptions: SelectOption[]) => {
    if (localTypeRef.kind !== 'primitive' || localTypeRef.primitive !== 'select') return
    const nextTypeRef: DataTypeRef = { ...localTypeRef, options: nextOptions }
    // Removing the currently-selected option would otherwise make this single write fail
    // schema validation (value must match one of the declared options), so clear it here —
    // this only ever affects the one note being edited, never other notes.
    const stillValid =
      typeof localValue === 'string' && nextOptions.some((option) => option.value === localValue)
    handleSchemaChange(nextTypeRef, stillValid ? localValue : null)
  }

  return (
    <PropertyRowLayout
      propertyKey={propertyKey}
      value={
        <PropertyValueEditor
          typeRef={localTypeRef}
          value={localValue}
          onChange={handleChange}
          onSchemaChange={handleSchemaChange}
          resolveCustomType={resolveCustomType}
          availableCustomTypes={availableCustomTypes}
        />
      }
      actions={
        <>
          {isAdHocSelect && (
            <DismissableDropdown
              trigger={({ toggle, open }) => (
                <button
                  type="button"
                  className={styles.actionButton}
                  aria-label={`Edit options for ${propertyKey}`}
                  aria-expanded={open}
                  onClick={toggle}
                >
                  <Icon name="edit" size={12} />
                </button>
              )}
              menuClassName={styles.optionsPopover}
            >
              {() => (
                <SelectOptionsEditor
                  options={localTypeRef.kind === 'primitive' ? (localTypeRef.options ?? []) : []}
                  onChange={handleOptionsChange}
                />
              )}
            </DismissableDropdown>
          )}
          <button
            type="button"
            className={styles.actionButton}
            aria-label={`Remove property ${propertyKey}`}
            onClick={() => removeNoteProperty(noteId, propertyKey)}
          >
            <Icon name="close" size={12} />
          </button>
        </>
      }
      error={error}
      mode={mode}
    />
  )
}

// Text/Number/Link properties render as plain content (or a clickable link) by default and only
// mount an input once the user clicks the edit icon. Edits are a discrete draft, committed on
// blur/Enter and discarded on Escape — since view mode always reads the live `property` prop
// directly, there's no stale-resync hazard to guard against here (unlike LiveEditPropertyRow).
interface SimplePropertyRowProps {
  noteId: string
  propertyKey: string
  property: PropertyValue
  kind: SimplePrimitiveKind
  mode: 'drawer' | 'modal'
}

function SimplePropertyRow({ noteId, propertyKey, property, kind, mode }: SimplePropertyRowProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [draftValue, setDraftValue] = useState<PropertyValueData>(property.value)
  const [error, setError] = useState<string | null>(null)
  const formRef = useRef<HTMLFormElement>(null)
  const cancelledRef = useRef(false)

  useEffect(() => {
    if (!isEditing) return
    const input = formRef.current?.querySelector('input')
    input?.focus()
    input?.select()
  }, [isEditing])

  const startEditing = () => {
    setDraftValue(property.value)
    setError(null)
    cancelledRef.current = false
    setIsEditing(true)
  }

  const commit = async (): Promise<boolean> => {
    try {
      await setNoteProperty(noteId, propertyKey, { typeRef: property.typeRef, value: draftValue })
      setError(null)
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid value')
      return false
    }
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (await commit()) setIsEditing(false)
  }

  const handleBlur = async () => {
    if (cancelledRef.current) {
      cancelledRef.current = false
      return
    }
    if (await commit()) setIsEditing(false)
  }

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      cancelledRef.current = true
      setError(null)
      setIsEditing(false)
    }
  }

  return (
    <PropertyRowLayout
      propertyKey={propertyKey}
      value={
        isEditing ? (
          /* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions --
             onBlur/onKeyDown manage the commit/cancel lifecycle of the actual interactive
             element (the <input> rendered inside by SimplePrimitiveEditor), not the form itself. */
          <form
            ref={formRef}
            noValidate
            onSubmit={handleSubmit}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
          >
            <SimplePrimitiveEditor kind={kind} value={draftValue} onChange={setDraftValue} />
          </form>
        ) : (
          <PrimitiveValueDisplay kind={kind} value={property.value} />
        )
      }
      actions={
        <>
          {!isEditing && (
            <button
              type="button"
              className={styles.actionButton}
              aria-label={`Edit property ${propertyKey}`}
              onClick={startEditing}
            >
              <Icon name="edit" size={12} />
            </button>
          )}
          <button
            type="button"
            className={styles.actionButton}
            aria-label={`Remove property ${propertyKey}`}
            onClick={() => removeNoteProperty(noteId, propertyKey)}
          >
            <Icon name="close" size={12} />
          </button>
        </>
      }
      error={error}
      mode={mode}
    />
  )
}

interface SimplePrimitiveEditorProps {
  kind: SimplePrimitiveKind
  value: PropertyValueData
  onChange: (value: PropertyValueData) => void
}

function SimplePrimitiveEditor({ kind, value, onChange }: SimplePrimitiveEditorProps) {
  switch (kind) {
    case 'text':
      return <TextValueEditor value={typeof value === 'string' ? value : ''} onChange={onChange} />
    case 'number':
      return (
        <NumberValueEditor value={typeof value === 'number' ? value : null} onChange={onChange} />
      )
    case 'link':
      return <LinkValueEditor value={typeof value === 'string' ? value : ''} onChange={onChange} />
  }
}
