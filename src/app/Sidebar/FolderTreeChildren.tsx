import { useLiveQuery } from 'dexie-react-hooks'
import { Link } from 'react-router-dom'
import { useDraggable } from '@dnd-kit/core'
import { listFoldersByParent } from '../../domain/folders/folderRepository'
import { listNotebooksByFolder } from '../../domain/notebooks/notebookRepository'
import { listBoardsByFolder } from '../../domain/boards/boardRepository'
import { Icon, type IconName } from '../../components/Icon/Icon'
import { getLeafPaddingLeft } from '../common/treeIndent'
import { FolderTreeNode } from './FolderTreeNode'
import styles from './FolderTree.module.css'

interface TreeLeafRowProps {
  dragId: string
  icon: IconName
  to: string
  title: string
  isActive: boolean
  paddingLeft: number
}

// Notebooks/boards are drag sources only (never valid drop targets, since neither can
// contain children) so this only wires useDraggable, unlike FolderTreeNode's drag+drop pair.
function TreeLeafRow({ dragId, icon, to, title, isActive, paddingLeft }: TreeLeafRowProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: dragId })
  const rowClassNames = [styles.leafRow, isActive && styles.active].filter(Boolean).join(' ')

  return (
    <div
      className={rowClassNames}
      style={{ paddingLeft: `${paddingLeft}px`, opacity: isDragging ? 0.5 : 1 }}
    >
      <Icon name={icon} size={12} className={styles.leafIcon} />
      <Link to={to} className={styles.link}>
        {title}
      </Link>
      <button
        ref={setNodeRef}
        type="button"
        className={styles.gripButton}
        aria-label={`Move ${title}`}
        {...attributes}
        {...listeners}
      >
        <Icon name="grip" size={12} />
      </button>
    </div>
  )
}

interface FolderTreeChildrenProps {
  parentFolderId: string | null
  depth: number
  activeFolderId: string | null
  activeNotebookId: string | null
  activeBoardId: string | null
  expandedIds: Set<string>
  onToggle: (folderId: string) => void
}

export function FolderTreeChildren({
  parentFolderId,
  depth,
  activeFolderId,
  activeNotebookId,
  activeBoardId,
  expandedIds,
  onToggle,
}: FolderTreeChildrenProps) {
  const folders = useLiveQuery(() => listFoldersByParent(parentFolderId), [parentFolderId])
  const notebooks = useLiveQuery(() => listNotebooksByFolder(parentFolderId), [parentFolderId])
  const boards = useLiveQuery(() => listBoardsByFolder(parentFolderId), [parentFolderId])

  const isEmpty = !folders?.length && !notebooks?.length && !boards?.length
  if (isEmpty) {
    return depth === 0 ? <p className={styles.empty}>No folders yet</p> : null
  }

  const leafPaddingLeft = getLeafPaddingLeft(depth)

  return (
    <ul className={styles.list}>
      {folders?.map((folder) => (
        <FolderTreeNode
          key={folder.id}
          folder={folder}
          depth={depth}
          activeFolderId={activeFolderId}
          activeNotebookId={activeNotebookId}
          activeBoardId={activeBoardId}
          expandedIds={expandedIds}
          onToggle={onToggle}
        />
      ))}
      {notebooks?.map((notebook) => (
        <li key={notebook.id}>
          <TreeLeafRow
            dragId={`notebook:${notebook.id}`}
            icon="book"
            to={`/notebooks/${notebook.id}`}
            title={notebook.title}
            isActive={notebook.id === activeNotebookId}
            paddingLeft={leafPaddingLeft}
          />
        </li>
      ))}
      {boards?.map((board) => (
        <li key={board.id}>
          <TreeLeafRow
            dragId={`board:${board.id}`}
            icon="board"
            to={`/boards/${board.id}`}
            title={board.title}
            isActive={board.id === activeBoardId}
            paddingLeft={leafPaddingLeft}
          />
        </li>
      ))}
    </ul>
  )
}
