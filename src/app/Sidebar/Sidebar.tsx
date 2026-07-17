import { useLiveQuery } from 'dexie-react-hooks'
import { Link } from 'react-router-dom'
import { SidebarSection } from './SidebarSection'
import { getFolder, listFoldersByParent } from '../../domain/folders/folderRepository'
import { listNotebooksByFolder } from '../../domain/notebooks/notebookRepository'
import { listBoardsByFolder } from '../../domain/boards/boardRepository'
import styles from './Sidebar.module.css'

interface SidebarProps {
  open: boolean
  currentFolderId: string | null
}

export function Sidebar({ open, currentFolderId }: SidebarProps) {
  const folders = useLiveQuery(() => listFoldersByParent(currentFolderId), [currentFolderId])
  const notebooks = useLiveQuery(() => listNotebooksByFolder(currentFolderId), [currentFolderId])
  const boards = useLiveQuery(() => listBoardsByFolder(currentFolderId), [currentFolderId])
  const currentFolder = useLiveQuery(
    () => (currentFolderId ? getFolder(currentFolderId) : Promise.resolve(null)),
    [currentFolderId],
  )

  const upTo =
    currentFolderId && currentFolder
      ? currentFolder.parentFolderId
        ? `/folders/${currentFolder.parentFolderId}`
        : '/'
      : null

  return (
    <nav className={`${styles.sidebar} ${open ? styles.open : ''}`} aria-label="Primary">
      {upTo && (
        <Link to={upTo} className={styles.upLink}>
          ↑ Up
        </Link>
      )}
      <SidebarSection title="Folders">
        {folders?.length ? (
          <ul className={styles.list}>
            {folders.map((folder) => (
              <li key={folder.id}>
                <Link to={`/folders/${folder.id}`} className={styles.link}>
                  {folder.title}
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className={styles.empty}>No folders yet</p>
        )}
      </SidebarSection>
      <SidebarSection title="Notebooks">
        {notebooks?.length ? (
          <ul className={styles.list}>
            {notebooks.map((notebook) => (
              <li key={notebook.id}>
                <Link to={`/notebooks/${notebook.id}`} className={styles.link}>
                  {notebook.title}
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className={styles.empty}>No notebooks yet</p>
        )}
      </SidebarSection>
      <SidebarSection title="Boards">
        {boards?.length ? (
          <ul className={styles.list}>
            {boards.map((board) => (
              <li key={board.id}>
                <span className={styles.link}>{board.title}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className={styles.empty}>No boards yet</p>
        )}
      </SidebarSection>
    </nav>
  )
}
