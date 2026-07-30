import { useState } from 'react'
import {
  createCustomDataType,
  deleteCustomDataType,
  updateCustomDataType,
} from '../../domain/dataTypes/dataTypeRepository'
import { isOptionSetSchema } from '../../domain/dataTypes/optionSets'
import { DismissableDropdown } from '../../components/Menu/DismissableDropdown'
import { OptionSetForm } from './OptionSetForm'
import { Icon } from '../../components/Icon/Icon'
import type { CustomDataType, SelectOption } from '../../domain/entities.types'
import styles from './OptionSetPicker.module.css'

interface OptionSetPickerProps {
  availableCustomTypes: CustomDataType[]
  value: string | null
  onChange: (customTypeId: string) => void
}

function optionsOf(type: CustomDataType): SelectOption[] {
  return type.schema.kind === 'primitive' && type.schema.primitive === 'select'
    ? (type.schema.options ?? [])
    : []
}

export function OptionSetPicker({ availableCustomTypes, value, onChange }: OptionSetPickerProps) {
  const optionSets = availableCustomTypes.filter((type) => isOptionSetSchema(type.schema))
  const active = optionSets.find((type) => type.id === value)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const editingType = optionSets.find((type) => type.id === editingId)

  const resetDrafts = () => {
    setEditingId(null)
    setCreating(false)
    setConfirmingDeleteId(null)
    setDeleteError(null)
  }

  const startEditing = (type: CustomDataType) => {
    setCreating(false)
    setEditingId(type.id)
    setDeleteError(null)
  }

  const startCreating = () => {
    setEditingId(null)
    setCreating(true)
    setDeleteError(null)
  }

  const handleSaveEdit = async (name: string, options: SelectOption[]) => {
    if (!editingId) return
    await updateCustomDataType(editingId, {
      name,
      schema: { kind: 'primitive', primitive: 'select', options },
    })
    resetDrafts()
  }

  const handleCreate = async (name: string, options: SelectOption[]) => {
    const created = await createCustomDataType({
      name,
      schema: { kind: 'primitive', primitive: 'select', options },
    })
    resetDrafts()
    onChange(created.id)
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteCustomDataType(id)
      resetDrafts()
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Failed to delete')
    }
  }

  return (
    <DismissableDropdown
      trigger={({ toggle, open }) => (
        <button
          type="button"
          className={styles.trigger}
          aria-expanded={open}
          onClick={() => {
            resetDrafts()
            toggle()
          }}
        >
          {active?.name ?? 'Choose an option set…'}
          <Icon name="chevronDown" size={12} />
        </button>
      )}
    >
      {({ close }) => (
        <div className={styles.menu}>
          {optionSets.length === 0 && !creating && (
            <p className={styles.empty}>No option sets yet.</p>
          )}
          <ul className={styles.list}>
            {optionSets.map((type) => (
              <li key={type.id} className={styles.item}>
                {editingId === type.id && editingType ? (
                  <OptionSetForm
                    initialName={editingType.name}
                    initialOptions={optionsOf(editingType)}
                    nameLabel="Option set name"
                    submitLabel="Save changes"
                    onSubmit={handleSaveEdit}
                    onCancel={resetDrafts}
                  />
                ) : (
                  <div className={styles.row}>
                    <button
                      type="button"
                      role="menuitemradio"
                      aria-checked={type.id === value}
                      className={styles.selectButton}
                      onClick={() => {
                        onChange(type.id)
                        close()
                      }}
                    >
                      {type.name}
                    </button>
                    <button
                      type="button"
                      className={styles.iconButton}
                      aria-label={`Edit ${type.name}`}
                      onClick={() => startEditing(type)}
                    >
                      <Icon name="edit" size={12} />
                    </button>
                    {confirmingDeleteId === type.id ? (
                      <>
                        <button
                          type="button"
                          className={styles.confirmDelete}
                          onClick={() => handleDelete(type.id)}
                        >
                          Confirm
                        </button>
                        <button
                          type="button"
                          className={styles.iconButton}
                          aria-label="Cancel delete"
                          onClick={() => setConfirmingDeleteId(null)}
                        >
                          <Icon name="close" size={12} />
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        className={styles.iconButton}
                        aria-label={`Delete ${type.name}`}
                        onClick={() => setConfirmingDeleteId(type.id)}
                      >
                        <Icon name="delete" size={12} />
                      </button>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
          {creating ? (
            <OptionSetForm
              nameLabel="New option set name"
              submitLabel="Create set"
              onSubmit={handleCreate}
              onCancel={resetDrafts}
            />
          ) : (
            <button type="button" className={styles.addButton} onClick={startCreating}>
              <Icon name="add" size={14} /> New option set
            </button>
          )}
          {deleteError && <p className={styles.error}>{deleteError}</p>}
        </div>
      )}
    </DismissableDropdown>
  )
}
