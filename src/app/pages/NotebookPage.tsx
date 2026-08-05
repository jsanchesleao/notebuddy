import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  deleteNotebook,
  getNotebook,
  renameNotebook,
  setDefaultNoteTypeId,
} from '../../domain/notebooks/notebookRepository'
import { listNoteTypes } from '../../domain/noteTypes/noteTypeRepository'
import { listCustomDataTypes } from '../../domain/dataTypes/dataTypeRepository'
import { deleteNote, listNotesByNotebook, renameNote } from '../../domain/notes/noteRepository'
import { filterNotes, noteMatchesSearch } from '../../domain/notes/noteFilterMatch'
import type { FilterState } from '../../domain/notes/noteFilter.types'
import { listTags } from '../../domain/tags/tagRepository'
import { EntityPageHeader } from '../common/EntityPageHeader'
import { EditableEntityRow } from '../common/EditableEntityRow'
import { Breadcrumb } from '../common/Breadcrumb'
import { buildNotebookCrumbs } from '../common/breadcrumbs'
import { NoteFilter } from '../notes/filters/NoteFilter'
import { NoteQuickSearch } from '../notes/filters/NoteQuickSearch'
import { useIsMobile } from '../useIsMobile'
import {
  StickyNotesSection,
  type StickyNotesSectionHandle,
} from '../stickyNotes/StickyNotesSection'
import { useStickyNotesVisibility } from '../stickyNotes/useStickyNotesVisibility'
import styles from './NotebookPage.module.css'

const EMPTY_FILTER: FilterState = { mode: 'and', blocks: [] }

export function NotebookPage() {
  const { notebookId } = useParams<{ notebookId: string }>()
  const navigate = useNavigate()
  const isDeletingRef = useRef(false)
  const stickyNotesRef = useRef<StickyNotesSectionHandle>(null)
  const isMobile = useIsMobile()
  const { visible: stickyNotesVisible, toggleVisibility: toggleStickyNotesVisibility } =
    useStickyNotesVisibility(notebookId ?? '')

  const notebook = useLiveQuery(
    () =>
      notebookId ? getNotebook(notebookId).then((found) => found ?? null) : Promise.resolve(null),
    [notebookId],
  )
  const notes = useLiveQuery(
    () => (notebookId ? listNotesByNotebook(notebookId) : Promise.resolve([])),
    [notebookId],
  )
  const noteTypes = useLiveQuery(() => listNoteTypes(), [], [])
  const customTypes = useLiveQuery(() => listCustomDataTypes(), [], [])
  const tags = useLiveQuery(() => listTags(), [], [])
  const tagColors = new Map((tags ?? []).map((tag) => [tag.name, tag.color]))
  const [filterState, setFilterState] = useState<FilterState>(EMPTY_FILTER)
  const [search, setSearch] = useState('')
  const resolveCustomType = (id: string) => customTypes?.find((type) => type.id === id)
  const filteredNotes = filterNotes(notes ?? [], filterState, resolveCustomType)
  const visibleNotes = filteredNotes.filter((note) => noteMatchesSearch(note, search))

  const notFound = notebook === null || !notebookId

  const crumbs = useLiveQuery(
    () =>
      notebookId ? buildNotebookCrumbs(notebookId) : Promise.resolve([{ label: 'Home', to: '/' }]),
    [notebookId],
  )

  useEffect(() => {
    if (notFound && !isDeletingRef.current) {
      navigate('/', { replace: true })
    }
  }, [notFound, navigate])

  if (notebook === undefined || notFound) return null

  const backTo = notebook.folderId ? `/folders/${notebook.folderId}` : '/'

  return (
    <div className={styles.page}>
      <Breadcrumb items={crumbs ?? [{ label: 'Home', to: '/' }]} />
      <EntityPageHeader
        title={notebook.title}
        icon="book"
        entityLabel="notebook"
        onRename={(title) => renameNotebook(notebook.id, title)}
        onDelete={async () => {
          isDeletingRef.current = true
          await deleteNotebook(notebook.id)
          navigate(backTo, { replace: true })
        }}
        defaultNoteType={{
          value: notebook.defaultNoteTypeId,
          noteTypes: noteTypes ?? [],
          onChange: (id) => setDefaultNoteTypeId(notebook.id, id),
        }}
        stickyNotes={{
          visible: stickyNotesVisible,
          onToggleVisibility: toggleStickyNotesVisibility,
          onAdd: (kind) => stickyNotesRef.current?.addStickyNote(kind),
        }}
      />

      <section>
        <h2 className={styles.sectionHeading}>Notes</h2>
        <div className={styles.toolbar}>
          <NoteFilter notes={notes ?? []} value={filterState} onChange={setFilterState} />
          <NoteQuickSearch value={search} onChange={setSearch} />
        </div>
        {notes?.length === 0 && <p className={styles.empty}>No notes yet</p>}
        {notes && notes.length > 0 && visibleNotes.length === 0 && (
          <p className={styles.empty}>No notes match the current filter</p>
        )}
        <ul className={styles.list}>
          {visibleNotes.map((note) => (
            <li key={note.id}>
              <EditableEntityRow
                title={note.title}
                icon="note"
                to={`/notes/${note.id}`}
                tags={note.metadata.tags}
                tagColors={tagColors}
                onRename={(title) => renameNote(note.id, title)}
                onDelete={() => deleteNote(note.id)}
              />
            </li>
          ))}
        </ul>
      </section>
      <StickyNotesSection
        key={`stickies-${notebook.stickyNotesDocId}`}
        ref={stickyNotesRef}
        docId={notebook.stickyNotesDocId}
        visible={stickyNotesVisible}
        isMobile={isMobile}
        onCloseGallery={toggleStickyNotesVisibility}
      />
    </div>
  )
}
