import { useEffect, useRef } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { deleteNote, getNote, renameNote } from '../../domain/notes/noteRepository'
import { EntityPageHeader } from '../common/EntityPageHeader'
import { Icon } from '../../components/Icon/Icon'
import { NoteBlockList } from '../notes/blocks/NoteBlockList'
import { useWideMode } from './useWideMode'
import styles from './NotePage.module.css'

export function NotePage() {
  const { noteId } = useParams<{ noteId: string }>()
  const navigate = useNavigate()
  const isDeletingRef = useRef(false)
  const { isWide, toggleWide } = useWideMode()

  const note = useLiveQuery(
    () => (noteId ? getNote(noteId).then((found) => found ?? null) : Promise.resolve(null)),
    [noteId],
  )

  const notFound = note === null || !noteId

  useEffect(() => {
    if (notFound && !isDeletingRef.current) {
      navigate('/', { replace: true })
    }
  }, [notFound, navigate])

  if (note === undefined || notFound) return null

  const backTo = note.notebookId ? `/notebooks/${note.notebookId}` : '/'

  return (
    <div className={isWide ? `${styles.page} ${styles.pageWide}` : styles.page}>
      <Link to={backTo} className={styles.breadcrumb}>
        <Icon name="back" size={14} /> Back
      </Link>
      <EntityPageHeader
        title={note.title}
        icon="note"
        entityLabel="note"
        onRename={(title) => renameNote(note.id, title)}
        onDelete={async () => {
          isDeletingRef.current = true
          await deleteNote(note.id)
          navigate(backTo, { replace: true })
        }}
        wideMode={{ isWide, onToggle: toggleWide }}
      />
      <NoteBlockList key={note.blockDocId} noteId={note.id} blockDocId={note.blockDocId} />
    </div>
  )
}
