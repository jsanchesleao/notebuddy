import { useLiveQuery } from 'dexie-react-hooks'
import { Link } from 'react-router-dom'
import { SidebarSection } from './SidebarSection'
import { getFolder } from '../../domain/folders/folderRepository'
import { getNotebook } from '../../domain/notebooks/notebookRepository'
import { listNotesByNotebook } from '../../domain/notes/noteRepository'
import { Icon } from '../../components/Icon/Icon'
import styles from './Sidebar.module.css'

interface SidebarNotebookViewProps {
  notebookId: string
  activeNoteId: string | null
}

export function SidebarNotebookView({ notebookId, activeNoteId }: SidebarNotebookViewProps) {
  const notebook = useLiveQuery(() => getNotebook(notebookId), [notebookId])
  const folder = useLiveQuery(
    () => (notebook?.folderId ? getFolder(notebook.folderId) : Promise.resolve(null)),
    [notebook?.folderId],
  )
  const notes = useLiveQuery(() => listNotesByNotebook(notebookId), [notebookId])

  if (!notebook) return null

  const upTo = notebook.folderId ? `/folders/${notebook.folderId}` : '/'
  const upLabel = notebook.folderId ? (folder?.title ?? '') : 'Up'

  return (
    <>
      <Link to={upTo} className={styles.upLink}>
        <Icon name="up" size={14} /> {upLabel}
      </Link>
      <div className={styles.currentNotebook}>
        <Icon name="book" size={14} /> {notebook.title}
      </div>
      <SidebarSection title="Notes">
        {notes?.length ? (
          <ul className={styles.list}>
            {notes.map((note) => (
              <li key={note.id}>
                <Link
                  to={`/notes/${note.id}`}
                  className={
                    note.id === activeNoteId ? `${styles.link} ${styles.activeLink}` : styles.link
                  }
                >
                  {note.title}
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className={styles.empty}>No notes yet</p>
        )}
      </SidebarSection>
    </>
  )
}
