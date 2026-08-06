import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import type { RouteKind } from '../routeContext'
import { SidebarFolderView } from './SidebarFolderView'
import { SidebarNotebookView } from './SidebarNotebookView'
import { getNote } from '../../domain/notes/noteRepository'
import { Icon } from '../../components/Icon/Icon'
import { SavedSearchList } from '../savedSearches/SavedSearchList'
import styles from './Sidebar.module.css'

interface SidebarProps {
  open: boolean
  routeKind: RouteKind
  folderId: string | null
  notebookId: string | null
  boardId: string | null
  noteId: string | null
}

export function Sidebar({ open, routeKind, folderId, notebookId, boardId, noteId }: SidebarProps) {
  const note = useLiveQuery(
    () => (routeKind === 'note' && noteId ? getNote(noteId) : Promise.resolve(null)),
    [routeKind, noteId],
  )
  const activeNotebookId =
    routeKind === 'notebook' ? notebookId : routeKind === 'note' ? (note?.notebookId ?? null) : null
  const activeBoardId =
    routeKind === 'board' ? boardId : routeKind === 'note' ? (note?.boardId ?? null) : null

  return (
    <nav className={`${styles.sidebar} ${open ? styles.open : ''}`} aria-label="Primary">
      <SidebarFolderView
        currentFolderId={folderId}
        activeNotebookId={activeNotebookId}
        activeBoardId={activeBoardId}
      />
      {activeNotebookId && (
        <SidebarNotebookView notebookId={activeNotebookId} activeNoteId={noteId} />
      )}
      <SavedSearchList />
      <Link
        to="/data-types"
        className={
          routeKind === 'dataTypes'
            ? `${styles.dataTypesLink} ${styles.activeLink}`
            : styles.dataTypesLink
        }
      >
        <Icon name="properties" size={14} /> Data Types
      </Link>
    </nav>
  )
}
