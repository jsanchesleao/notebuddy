import { useState } from 'react'
import { moveFolder } from '../../domain/folders/folderRepository'
import { Modal } from '../../components/Modal/Modal'
import { FolderPickerTree } from './FolderPickerTree'
import styles from './FolderPickerModal.module.css'

interface FolderPickerModalProps {
  onClose: () => void
  folderId: string
  currentParentFolderId: string | null
}

const TITLE_ID = 'folder-picker-modal-title'

// Always mounted fresh by the caller (conditionally rendered, not toggled via an
// `open` prop) so its own state starts correct without needing an effect to reset it.
export function FolderPickerModal({
  onClose,
  folderId,
  currentParentFolderId,
}: FolderPickerModalProps) {
  const [selectedId, setSelectedId] = useState<string | null>(currentParentFolderId)
  const [error, setError] = useState<string | null>(null)

  const handleConfirm = async () => {
    try {
      await moveFolder(folderId, selectedId)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not move folder')
    }
  }

  return (
    <Modal open onClose={onClose} labelledBy={TITLE_ID}>
      <div className={styles.panel}>
        <h2 id={TITLE_ID} className={styles.heading}>
          Move folder
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
            disabledId={folderId}
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
