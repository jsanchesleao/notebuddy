import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { db } from '../../db/db'
import { createNotebook } from '../../domain/notebooks/notebookRepository'
import { createSavedSearch } from '../../domain/savedSearches/savedSearchRepository'
import { SavedSearchList } from './SavedSearchList'

function LocationProbe() {
  const location = useLocation()
  return (
    <div data-testid="location-probe">
      {JSON.stringify({ path: location.pathname + location.search, state: location.state })}
    </div>
  )
}

function renderList() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route
          path="/"
          element={
            <>
              <SavedSearchList />
              <LocationProbe />
            </>
          }
        />
        <Route path="/notebooks/:notebookId" element={<LocationProbe />} />
        <Route path="/boards/:boardId" element={<LocationProbe />} />
        <Route path="/search" element={<LocationProbe />} />
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(async () => {
  await db.savedSearches.clear()
  await db.notebooks.clear()
  await db.noteTypes.clear()
})

afterEach(() => {
  cleanup()
})

describe('SavedSearchList', () => {
  it('renders nothing when there are no saved searches', () => {
    const { container } = renderList()
    expect(container.textContent).not.toContain('Saved Searches')
  })

  it('lists saved searches with a scope indicator', async () => {
    const notebook = await createNotebook({ folderId: null, title: 'My Notebook' })
    await createSavedSearch({
      name: 'Global one',
      notebookId: null,
      boardId: null,
      query: 'urgent',
      filter: { mode: 'and', blocks: [] },
      selectedTags: [],
    })
    await createSavedSearch({
      name: 'Notebook one',
      notebookId: notebook.id,
      boardId: null,
      query: '',
      filter: { mode: 'and', blocks: [] },
      selectedTags: [],
    })

    renderList()

    expect(await screen.findByText('Global one')).toBeInTheDocument()
    expect(screen.getByText('Notebook one')).toBeInTheDocument()
    expect(screen.getByText('Global')).toBeInTheDocument()
    await waitFor(() => expect(screen.getByText('My Notebook')).toBeInTheDocument())
  })

  it('running a global saved search navigates to /search?q=... with the filter in state', async () => {
    const filter = {
      mode: 'and' as const,
      blocks: [{ id: 'b1', criteria: [{ id: 'c1', kind: 'tag' as const, tag: 'work' }] }],
    }
    await createSavedSearch({
      name: 'Global search',
      notebookId: null,
      boardId: null,
      query: 'urgent',
      filter,
      selectedTags: [],
    })
    const user = userEvent.setup()

    renderList()

    await user.click(await screen.findByText('Global search'))

    const probe = await screen.findByTestId('location-probe')
    const parsed = JSON.parse(probe.textContent ?? '{}')
    expect(parsed.path).toBe('/search?q=urgent')
    expect(parsed.state).toEqual({ filter, selectedTags: [] })
  })

  it('running a scoped saved search navigates to the notebook with query+filter in state', async () => {
    const notebook = await createNotebook({ folderId: null, title: 'Scoped notebook' })
    const filter = { mode: 'and' as const, blocks: [] }
    await createSavedSearch({
      name: 'Scoped search',
      notebookId: notebook.id,
      boardId: null,
      query: 'plan',
      filter,
      selectedTags: [],
    })
    const user = userEvent.setup()

    renderList()

    await user.click(await screen.findByText('Scoped search'))

    const probe = await screen.findByTestId('location-probe')
    const parsed = JSON.parse(probe.textContent ?? '{}')
    expect(parsed.path).toBe(`/notebooks/${notebook.id}`)
    expect(parsed.state).toEqual({ query: 'plan', filter, selectedTags: [] })
  })

  it('renames and deletes a saved search', async () => {
    await createSavedSearch({
      name: 'Original name',
      notebookId: null,
      boardId: null,
      query: '',
      filter: { mode: 'and', blocks: [] },
      selectedTags: [],
    })
    const user = userEvent.setup()

    renderList()
    await screen.findByText('Original name')

    await user.click(screen.getByRole('button', { name: 'Rename Original name' }))
    await user.clear(screen.getByRole('textbox', { name: 'Rename Original name' }))
    await user.type(screen.getByRole('textbox', { name: 'Rename Original name' }), 'Renamed search')
    await user.click(screen.getByRole('button', { name: 'Save name' }))

    expect(await screen.findByText('Renamed search')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Delete Renamed search' }))
    await user.click(screen.getByRole('button', { name: 'Confirm delete' }))

    await waitFor(() => {
      expect(screen.queryByText('Renamed search')).not.toBeInTheDocument()
    })
  })

  it('still renders and runs a saved search whose filter references a deleted note type', async () => {
    const staleFilter = {
      mode: 'and' as const,
      blocks: [
        {
          id: 'b1',
          criteria: [{ id: 'c1', kind: 'noteType' as const, noteTypeId: 'no-longer-exists' }],
        },
      ],
    }
    await createSavedSearch({
      name: 'Stale note type search',
      notebookId: null,
      boardId: null,
      query: '',
      filter: staleFilter,
      selectedTags: [],
    })
    const user = userEvent.setup()

    renderList()

    const row = await screen.findByText('Stale note type search')
    expect(row).toBeInTheDocument()

    await user.click(row)

    const probe = await screen.findByTestId('location-probe')
    const parsed = JSON.parse(probe.textContent ?? '{}')
    expect(parsed.path).toBe('/search?q=')
    expect(parsed.state).toEqual({ filter: staleFilter, selectedTags: [] })
  })
})
