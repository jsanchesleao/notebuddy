import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { deleteBoard, getBoard, renameBoard } from '../../domain/boards/boardRepository'
import { getCustomDataType, listCustomDataTypes } from '../../domain/dataTypes/dataTypeRepository'
import { listNotesByBoardId } from '../../domain/notes/noteRepository'
import { listTags } from '../../domain/tags/tagRepository'
import type { FilterState } from '../../domain/notes/noteFilter.types'
import { EntityPageHeader } from '../common/EntityPageHeader'
import { Breadcrumb } from '../common/Breadcrumb'
import { buildBoardCrumbs } from '../common/breadcrumbs'
import { NoteFilter } from '../notes/filters/NoteFilter'
import { NoteQuickSearch } from '../notes/filters/NoteQuickSearch'
import { TagQuickFilter } from '../notes/filters/TagQuickFilter'
import { useVisibleNotes } from '../notes/filters/useVisibleNotes'
import { SaveSearchButton } from '../savedSearches/SaveSearchButton'
import type { SavedSearchNavigationState } from '../savedSearches/savedSearchNavigation'
import { ManageColumnsControl } from '../boards/ManageColumnsControl'
import { HiddenColumnsControl } from '../boards/HiddenColumnsControl'
import { KanbanBoard } from '../boards/KanbanBoard'
import { useIsMobile } from '../useIsMobile'
import {
  StickyNotesSection,
  type StickyNotesSectionHandle,
} from '../stickyNotes/StickyNotesSection'
import { useStickyNotesVisibility } from '../stickyNotes/useStickyNotesVisibility'
import styles from './BoardPage.module.css'

const EMPTY_FILTER: FilterState = { mode: 'and', blocks: [] }

export function BoardPage() {
  const { boardId } = useParams<{ boardId: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const navigationState = location.state as SavedSearchNavigationState | null
  const isDeletingRef = useRef(false)
  const stickyNotesRef = useRef<StickyNotesSectionHandle>(null)
  const isMobile = useIsMobile()
  const { visible: stickyNotesVisible, toggleVisibility: toggleStickyNotesVisibility } =
    useStickyNotesVisibility(boardId ?? '')
  const [boardScrollLeft, setBoardScrollLeft] = useState(0)

  const board = useLiveQuery(
    () => (boardId ? getBoard(boardId).then((found) => found ?? null) : Promise.resolve(null)),
    [boardId],
  )
  const notes = useLiveQuery(
    () => (boardId ? listNotesByBoardId(boardId) : Promise.resolve([])),
    [boardId],
  )
  const customType = useLiveQuery(
    () => (board?.statusTypeId ? getCustomDataType(board.statusTypeId) : Promise.resolve(null)),
    [board?.statusTypeId],
  )
  const customTypes = useLiveQuery(() => listCustomDataTypes(), [], [])
  const allTags = useLiveQuery(() => listTags(), [], [])
  const [filterState, setFilterState] = useState<FilterState>(
    () => navigationState?.filter ?? EMPTY_FILTER,
  )
  const [search, setSearch] = useState(() => navigationState?.query ?? '')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const visibleNotes = useVisibleNotes({
    notes: notes ?? [],
    filterState,
    search,
    selectedTags,
    customTypes: customTypes ?? [],
    boardId,
  })

  const notFound = board === null || !boardId

  const crumbs = useLiveQuery(
    () => (boardId ? buildBoardCrumbs(boardId) : Promise.resolve([{ label: 'Home', to: '/' }])),
    [boardId],
  )

  useEffect(() => {
    if (notFound && !isDeletingRef.current) {
      navigate('/', { replace: true })
    }
  }, [notFound, navigate])

  if (board === undefined || notFound) return null

  const backTo = board.folderId ? `/folders/${board.folderId}` : '/'

  return (
    <div className={styles.page}>
      <Breadcrumb items={crumbs ?? [{ label: 'Home', to: '/' }]} />
      <EntityPageHeader
        title={board.title}
        icon="board"
        entityLabel="board"
        onRename={(title) => renameBoard(board.id, title)}
        onDelete={async () => {
          isDeletingRef.current = true
          await deleteBoard(board.id)
          navigate(backTo, { replace: true })
        }}
        stickyNotes={{
          visible: stickyNotesVisible,
          onToggleVisibility: toggleStickyNotesVisibility,
          onAdd: (kind) => stickyNotesRef.current?.addStickyNote(kind),
        }}
      />

      <div className={styles.toolbar}>
        <NoteFilter notes={notes ?? []} value={filterState} onChange={setFilterState} />
        <NoteQuickSearch value={search} onChange={setSearch} />
        <TagQuickFilter value={selectedTags} onChange={setSelectedTags} tags={allTags ?? []} />
        <SaveSearchButton
          query={search}
          filter={filterState}
          notebookId={null}
          boardId={boardId ?? null}
        />
        {customType && <ManageColumnsControl board={board} customType={customType} />}
        <HiddenColumnsControl boardId={board.id} columns={board.columns} />
      </div>

      <div className={styles.board}>
        <KanbanBoard
          key={board.cardsDocId}
          board={board}
          notes={visibleNotes}
          onScrollLeftChange={setBoardScrollLeft}
        />
        <StickyNotesSection
          key={`stickies-${board.cardsDocId}`}
          ref={stickyNotesRef}
          docId={board.cardsDocId}
          visible={stickyNotesVisible}
          isMobile={isMobile}
          onCloseGallery={toggleStickyNotesVisibility}
          scrollOffsetX={boardScrollLeft}
        />
      </div>
    </div>
  )
}
