import { useLiveQuery } from 'dexie-react-hooks'
import { Link } from 'react-router-dom'
import { listFoldersByParent } from '../../domain/folders/folderRepository'
import { listNotebooksByFolder } from '../../domain/notebooks/notebookRepository'
import { listBoardsByFolder } from '../../domain/boards/boardRepository'
import { Icon } from '../../components/Icon/Icon'
import { getLeafPaddingLeft } from '../common/treeIndent'
import { FolderTreeNode } from './FolderTreeNode'
import styles from './FolderTree.module.css'

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
          <div
            className={
              notebook.id === activeNotebookId
                ? `${styles.leafRow} ${styles.active}`
                : styles.leafRow
            }
            style={{ paddingLeft: `${leafPaddingLeft}px` }}
          >
            <Icon name="book" size={12} className={styles.leafIcon} />
            <Link to={`/notebooks/${notebook.id}`} className={styles.link}>
              {notebook.title}
            </Link>
          </div>
        </li>
      ))}
      {boards?.map((board) => (
        <li key={board.id}>
          <div
            className={
              board.id === activeBoardId ? `${styles.leafRow} ${styles.active}` : styles.leafRow
            }
            style={{ paddingLeft: `${leafPaddingLeft}px` }}
          >
            <Icon name="board" size={12} className={styles.leafIcon} />
            <Link to={`/boards/${board.id}`} className={styles.link}>
              {board.title}
            </Link>
          </div>
        </li>
      ))}
    </ul>
  )
}
