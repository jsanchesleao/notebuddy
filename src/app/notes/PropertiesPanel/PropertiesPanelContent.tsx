import { useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { listCustomDataTypes } from '../../../domain/dataTypes/dataTypeRepository'
import { Icon } from '../../../components/Icon/Icon'
import { TagsEditor } from './TagsEditor'
import { PropertyRow } from './PropertyRow'
import { AddPropertyControl } from './AddPropertyControl'
import { AddMenuButton, type AddAction } from './AddMenuButton'
import type { Note } from '../../../domain/entities.types'
import styles from './PropertiesPanelContent.module.css'

interface PropertiesPanelContentProps {
  note: Note
  mode: 'drawer' | 'modal'
  onDetach: () => void
  onClose: () => void
  showDetachToggle: boolean
  titleId: string
}

export function PropertiesPanelContent({
  note,
  mode,
  onDetach,
  onClose,
  showDetachToggle,
  titleId,
}: PropertiesPanelContentProps) {
  const customTypes = useLiveQuery(() => listCustomDataTypes(), [], [])
  const resolveCustomType = (id: string) => customTypes?.find((type) => type.id === id)
  const propertyEntries = Object.entries(note.metadata.properties)

  const [activeAction, setActiveAction] = useState<AddAction | null>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)

  return (
    <>
      <div className={styles.header}>
        <h2 id={titleId} className={styles.heading}>
          Properties
        </h2>
        <div className={styles.actions}>
          <AddMenuButton
            activeAction={activeAction}
            onSelect={setActiveAction}
            onCloseActive={() => setActiveAction(null)}
            triggerRef={triggerRef}
          />
          {showDetachToggle && (
            <button
              type="button"
              className={styles.iconButton}
              aria-label={
                mode === 'drawer'
                  ? 'Open properties in a separate window'
                  : 'Dock properties to sidebar'
              }
              onClick={onDetach}
            >
              <Icon name="detach" size={16} />
            </button>
          )}
          <button
            type="button"
            className={styles.iconButton}
            aria-label="Close properties"
            onClick={onClose}
          >
            <Icon name="close" size={16} />
          </button>
        </div>
      </div>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Tags</h3>
        <TagsEditor
          noteId={note.id}
          tags={note.metadata.tags}
          isAdding={activeAction === 'tag'}
          onCancelAdd={() => setActiveAction(null)}
          ignoreRef={triggerRef}
        />
      </section>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Properties</h3>
        {propertyEntries.length === 0 && <p className={styles.empty}>No properties yet.</p>}
        {propertyEntries.map(([key, property]) => (
          <PropertyRow
            key={key}
            noteId={note.id}
            propertyKey={key}
            property={property}
            resolveCustomType={resolveCustomType}
            availableCustomTypes={customTypes ?? []}
            mode={mode}
          />
        ))}
        {activeAction === 'property' && (
          <AddPropertyControl
            noteId={note.id}
            existingKeys={Object.keys(note.metadata.properties)}
            availableCustomTypes={customTypes ?? []}
            onCancel={() => setActiveAction(null)}
            ignoreRef={triggerRef}
          />
        )}
      </section>
    </>
  )
}
