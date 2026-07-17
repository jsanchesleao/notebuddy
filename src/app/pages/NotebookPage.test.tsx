import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { db } from '../../db/db'
import { createFolder } from '../../domain/folders/folderRepository'
import { createNotebook } from '../../domain/notebooks/notebookRepository'
import { createNote } from '../../domain/notes/noteRepository'
import { AppRoutes } from '../routes'

beforeEach(async () => {
  await db.folders.clear()
  await db.notebooks.clear()
  await db.notes.clear()
  await db.yjsUpdates.clear()
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
})
