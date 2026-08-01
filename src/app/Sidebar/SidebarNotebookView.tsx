import { useLiveQuery } from 'dexie-react-hooks'
import { Link } from 'react-router-dom'
import { SidebarSection } from './SidebarSection'
import { getNotebook } from '../../domain/notebooks/notebookRepository'
import { listNotesByNotebook } from '../../domain/notes/noteRepository'
import styles from './Sidebar.module.css'

interface SidebarNotebookViewProps {
  notebookId: string
  activeNoteId: string | null
}

export function SidebarNotebookView({ notebookId, activeNoteId }: SidebarNotebookViewProps) {
  const notebook = useLiveQuery(() => getNotebook(notebookId), [notebookId])
  const notes = useLiveQuery(() => listNotesByNotebook(notebookId), [notebookId])

  if (!notebook) return null

  return (
    <SidebarSection title={notebook.title}>
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
  )
}
