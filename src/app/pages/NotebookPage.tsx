import { useEffect, useRef } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { faBook, faStickyNote } from '@fortawesome/free-solid-svg-icons'
import {
  deleteNotebook,
  getNotebook,
  renameNotebook,
} from '../../domain/notebooks/notebookRepository'
import { deleteNote, listNotesByNotebook, renameNote } from '../../domain/notes/noteRepository'
import { EntityPageHeader } from '../common/EntityPageHeader'
import { EditableEntityRow } from '../common/EditableEntityRow'
import styles from './NotebookPage.module.css'

export function NotebookPage() {
  const { notebookId } = useParams<{ notebookId: string }>()
  const navigate = useNavigate()
  const isDeletingRef = useRef(false)

  const notebook = useLiveQuery(
    () =>
      notebookId ? getNotebook(notebookId).then((found) => found ?? null) : Promise.resolve(null),
    [notebookId],
  )
  const notes = useLiveQuery(
    () => (notebookId ? listNotesByNotebook(notebookId) : Promise.resolve([])),
    [notebookId],
  )

  const notFound = notebook === null || !notebookId

  useEffect(() => {
    if (notFound && !isDeletingRef.current) {
      navigate('/', { replace: true })
    }
  }, [notFound, navigate])

  if (notebook === undefined || notFound) return null

  const backTo = notebook.folderId ? `/folders/${notebook.folderId}` : '/'

  return (
    <div className={styles.page}>
      <Link to={backTo} className={styles.breadcrumb}>
        ← Back
      </Link>
      <EntityPageHeader
        title={notebook.title}
        icon={faBook}
        entityLabel="notebook"
        onRename={(title) => renameNotebook(notebook.id, title)}
        onDelete={async () => {
          isDeletingRef.current = true
          await deleteNotebook(notebook.id)
          navigate(backTo, { replace: true })
        }}
      />

      <section>
        <h2 className={styles.sectionHeading}>Notes</h2>
        {notes?.length === 0 && <p className={styles.empty}>No notes yet</p>}
        <ul className={styles.list}>
          {notes?.map((note) => (
            <li key={note.id}>
              <EditableEntityRow
                title={note.title}
                icon={faStickyNote}
                to={`/notes/${note.id}`}
                onRename={(title) => renameNote(note.id, title)}
                onDelete={() => deleteNote(note.id)}
              />
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
