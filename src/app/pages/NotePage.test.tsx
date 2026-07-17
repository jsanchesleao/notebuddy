import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { db } from '../../db/db'
import { createNotebook } from '../../domain/notebooks/notebookRepository'
import { createNote } from '../../domain/notes/noteRepository'
import { AppRoutes } from '../routes'

beforeEach(async () => {
  await db.notebooks.clear()
  await db.notes.clear()
  await db.yjsUpdates.clear()
})

afterEach(() => {
  cleanup()
})

describe('NotePage', () => {
  it('shows the note title and a Phase 2 placeholder for content', async () => {
    const notebook = await createNotebook({ folderId: null, title: 'Notebook' })
    const note = await createNote({ notebookId: notebook.id, title: 'My note' })

    render(
      <MemoryRouter initialEntries={[`/notes/${note.id}`]}>
        <AppRoutes />
      </MemoryRouter>,
    )

    expect(await screen.findByRole('heading', { name: 'My note' })).toBeInTheDocument()
    expect(screen.getByText(/coming in a future update/)).toBeInTheDocument()
  })

  it('renames the note', async () => {
    const notebook = await createNotebook({ folderId: null, title: 'Notebook' })
    const note = await createNote({ notebookId: notebook.id, title: 'Old title' })
    const user = userEvent.setup()

    render(
      <MemoryRouter initialEntries={[`/notes/${note.id}`]}>
        <AppRoutes />
      </MemoryRouter>,
    )

    await screen.findByRole('heading', { name: 'Old title' })
    await user.click(screen.getByRole('button', { name: 'Rename note' }))
    const input = screen.getByLabelText('Rename note')
    await user.clear(input)
    await user.type(input, 'New title')
    await user.click(screen.getByRole('button', { name: 'Save name' }))

    expect(await screen.findByRole('heading', { name: 'New title' })).toBeInTheDocument()
  })

  it('navigates to the parent notebook after deleting the note', async () => {
    const notebook = await createNotebook({ folderId: null, title: 'Notebook' })
    const note = await createNote({ notebookId: notebook.id, title: 'Note' })
    const user = userEvent.setup()

    render(
      <MemoryRouter initialEntries={[`/notes/${note.id}`]}>
        <AppRoutes />
      </MemoryRouter>,
    )

    await screen.findByRole('heading', { name: 'Note' })
    await user.click(screen.getByRole('button', { name: 'Delete note' }))
    await user.click(screen.getByRole('button', { name: 'Confirm delete' }))

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Notebook' })).toBeInTheDocument()
    })
  })
})
