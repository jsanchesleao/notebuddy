import { Link } from 'react-router-dom'
import type { RouteKind } from '../routeContext'
import { SidebarFolderView } from './SidebarFolderView'
import { SidebarNotebookView } from './SidebarNotebookView'
import { SidebarNoteResolver } from './SidebarNoteResolver'
import { Icon } from '../../components/Icon/Icon'
import styles from './Sidebar.module.css'

interface SidebarProps {
  open: boolean
  routeKind: RouteKind
  folderId: string | null
  notebookId: string | null
  noteId: string | null
}

export function Sidebar({ open, routeKind, folderId, notebookId, noteId }: SidebarProps) {
  return (
    <nav className={`${styles.sidebar} ${open ? styles.open : ''}`} aria-label="Primary">
      {routeKind === 'notebook' && notebookId ? (
        <SidebarNotebookView notebookId={notebookId} activeNoteId={null} />
      ) : routeKind === 'note' && noteId ? (
        <SidebarNoteResolver noteId={noteId} />
      ) : (
        <SidebarFolderView currentFolderId={folderId} />
      )}
      <Link
        to="/data-types"
        className={routeKind === 'dataTypes' ? `${styles.dataTypesLink} ${styles.activeLink}` : styles.dataTypesLink}
      >
        <Icon name="properties" size={14} /> Data Types
      </Link>
    </nav>
  )
}
