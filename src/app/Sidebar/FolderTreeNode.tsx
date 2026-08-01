import { Link } from 'react-router-dom'
import { useDraggable, useDroppable } from '@dnd-kit/core'
import { Icon } from '../../components/Icon/Icon'
import type { Folder } from '../../domain/entities.types'
import { getRowPaddingLeft } from '../common/treeIndent'
import { FolderTreeChildren } from './FolderTreeChildren'
import styles from './FolderTree.module.css'

interface FolderTreeNodeProps {
  folder: Folder
  depth: number
  activeFolderId: string | null
  activeNotebookId: string | null
  expandedIds: Set<string>
  onToggle: (folderId: string) => void
}

export function FolderTreeNode({
  folder,
  depth,
  activeFolderId,
  activeNotebookId,
  expandedIds,
  onToggle,
}: FolderTreeNodeProps) {
  const expanded = expandedIds.has(folder.id)
  const isActive = folder.id === activeFolderId
  const {
    attributes,
    listeners,
    setNodeRef: setDragRef,
    isDragging,
  } = useDraggable({
    id: folder.id,
  })
  const { setNodeRef: setDropRef, isOver } = useDroppable({ id: folder.id })

  const rowClassNames = [styles.row, isActive && styles.active, isOver && styles.dropTarget]
    .filter(Boolean)
    .join(' ')

  return (
    <li>
      <div
        ref={setDropRef}
        className={rowClassNames}
        style={{ paddingLeft: `${getRowPaddingLeft(depth)}px`, opacity: isDragging ? 0.5 : 1 }}
      >
        <button
          type="button"
          className={styles.toggle}
          aria-label={expanded ? `Collapse ${folder.title}` : `Expand ${folder.title}`}
          aria-expanded={expanded}
          onClick={() => onToggle(folder.id)}
        >
          <Icon name={expanded ? 'chevronDown' : 'chevronRight'} size={12} />
        </button>
        <Icon name="folder" size={12} className={styles.rowIcon} />
        <Link to={`/folders/${folder.id}`} className={styles.link}>
          {folder.title}
        </Link>
        <button
          ref={setDragRef}
          type="button"
          className={styles.gripButton}
          aria-label={`Move ${folder.title}`}
          {...attributes}
          {...listeners}
        >
          <Icon name="grip" size={12} />
        </button>
      </div>
      {expanded && (
        <FolderTreeChildren
          parentFolderId={folder.id}
          depth={depth + 1}
          activeFolderId={activeFolderId}
          activeNotebookId={activeNotebookId}
          expandedIds={expandedIds}
          onToggle={onToggle}
        />
      )}
    </li>
  )
}
