import { useLiveQuery } from 'dexie-react-hooks'
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { getNotebook } from '../../domain/notebooks/notebookRepository'
import { getBoard } from '../../domain/boards/boardRepository'
import { computeSavedSearchOrder } from './computeSavedSearchOrder'
import {
  deleteSavedSearch,
  listSavedSearches,
  renameSavedSearch,
  reorderSavedSearches,
} from '../../domain/savedSearches/savedSearchRepository'
import type { SavedSearch } from '../../domain/entities.types'
import { Icon } from '../../components/Icon/Icon'
import { EditableEntityRow } from '../common/EditableEntityRow'
import { SidebarSection } from '../Sidebar/SidebarSection'
import { runPathAndState } from './savedSearchNavigation'
import styles from './SavedSearchList.module.css'

export function SavedSearchList() {
  const savedSearches = useLiveQuery(() => listSavedSearches(), [], [])
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor),
  )

  if (savedSearches.length === 0) return null

  const handleDragEnd = async (event: DragEndEvent) => {
    const overId = event.over?.id
    if (overId === undefined) return

    const reorderedIds = computeSavedSearchOrder(
      savedSearches,
      String(event.active.id),
      String(overId),
    )
    if (reorderedIds) await reorderSavedSearches(reorderedIds)
  }

  return (
    <SidebarSection title="Saved Searches">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext
          items={savedSearches.map((search) => search.id)}
          strategy={verticalListSortingStrategy}
        >
          <ul className={styles.list}>
            {savedSearches.map((search) => (
              <SavedSearchRow key={search.id} savedSearch={search} />
            ))}
          </ul>
        </SortableContext>
      </DndContext>
    </SidebarSection>
  )
}

function SavedSearchRow({ savedSearch }: { savedSearch: SavedSearch }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: savedSearch.id,
  })
  const notebook = useLiveQuery(
    () => (savedSearch.notebookId ? getNotebook(savedSearch.notebookId) : Promise.resolve(null)),
    [savedSearch.notebookId],
  )
  const board = useLiveQuery(
    () => (savedSearch.boardId ? getBoard(savedSearch.boardId) : Promise.resolve(null)),
    [savedSearch.boardId],
  )

  const scopeLabel = savedSearch.notebookId
    ? (notebook?.title ?? 'Notebook')
    : savedSearch.boardId
      ? (board?.title ?? 'Board')
      : 'Global'

  const { to, state } = runPathAndState(savedSearch)

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <li ref={setNodeRef} style={style} className={styles.row}>
      <button
        type="button"
        className={styles.gripButton}
        aria-label={`Reorder ${savedSearch.name}`}
        {...attributes}
        {...listeners}
      >
        <Icon name="grip" size={12} />
      </button>
      <div className={styles.content}>
        <EditableEntityRow
          title={savedSearch.name}
          icon="search"
          to={to}
          linkState={state}
          onRename={(name) => renameSavedSearch(savedSearch.id, name)}
          onDelete={() => deleteSavedSearch(savedSearch.id)}
        />
        <span className={styles.scopeLabel}>{scopeLabel}</span>
      </div>
    </li>
  )
}
