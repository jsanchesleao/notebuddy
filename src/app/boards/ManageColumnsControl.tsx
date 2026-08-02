import { useState } from 'react'
import { DismissableDropdown } from '../../components/Menu/DismissableDropdown'
import { OptionSetForm } from '../dataTypes/OptionSetForm'
import { Icon } from '../../components/Icon/Icon'
import {
  applyColumnEdits,
  findOtherStatusTypeReferences,
} from '../../domain/boards/boardRepository'
import type { Board, CustomDataType, SelectOption } from '../../domain/entities.types'
import styles from './ManageColumnsControl.module.css'

interface ManageColumnsControlProps {
  board: Board
  customType: CustomDataType
}

interface PendingRemoval {
  name: string
  options: SelectOption[]
  removedOptions: SelectOption[]
  otherReferenceWarning: string | null
}

function optionsOf(customType: CustomDataType): SelectOption[] {
  return customType.schema.kind === 'primitive' && customType.schema.primitive === 'select'
    ? (customType.schema.options ?? [])
    : []
}

// Wraps the shared OptionSetForm (add/rename/delete options) with board-specific glue: when
// a save would remove an option that's still in use, this intercepts before calling the
// repository and asks the user to pick a fallback column for each removed one first — the
// repository itself refuses a removal-with-cards that has no reassignment target.
export function ManageColumnsControl({ board, customType }: ManageColumnsControlProps) {
  const [pending, setPending] = useState<PendingRemoval | null>(null)
  const [reassignments, setReassignments] = useState<Map<string, string>>(new Map())
  const [error, setError] = useState<string | null>(null)

  // Returns true once the save is fully applied (no removal, so the dropdown can close);
  // false means a reassignment step is now showing instead and the dropdown must stay open.
  const handleSubmit = async (name: string, options: SelectOption[]): Promise<boolean> => {
    const currentOptions = optionsOf(customType)
    const nextIds = new Set(options.map((option) => option.id))
    const removedOptions = currentOptions.filter((option) => !nextIds.has(option.id))

    if (removedOptions.length === 0) {
      await applyColumnEdits(board.id, name, options)
      return true
    }

    const references = await findOtherStatusTypeReferences(board.id)
    const otherReferenceWarning =
      references.otherBoardCount > 0 || references.otherReferenceCount > 0
        ? `This column set is also used by ${references.otherBoardCount} other board(s) and ${references.otherReferenceCount} other propert(y/ies) — removing an option removes it there too.`
        : null

    setReassignments(new Map())
    setError(null)
    setPending({ name, options, removedOptions, otherReferenceWarning })
    return false
  }

  const confirmRemoval = async (): Promise<boolean> => {
    if (!pending) return false
    for (const option of pending.removedOptions) {
      if (!reassignments.has(option.id)) {
        setError('Choose a fallback column for every removed column first.')
        return false
      }
    }

    try {
      await applyColumnEdits(board.id, pending.name, pending.options, reassignments)
      setPending(null)
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update columns')
      return false
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
            setPending(null)
            setError(null)
            toggle()
          }}
        >
          <Icon name="properties" size={14} /> Manage columns
        </button>
      )}
    >
      {({ close }) =>
        pending ? (
          <div className={styles.panel}>
            {pending.otherReferenceWarning && (
              <p className={styles.warning}>{pending.otherReferenceWarning}</p>
            )}
            {pending.removedOptions.map((option) => (
              <div key={option.id} className={styles.reassignRow}>
                <span className={styles.reassignLabel}>
                  Reassign cards from &quot;{option.label}&quot; to
                </span>
                <select
                  className={styles.select}
                  aria-label={`Reassign cards from ${option.label} to`}
                  value={reassignments.get(option.id) ?? ''}
                  onChange={(event) => {
                    const next = new Map(reassignments)
                    next.set(option.id, event.target.value)
                    setReassignments(next)
                  }}
                >
                  <option value="" disabled>
                    Choose a column…
                  </option>
                  {pending.options.map((target) => (
                    <option key={target.id} value={target.id}>
                      {target.label}
                    </option>
                  ))}
                </select>
              </div>
            ))}
            <div className={styles.actions}>
              <button
                type="button"
                className={styles.confirmButton}
                onClick={async () => {
                  const done = await confirmRemoval()
                  if (done) close()
                }}
              >
                Confirm removal
              </button>
              <button
                type="button"
                className={styles.cancelButton}
                onClick={() => setPending(null)}
              >
                Cancel
              </button>
            </div>
            {error && <p className={styles.error}>{error}</p>}
          </div>
        ) : (
          <div className={styles.panel}>
            <OptionSetForm
              initialName={customType.name}
              initialOptions={optionsOf(customType)}
              nameLabel="Column set name"
              submitLabel="Save columns"
              onSubmit={async (name, options) => {
                const done = await handleSubmit(name, options)
                if (done) close()
              }}
              onCancel={close}
            />
          </div>
        )
      }
    </DismissableDropdown>
  )
}
