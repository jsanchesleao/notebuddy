import { useEffect, useState } from 'react'
import { scanTagUsage } from '../../domain/tags/tagUsageClient'
import { deleteTags } from '../../domain/tags/tagRepository'
import { Modal } from '../../components/Modal/Modal'
import { TagUsageList } from './TagUsageList'
import type { TagUsage } from '../../domain/tags/tagUsage'
import styles from './ManageTagsModal.module.css'

interface ManageTagsModalProps {
  onClose: () => void
}

const TITLE_ID = 'manage-tags-modal-title'

// Always mounted fresh by the caller (conditionally rendered, not toggled via an `open`
// prop) so it starts a scan on every open without needing an effect to reset stale state.
export function ManageTagsModal({ onClose }: ManageTagsModalProps) {
  const [usage, setUsage] = useState<TagUsage[] | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [confirmingUnused, setConfirmingUnused] = useState(false)
  const [bulkError, setBulkError] = useState<string | null>(null)
  // Bumped to re-trigger the scan effect after a mutation, rather than calling a
  // setState-holding function synchronously from inside the effect body.
  const [refreshToken, setRefreshToken] = useState(0)
  const refresh = () => {
    setLoadError(null)
    setRefreshToken((token) => token + 1)
  }

  useEffect(() => {
    let cancelled = false

    scanTagUsage()
      .then((data) => {
        if (!cancelled) setUsage(data)
      })
      .catch((err) => {
        if (!cancelled)
          setLoadError(err instanceof Error ? err.message : 'Failed to load tag usage')
      })

    return () => {
      cancelled = true
    }
  }, [refreshToken])

  const filtered = (usage ?? []).filter((tag) =>
    tag.name.toLowerCase().includes(search.trim().toLowerCase()),
  )
  const unusedNames = (usage ?? []).filter((tag) => tag.count === 0).map((tag) => tag.name)

  const handleRemoveUnused = async () => {
    setBulkError(null)
    try {
      await deleteTags(unusedNames)
      setConfirmingUnused(false)
      refresh()
    } catch (err) {
      setBulkError(err instanceof Error ? err.message : 'Failed to remove unused tags')
    }
  }

  return (
    <Modal open onClose={onClose} labelledBy={TITLE_ID}>
      <div className={styles.panel}>
        <h2 id={TITLE_ID} className={styles.heading}>
          Manage Tags
        </h2>

        <input
          type="text"
          className={styles.search}
          placeholder="Search tags…"
          aria-label="Search tags"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />

        {loadError && <p className={styles.error}>{loadError}</p>}
        {!loadError && usage === null && <p className={styles.status}>Scanning notes…</p>}
        {!loadError && usage !== null && usage.length === 0 && (
          <p className={styles.status}>No tags yet.</p>
        )}
        {!loadError && usage !== null && usage.length > 0 && (
          <TagUsageList tags={filtered} onMutated={refresh} />
        )}

        <div className={styles.actions}>
          {confirmingUnused ? (
            <>
              <button type="button" className={styles.confirmDelete} onClick={handleRemoveUnused}>
                Confirm remove {unusedNames.length} unused tag
                {unusedNames.length === 1 ? '' : 's'}
              </button>
              <button
                type="button"
                className={styles.cancel}
                onClick={() => setConfirmingUnused(false)}
              >
                Cancel
              </button>
            </>
          ) : (
            <button
              type="button"
              className={styles.removeUnused}
              disabled={unusedNames.length === 0}
              onClick={() => setConfirmingUnused(true)}
            >
              Remove unused tags ({unusedNames.length})
            </button>
          )}
        </div>
        {bulkError && <p className={styles.error}>{bulkError}</p>}
      </div>
    </Modal>
  )
}
