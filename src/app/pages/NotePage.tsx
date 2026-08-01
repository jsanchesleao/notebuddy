import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { deleteNote, getNote, renameNote } from '../../domain/notes/noteRepository'
import { EntityPageHeader } from '../common/EntityPageHeader'
import { Breadcrumb } from '../common/Breadcrumb'
import { buildNoteCrumbs } from '../common/breadcrumbs'
import { NoteBlockList } from '../notes/blocks/NoteBlockList'
import { PropertiesPanel } from '../notes/PropertiesPanel/PropertiesPanel'
import { useWideMode } from './useWideMode'
import styles from './NotePage.module.css'

export function NotePage() {
  const { noteId } = useParams<{ noteId: string }>()
  const navigate = useNavigate()
  const isDeletingRef = useRef(false)
  const { isWide, toggleWide } = useWideMode()
  const [propertiesOpen, setPropertiesOpen] = useState(false)

  const note = useLiveQuery(
    () => (noteId ? getNote(noteId).then((found) => found ?? null) : Promise.resolve(null)),
    [noteId],
  )

  const notFound = note === null || !noteId

  const crumbs = useLiveQuery(
    () => (note ? buildNoteCrumbs(note) : Promise.resolve([{ label: 'Home', to: '/' }])),
    [note],
  )

  useEffect(() => {
    if (notFound && !isDeletingRef.current) {
      navigate('/', { replace: true })
    }
  }, [notFound, navigate])

  if (note === undefined || notFound) return null

  const backTo = note.notebookId ? `/notebooks/${note.notebookId}` : '/'

  return (
    <div className={isWide ? `${styles.page} ${styles.pageWide}` : styles.page}>
      <Breadcrumb items={crumbs ?? [{ label: 'Home', to: '/' }]} />
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
        onToggleProperties={() => setPropertiesOpen((open) => !open)}
      />
      <NoteBlockList key={note.blockDocId} noteId={note.id} blockDocId={note.blockDocId} />
      <PropertiesPanel note={note} open={propertiesOpen} onClose={() => setPropertiesOpen(false)} />
    </div>
  )
}
