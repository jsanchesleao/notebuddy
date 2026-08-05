import { useState } from 'react'
import { Modal } from '../../components/Modal/Modal'
import { FolderPickerTree } from './FolderPickerTree'
import styles from './FolderPickerModal.module.css'

interface FolderPickerModalProps {
  onClose: () => void
  entityLabel: string
  currentParentFolderId: string | null
  onConfirm: (targetFolderId: string | null) => Promise<void>
  // Folder-only: prevents picking the folder itself or one of its descendants as the new
  // parent (would create a cycle). Notebooks/boards can't contain folders, so neither applies.
  disabledId?: string
}

const TITLE_ID = 'folder-picker-modal-title'

// Always mounted fresh by the caller (conditionally rendered, not toggled via an
// `open` prop) so its own state starts correct without needing an effect to reset it.
export function FolderPickerModal({
  onClose,
  entityLabel,
  currentParentFolderId,
  onConfirm,
  disabledId,
}: FolderPickerModalProps) {
  const [selectedId, setSelectedId] = useState<string | null>(currentParentFolderId)
  const [error, setError] = useState<string | null>(null)

  const handleConfirm = async () => {
    try {
      await onConfirm(selectedId)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : `Could not move ${entityLabel}`)
    }
  }

  return (
    <Modal open onClose={onClose} labelledBy={TITLE_ID}>
      <div className={styles.panel}>
        <h2 id={TITLE_ID} className={styles.heading}>
          Move {entityLabel}
        </h2>
        <div className={styles.tree}>
          <button
            type="button"
            className={selectedId === null ? `${styles.option} ${styles.selected}` : styles.option}
            onClick={() => setSelectedId(null)}
          >
            Top level
          </button>
          <FolderPickerTree
            parentFolderId={null}
            depth={0}
            disabledId={disabledId ?? ''}
            disabledSubtree={false}
            selectedId={selectedId}
            onSelect={setSelectedId}
          />
        </div>
        {error && <p className={styles.error}>{error}</p>}
        <div className={styles.actions}>
          <button type="button" className={styles.submit} onClick={handleConfirm}>
            Move here
          </button>
          <button type="button" className={styles.cancel} onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </Modal>
  )
}
