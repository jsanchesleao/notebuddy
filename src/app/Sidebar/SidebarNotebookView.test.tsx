import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { db } from '../../db/db'
import { createFolder } from '../../domain/folders/folderRepository'
import { createNotebook } from '../../domain/notebooks/notebookRepository'
import { createNote } from '../../domain/notes/noteRepository'
import { SidebarNotebookView } from './SidebarNotebookView'

beforeEach(async () => {
  await db.folders.clear()
  await db.notebooks.clear()
  await db.notes.clear()
  await db.yjsUpdates.clear()
})

afterEach(() => {
  cleanup()
})

describe('SidebarNotebookView', () => {
  it('shows the notebook as the current item and links up to its parent folder by name', async () => {
    const folder = await createFolder({ parentFolderId: null, title: 'Recipes' })
    const notebook = await createNotebook({ folderId: folder.id, title: 'Weeknight Dinners' })

    render(
      <MemoryRouter>
        <SidebarNotebookView notebookId={notebook.id} activeNoteId={null} />
      </MemoryRouter>,
    )

    expect(await screen.findByText('Weeknight Dinners')).toBeInTheDocument()
    const upLink = await screen.findByRole('link', { name: 'Recipes' })
    expect(upLink).toHaveAttribute('href', `/folders/${folder.id}`)
  })

  it('falls back to the root "Up" link when the notebook has no parent folder', async () => {
    const notebook = await createNotebook({ folderId: null, title: 'Journal' })

    render(
      <MemoryRouter>
        <SidebarNotebookView notebookId={notebook.id} activeNoteId={null} />
      </MemoryRouter>,
    )

    await screen.findByText('Journal')
    const upLink = await screen.findByRole('link', { name: 'Up' })
    expect(upLink).toHaveAttribute('href', '/')
  })

  it('shows an empty state when the notebook has no notes', async () => {
    const notebook = await createNotebook({ folderId: null, title: 'Journal' })

    render(
      <MemoryRouter>
        <SidebarNotebookView notebookId={notebook.id} activeNoteId={null} />
      </MemoryRouter>,
    )

    expect(await screen.findByText('No notes yet')).toBeInTheDocument()
  })

  it('lists the notebook notes as plain links and highlights the active note', async () => {
    const notebook = await createNotebook({ folderId: null, title: 'Journal' })
    const note = await createNote({ notebookId: notebook.id, title: 'Pasta idea' })
    await createNote({ notebookId: notebook.id, title: 'Grocery list' })

    render(
      <MemoryRouter>
        <SidebarNotebookView notebookId={notebook.id} activeNoteId={note.id} />
      </MemoryRouter>,
    )

    const activeLink = await screen.findByRole('link', { name: 'Pasta idea' })
    expect(activeLink).toHaveAttribute('href', `/notes/${note.id}`)

    const otherLink = await screen.findByRole('link', { name: 'Grocery list' })
    expect(activeLink.className).not.toEqual(otherLink.className)
  })
})
