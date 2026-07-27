import { useLiveQuery } from 'dexie-react-hooks'
import { listCustomDataTypes } from '../../../domain/dataTypes/dataTypeRepository'
import { Drawer } from '../../../components/Drawer/Drawer'
import { Icon } from '../../../components/Icon/Icon'
import { TagsEditor } from './TagsEditor'
import { PropertyRow } from './PropertyRow'
import { AddPropertyControl } from './AddPropertyControl'
import type { Note } from '../../../domain/entities.types'
import styles from './PropertiesDrawer.module.css'

const TITLE_ID = 'properties-drawer-title'

interface PropertiesDrawerProps {
  note: Note
  open: boolean
  onClose: () => void
}

export function PropertiesDrawer({ note, open, onClose }: PropertiesDrawerProps) {
  const customTypes = useLiveQuery(() => listCustomDataTypes(), [], [])
  const resolveCustomType = (id: string) => customTypes?.find((type) => type.id === id)
  const propertyEntries = Object.entries(note.metadata.properties)

  return (
    <Drawer open={open} onClose={onClose} labelledBy={TITLE_ID}>
      <div className={styles.header}>
        <h2 id={TITLE_ID} className={styles.heading}>
          Properties
        </h2>
        <button
          type="button"
          className={styles.closeButton}
          aria-label="Close properties"
          onClick={onClose}
        >
          <Icon name="close" size={16} />
        </button>
      </div>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Tags</h3>
        <TagsEditor noteId={note.id} tags={note.metadata.tags} />
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
          />
        ))}
        <AddPropertyControl
          noteId={note.id}
          existingKeys={Object.keys(note.metadata.properties)}
          availableCustomTypes={customTypes ?? []}
        />
      </section>
    </Drawer>
  )
}
