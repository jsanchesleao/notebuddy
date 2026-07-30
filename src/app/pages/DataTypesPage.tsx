import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { listCustomDataTypes } from '../../domain/dataTypes/dataTypeRepository'
import { isOptionSetSchema } from '../../domain/dataTypes/optionSets'
import { listNoteTypes } from '../../domain/noteTypes/noteTypeRepository'
import { CustomDataTypeList } from '../dataTypes/CustomDataTypeList'
import { CustomDataTypeBuilder } from '../dataTypes/CustomDataTypeBuilder'
import { OptionSetList } from '../dataTypes/OptionSetList'
import { OptionSetEditor } from '../dataTypes/OptionSetEditor'
import { NoteTypeList } from '../dataTypes/NoteTypeList'
import { NoteTypeEditor } from '../dataTypes/NoteTypeEditor'
import { Icon } from '../../components/Icon/Icon'
import type { CustomDataType, NoteType } from '../../domain/entities.types'
import styles from './DataTypesPage.module.css'

type EditingCustomType = 'new' | CustomDataType | null
type EditingNoteType = 'new' | NoteType | null

export function DataTypesPage() {
  const customTypes = useLiveQuery(() => listCustomDataTypes(), [], [])
  const noteTypes = useLiveQuery(() => listNoteTypes(), [], [])
  const [editingCustomType, setEditingCustomType] = useState<EditingCustomType>(null)
  const [editingOptionSet, setEditingOptionSet] = useState<EditingCustomType>(null)
  const [editingNoteType, setEditingNoteType] = useState<EditingNoteType>(null)

  const resolveCustomType = (id: string) => customTypes?.find((type) => type.id === id)
  const dictionaryCustomTypes = (customTypes ?? []).filter(
    (type) => type.schema.kind === 'dictionary',
  )
  // Option Sets (select-shaped custom types) are managed through their own section below, not
  // this generic builder — its root SchemaNodeEditor restricts the top-level kind to
  // composites, so a primitive-select type can't be represented there.
  const manageableCustomTypes = (customTypes ?? []).filter(
    (type) => !isOptionSetSchema(type.schema),
  )
  const optionSets = (customTypes ?? []).filter((type) => isOptionSetSchema(type.schema))

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Data Types</h1>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Custom Data Types</h2>
          {!editingCustomType && (
            <button
              type="button"
              className={styles.addButton}
              onClick={() => setEditingCustomType('new')}
            >
              <Icon name="add" size={14} /> New type
            </button>
          )}
        </div>

        {editingCustomType && (
          <CustomDataTypeBuilder
            editing={editingCustomType === 'new' ? null : editingCustomType}
            availableCustomTypes={customTypes ?? []}
            resolveCustomType={resolveCustomType}
            onDone={() => setEditingCustomType(null)}
          />
        )}

        <CustomDataTypeList types={manageableCustomTypes} onEdit={setEditingCustomType} />
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Option Sets</h2>
          {!editingOptionSet && (
            <button
              type="button"
              className={styles.addButton}
              onClick={() => setEditingOptionSet('new')}
            >
              <Icon name="add" size={14} /> New option set
            </button>
          )}
        </div>

        {editingOptionSet && (
          <OptionSetEditor
            editing={editingOptionSet === 'new' ? null : editingOptionSet}
            onDone={() => setEditingOptionSet(null)}
          />
        )}

        <OptionSetList types={optionSets} onEdit={setEditingOptionSet} />
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Note Types</h2>
          {!editingNoteType && (
            <button
              type="button"
              className={styles.addButton}
              onClick={() => setEditingNoteType('new')}
            >
              <Icon name="add" size={14} /> New note type
            </button>
          )}
        </div>

        {editingNoteType && (
          <NoteTypeEditor
            editing={editingNoteType === 'new' ? null : editingNoteType}
            dictionaryCustomTypes={dictionaryCustomTypes}
            onDone={() => setEditingNoteType(null)}
          />
        )}

        <NoteTypeList
          noteTypes={noteTypes ?? []}
          resolveCustomType={resolveCustomType}
          onEdit={setEditingNoteType}
        />
      </section>
    </div>
  )
}
