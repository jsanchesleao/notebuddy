import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { db } from '../../db/db'
import { createFolder } from '../../domain/folders/folderRepository'
import { createNotebook } from '../../domain/notebooks/notebookRepository'
import { createNote, setNoteTags } from '../../domain/notes/noteRepository'
import { AppRoutes } from '../routes'

beforeEach(async () => {
  await db.folders.clear()
  await db.notebooks.clear()
  await db.notes.clear()
  await db.yjsUpdates.clear()
  await db.tags.clear()
})

afterEach(() => {
  cleanup()
})

describe('NotebookPage', () => {
  it('shows the notebook title and its notes', async () => {
    const notebook = await createNotebook({ folderId: null, title: 'Journal' })

    render(
      <MemoryRouter initialEntries={[`/notebooks/${notebook.id}`]}>
        <AppRoutes />
      </MemoryRouter>,
    )

    expect(await screen.findByRole('heading', { name: 'Journal' })).toBeInTheDocument()
    expect(screen.getByText('No notes yet')).toBeInTheDocument()

    await createNote({ notebookId: notebook.id, title: 'First entry' })

    expect(await screen.findByRole('link', { name: 'First entry' })).toBeInTheDocument()
  })

  it('navigates to the parent folder after deleting the notebook', async () => {
    const folder = await createFolder({ parentFolderId: null, title: 'Folder' })
    const notebook = await createNotebook({ folderId: folder.id, title: 'Journal' })
    const user = userEvent.setup()

    render(
      <MemoryRouter initialEntries={[`/notebooks/${notebook.id}`]}>
        <AppRoutes />
      </MemoryRouter>,
    )

    await screen.findByRole('heading', { name: 'Journal' })
    await user.click(screen.getByRole('button', { name: 'Delete notebook' }))
    await user.click(screen.getByRole('button', { name: 'Confirm delete' }))

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Folder' })).toBeInTheDocument()
    })
  })

  it('narrows the notes list to titles matching the quick search', async () => {
    const notebook = await createNotebook({ folderId: null, title: 'Journal' })
    await createNote({ notebookId: notebook.id, title: 'Weekly Planning' })
    await createNote({ notebookId: notebook.id, title: 'Grocery List' })
    const user = userEvent.setup()

    render(
      <MemoryRouter initialEntries={[`/notebooks/${notebook.id}`]}>
        <AppRoutes />
      </MemoryRouter>,
    )

    expect(await screen.findByRole('link', { name: 'Weekly Planning' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Grocery List' })).toBeInTheDocument()

    await user.type(screen.getByRole('textbox', { name: 'Search notes by title' }), 'plan')

    expect(screen.getByRole('link', { name: 'Weekly Planning' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Grocery List' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Clear search' }))

    expect(screen.getByRole('link', { name: 'Weekly Planning' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Grocery List' })).toBeInTheDocument()
  })

  it('narrows the notes list to notes matching the selected tag filter', async () => {
    const notebook = await createNotebook({ folderId: null, title: 'Journal' })
    const tagged = await createNote({ notebookId: notebook.id, title: 'Tagged note' })
    await setNoteTags(tagged.id, ['work'])
    await createNote({ notebookId: notebook.id, title: 'Untagged note' })
    const user = userEvent.setup()

    render(
      <MemoryRouter initialEntries={[`/notebooks/${notebook.id}`]}>
        <AppRoutes />
      </MemoryRouter>,
    )

    expect(await screen.findByRole('link', { name: 'Tagged note' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Untagged note' })).toBeInTheDocument()

    await user.type(screen.getByRole('textbox', { name: 'Filter notes by tag' }), 'work')
    await user.click(screen.getByRole('menuitem', { name: 'work' }))

    expect(screen.getByRole('link', { name: 'Tagged note' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Untagged note' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Remove tag filter work' }))

    expect(screen.getByRole('link', { name: 'Tagged note' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Untagged note' })).toBeInTheDocument()
  })

  it("shows each note's tags as pills next to its title", async () => {
    const notebook = await createNotebook({ folderId: null, title: 'Journal' })
    const tagged = await createNote({ notebookId: notebook.id, title: 'Tagged note' })
    await setNoteTags(tagged.id, ['work', 'urgent'])
    await createNote({ notebookId: notebook.id, title: 'Untagged note' })

    render(
      <MemoryRouter initialEntries={[`/notebooks/${notebook.id}`]}>
        <AppRoutes />
      </MemoryRouter>,
    )

    expect(await screen.findByRole('link', { name: 'Tagged note' })).toBeInTheDocument()
    expect(screen.getByText('work')).toBeInTheDocument()
    expect(screen.getByText('urgent')).toBeInTheDocument()
  })
})
