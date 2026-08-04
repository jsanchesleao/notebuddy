import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  clearNoteCardImagePath,
  deleteNote,
  getNote,
  renameNote,
  setNoteCardImagePath,
} from '../../domain/notes/noteRepository'
import { EntityPageHeader, type EntityPageHeaderMenuAction } from '../common/EntityPageHeader'
import { Breadcrumb } from '../common/Breadcrumb'
import { buildNoteCrumbs } from '../common/breadcrumbs'
import { NoteBlockList } from '../notes/blocks/NoteBlockList'
import { PropertiesPanel } from '../notes/PropertiesPanel/PropertiesPanel'
import { BoardCardDetails } from '../boards/BoardCardDetails'
import { useOpfsImageUpload } from '../notes/useOpfsImageUpload'
import { getOpfsDriver } from '../../lib/opfs/opfsDriver'
import { useWideMode } from './useWideMode'
import styles from './NotePage.module.css'

export function NotePage() {
  const { noteId } = useParams<{ noteId: string }>()
  const navigate = useNavigate()
  const isDeletingRef = useRef(false)
  const { isWide, toggleWide } = useWideMode()
  const [propertiesOpen, setPropertiesOpen] = useState(false)
  const cardImageInputRef = useRef<HTMLInputElement>(null)

  const note = useLiveQuery(
    () => (noteId ? getNote(noteId).then((found) => found ?? null) : Promise.resolve(null)),
    [noteId],
  )

  const uploadCardImage = useOpfsImageUpload({
    ownerId: note?.id ?? '',
    currentPath: note?.cardImagePath,
    onUploaded: (path) => note && setNoteCardImagePath(note.id, path),
  })

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

  const backTo = note.notebookId
    ? `/notebooks/${note.notebookId}`
    : note.boardId
      ? `/boards/${note.boardId}`
      : '/'

  const cardImageMenuActions: EntityPageHeaderMenuAction[] | undefined = note.boardId
    ? [
        {
          label: note.cardImagePath ? 'Replace image' : 'Add image',
          icon: 'image',
          onClick: () => cardImageInputRef.current?.click(),
        },
        ...(note.cardImagePath
          ? [
              {
                label: 'Remove image',
                icon: 'close' as const,
                onClick: async () => {
                  await getOpfsDriver().deleteFile(note.cardImagePath!)
                  await clearNoteCardImagePath(note.id)
                },
              },
            ]
          : []),
      ]
    : undefined

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
        menuActions={cardImageMenuActions}
      />
      <input
        ref={cardImageInputRef}
        type="file"
        accept="image/*"
        className={styles.hiddenInput}
        onChange={(event) => {
          const file = event.target.files?.[0]
          if (file) uploadCardImage(file)
          event.target.value = ''
        }}
      />
      {note.boardId && <BoardCardDetails note={note} />}
      <NoteBlockList key={note.blockDocId} noteId={note.id} blockDocId={note.blockDocId} />
      <PropertiesPanel note={note} open={propertiesOpen} onClose={() => setPropertiesOpen(false)} />
    </div>
  )
}
