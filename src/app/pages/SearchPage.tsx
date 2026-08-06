import { useEffect, useState } from 'react'
import { useLocation, useSearchParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../db/db'
import { listCustomDataTypes } from '../../domain/dataTypes/dataTypeRepository'
import { listTags } from '../../domain/tags/tagRepository'
import { buildNoteCrumbs, type BreadcrumbItem } from '../common/breadcrumbs'
import { EditableEntityRow } from '../common/EditableEntityRow'
import { NoteFilter } from '../notes/filters/NoteFilter'
import { NoteQuickSearch } from '../notes/filters/NoteQuickSearch'
import { TagQuickFilter } from '../notes/filters/TagQuickFilter'
import { useVisibleNotes } from '../notes/filters/useVisibleNotes'
import { SaveSearchButton } from '../savedSearches/SaveSearchButton'
import type { SavedSearchNavigationState } from '../savedSearches/savedSearchNavigation'
import type { FilterState } from '../../domain/notes/noteFilter.types'
import styles from './SearchPage.module.css'

const EMPTY_FILTER: FilterState = { mode: 'and', blocks: [] }

export function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const location = useLocation()
  const navigationState = location.state as SavedSearchNavigationState | null
  const query = searchParams.get('q') ?? ''
  const [filterState, setFilterState] = useState<FilterState>(
    () => navigationState?.filter ?? EMPTY_FILTER,
  )
  const [crumbsByNoteId, setCrumbsByNoteId] = useState<Map<string, BreadcrumbItem[]>>(new Map())
  const [selectedTags, setSelectedTags] = useState<string[]>([])

  const notes = useLiveQuery(() => db.notes.toArray(), [], [])
  const customTypes = useLiveQuery(() => listCustomDataTypes(), [], [])
  const tags = useLiveQuery(() => listTags(), [], [])
  const tagColors = new Map((tags ?? []).map((tag) => [tag.name, tag.color]))

  const visibleNotes = useVisibleNotes({
    notes,
    filterState,
    search: query,
    selectedTags,
    customTypes,
  })

  useEffect(() => {
    let cancelled = false

    async function loadCrumbs() {
      const entries = await Promise.all(
        visibleNotes.map(async (note): Promise<[string, BreadcrumbItem[]]> => [
          note.id,
          await buildNoteCrumbs(note),
        ]),
      )
      if (!cancelled) setCrumbsByNoteId(new Map(entries))
    }

    void loadCrumbs()
    return () => {
      cancelled = true
    }
  }, [visibleNotes])

  const hasQueryOrFilter =
    query.trim() !== '' ||
    selectedTags.length > 0 ||
    filterState.blocks.some((block) => block.criteria.length > 0)

  return (
    <div className={styles.page}>
      <h1 className={styles.heading}>Search</h1>
      <div className={styles.toolbar}>
        <NoteQuickSearch
          value={query}
          onChange={(next) =>
            setSearchParams(
              (prev) => {
                const params = new URLSearchParams(prev)
                if (next === '') params.delete('q')
                else params.set('q', next)
                return params
              },
              { replace: true },
            )
          }
          placeholder="Search everything..."
          ariaLabel="Search all notes"
        />
        <NoteFilter notes={notes} value={filterState} onChange={setFilterState} />
        <TagQuickFilter value={selectedTags} onChange={setSelectedTags} tags={tags ?? []} />
        <SaveSearchButton query={query} filter={filterState} notebookId={null} boardId={null} />
      </div>
      {!hasQueryOrFilter && <p className={styles.empty}>Start typing or add a filter to search</p>}
      {hasQueryOrFilter && visibleNotes.length === 0 && (
        <p className={styles.empty}>No notes match your search</p>
      )}
      <ul className={styles.list}>
        {visibleNotes.map((note) => (
          <li key={note.id} className={styles.resultItem}>
            <EditableEntityRow
              title={note.title}
              icon="note"
              to={`/notes/${note.id}`}
              tags={note.metadata.tags}
              tagColors={tagColors}
            />
            <SearchResultCrumb crumbs={crumbsByNoteId.get(note.id)} />
          </li>
        ))}
      </ul>
    </div>
  )
}

function SearchResultCrumb({ crumbs }: { crumbs: BreadcrumbItem[] | undefined }) {
  if (!crumbs || crumbs.length === 0) return null
  return <p className={styles.crumb}>{crumbs.map((crumb) => crumb.label).join(' / ')}</p>
}
