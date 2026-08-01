import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import { listFolderAncestors, moveFolder } from '../../domain/folders/folderRepository'
import { FolderTreeChildren } from './FolderTreeChildren'
import { useExpandedFolders, useAutoExpandActiveFolder } from './useExpandedFolders'
import styles from './FolderTree.module.css'

interface FolderTreeProps {
  activeFolderId: string | null
  activeNotebookId: string | null
}

const ROOT_DROP_ID = '__root__'

function RootDropZone() {
  const { setNodeRef, isOver } = useDroppable({ id: ROOT_DROP_ID })
  return (
    <div
      ref={setNodeRef}
      className={isOver ? `${styles.rootDropZone} ${styles.dropTarget}` : styles.rootDropZone}
    >
      <Link to="/" className={styles.link}>
        Home
      </Link>
    </div>
  )
}

export function FolderTree({ activeFolderId, activeNotebookId }: FolderTreeProps) {
  const { expandedIds, toggle, expandAll } = useExpandedFolders()
  const [moveError, setMoveError] = useState<string | null>(null)

  const activeAncestors = useLiveQuery(
    () => (activeFolderId ? listFolderAncestors(activeFolderId) : Promise.resolve([])),
    [activeFolderId],
  )
  const idsToExpand = activeFolderId
    ? [...(activeAncestors ?? []).map((folder) => folder.id), activeFolderId]
    : []
  useAutoExpandActiveFolder(expandAll, idsToExpand)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor),
  )

  const handleDragEnd = async (event: DragEndEvent) => {
    const overId = event.over?.id
    if (overId === undefined) return

    const folderId = String(event.active.id)
    const newParentFolderId = overId === ROOT_DROP_ID ? null : String(overId)
    if (newParentFolderId === folderId) return

    try {
      await moveFolder(folderId, newParentFolderId)
      setMoveError(null)
    } catch (err) {
      setMoveError(err instanceof Error ? err.message : 'Could not move folder')
    }
  }

  return (
    <div className={styles.tree}>
      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <RootDropZone />
        <FolderTreeChildren
          parentFolderId={null}
          depth={0}
          activeFolderId={activeFolderId}
          activeNotebookId={activeNotebookId}
          expandedIds={expandedIds}
          onToggle={toggle}
        />
      </DndContext>
      {moveError && <p className={styles.error}>{moveError}</p>}
    </div>
  )
}
