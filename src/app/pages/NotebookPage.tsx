import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
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
import type { FilterState } from '../../domain/notes/noteFilter.types'
import { listTags } from '../../domain/tags/tagRepository'
import { EntityPageHeader } from '../common/EntityPageHeader'
import { EditableEntityRow } from '../common/EditableEntityRow'
import { Breadcrumb } from '../common/Breadcrumb'
import { buildNotebookCrumbs } from '../common/breadcrumbs'
import { NoteFilter } from '../notes/filters/NoteFilter'
import { NoteQuickSearch } from '../notes/filters/NoteQuickSearch'
import { TagQuickFilter } from '../notes/filters/TagQuickFilter'
import { useVisibleNotes } from '../notes/filters/useVisibleNotes'
import { SaveSearchButton } from '../savedSearches/SaveSearchButton'
import type { SavedSearchNavigationState } from '../savedSearches/savedSearchNavigation'
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
  const location = useLocation()
  const navigationState = location.state as SavedSearchNavigationState | null
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
  const [filterState, setFilterState] = useState<FilterState>(
    () => navigationState?.filter ?? EMPTY_FILTER,
  )
  const [search, setSearch] = useState(() => navigationState?.query ?? '')
  const [selectedTags, setSelectedTags] = useState<string[]>(
    () => navigationState?.selectedTags ?? [],
  )
  const visibleNotes = useVisibleNotes({
    notes: notes ?? [],
    filterState,
    search,
    selectedTags,
    customTypes: customTypes ?? [],
    notebookId,
  })

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
          <TagQuickFilter value={selectedTags} onChange={setSelectedTags} tags={tags ?? []} />
          <SaveSearchButton
            query={search}
            filter={filterState}
            selectedTags={selectedTags}
            notebookId={notebookId ?? null}
            boardId={null}
          />
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
