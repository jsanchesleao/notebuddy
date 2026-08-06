import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { db } from '../../db/db'
import { createNote, setNoteTags } from '../../domain/notes/noteRepository'
import { AppRoutes } from '../routes'

beforeEach(async () => {
  await db.notes.clear()
  await db.yjsUpdates.clear()
  await db.tags.clear()
  await db.customDataTypes.clear()
  await db.noteTypes.clear()
})

afterEach(() => {
  cleanup()
})

describe('SearchPage', () => {
  it('shows an empty state until a query or filter is active', async () => {
    render(
      <MemoryRouter initialEntries={['/search']}>
        <AppRoutes />
      </MemoryRouter>,
    )

    expect(await screen.findByText('Start typing or add a filter to search')).toBeInTheDocument()
  })

  it('finds notes across different notebooks by title', async () => {
    await createNote({ notebookId: 'notebook-1', title: 'Weekly Planning' })
    await createNote({ notebookId: 'notebook-2', title: 'Grocery List' })
    const user = userEvent.setup()

    render(
      <MemoryRouter initialEntries={['/search']}>
        <AppRoutes />
      </MemoryRouter>,
    )

    await user.type(screen.getByRole('textbox', { name: 'Search all notes' }), 'plan')

    await waitFor(() => {
      expect(screen.getByRole('link', { name: 'Weekly Planning' })).toBeInTheDocument()
      expect(screen.queryByRole('link', { name: 'Grocery List' })).not.toBeInTheDocument()
    })
  })

  it('reads the initial query from the ?q= URL parameter', async () => {
    await createNote({ notebookId: null, title: 'Deep link match' })

    render(
      <MemoryRouter initialEntries={['/search?q=deep']}>
        <AppRoutes />
      </MemoryRouter>,
    )

    expect(await screen.findByRole('link', { name: 'Deep link match' })).toBeInTheDocument()
  })

  it('combines the free-text query with the structured filter (AND)', async () => {
    const tagged = await createNote({ notebookId: null, title: 'Weekly Planning' })
    await setNoteTags(tagged.id, ['work'])
    await createNote({ notebookId: null, title: 'Weekly Groceries' })
    const user = userEvent.setup()

    render(
      <MemoryRouter initialEntries={['/search?q=weekly']}>
        <AppRoutes />
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByRole('link', { name: 'Weekly Planning' })).toBeInTheDocument()
      expect(screen.getByRole('link', { name: 'Weekly Groceries' })).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /Filter/ }))
    await user.click(screen.getByRole('button', { name: /Add block/ }))
    await user.click(screen.getByRole('button', { name: /Add criterion/ }))
    await user.click(screen.getByRole('menuitem', { name: 'Tag' }))
    await user.click(screen.getByRole('button', { name: /Choose a tag/ }))
    await user.click(screen.getByRole('menuitemradio', { name: 'work' }))

    await waitFor(() => {
      expect(screen.getByRole('link', { name: 'Weekly Planning' })).toBeInTheDocument()
      expect(screen.queryByRole('link', { name: 'Weekly Groceries' })).not.toBeInTheDocument()
    })
  })

  it('navigates to the note when a result is clicked', async () => {
    await createNote({ notebookId: null, title: 'Navigable note' })
    const user = userEvent.setup()

    render(
      <MemoryRouter initialEntries={['/search?q=navigable']}>
        <AppRoutes />
      </MemoryRouter>,
    )

    const link = await screen.findByRole('link', { name: 'Navigable note' })
    await user.click(link)

    expect(await screen.findByRole('heading', { name: 'Navigable note' })).toBeInTheDocument()
  })
})
