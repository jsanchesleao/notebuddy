import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { db } from '../../db/db'
import { createFolder } from '../../domain/folders/folderRepository'
import { createNotebook } from '../../domain/notebooks/notebookRepository'
import { Fab } from './Fab'

beforeEach(async () => {
  await db.folders.clear()
  await db.notebooks.clear()
  await db.notes.clear()
  await db.yjsUpdates.clear()
})

afterEach(() => {
  cleanup()
})

describe('Fab', () => {
  it('offers folder and notebook actions, but not note, outside a notebook page', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <Fab folderId={null} notebookId={null} />
      </MemoryRouter>,
    )

    await user.click(screen.getByRole('button', { name: 'Create' }))

    expect(screen.getByRole('button', { name: '+ New Folder' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '+ New Notebook' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '+ New Note' })).not.toBeInTheDocument()
  })

  it('also offers a note action when a notebook is in context', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <Fab folderId={null} notebookId="notebook-1" />
      </MemoryRouter>,
    )

    await user.click(screen.getByRole('button', { name: 'Create' }))

    expect(screen.getByRole('button', { name: '+ New Note' })).toBeInTheDocument()
  })

  it('creates a folder under the current folder and collapses afterwards', async () => {
    const user = userEvent.setup()
    const parent = await createFolder({ parentFolderId: null, title: 'Parent' })

    render(
      <MemoryRouter>
        <Fab folderId={parent.id} notebookId={null} />
      </MemoryRouter>,
    )

    await user.click(screen.getByRole('button', { name: 'Create' }))
    await user.click(screen.getByRole('button', { name: '+ New Folder' }))
    await user.type(screen.getByLabelText('New folder title'), 'Child')
    await user.click(screen.getByRole('button', { name: 'Add' }))

    await waitFor(async () => {
      const folders = await db.folders.where('parentFolderId').equals(parent.id).toArray()
      expect(folders).toHaveLength(1)
      expect(folders[0].title).toBe('Child')
    })

    expect(screen.queryByLabelText('New folder title')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '+ New Folder' })).not.toBeInTheDocument()
  })

  it('creates a notebook under the current folder', async () => {
    const user = userEvent.setup()

    render(
      <MemoryRouter>
        <Fab folderId={null} notebookId={null} />
      </MemoryRouter>,
    )

    await user.click(screen.getByRole('button', { name: 'Create' }))
    await user.click(screen.getByRole('button', { name: '+ New Notebook' }))
    await user.type(screen.getByLabelText('New notebook title'), 'Journal')
    await user.click(screen.getByRole('button', { name: 'Add' }))

    await waitFor(async () => {
      const notebooks = await db.notebooks.filter((notebook) => notebook.folderId === null).toArray()
      expect(notebooks.map((notebook) => notebook.title)).toContain('Journal')
    })
  })

  it('creates a note in the current notebook', async () => {
    const user = userEvent.setup()
    const notebook = await createNotebook({ folderId: null, title: 'Journal' })

    render(
      <MemoryRouter>
        <Fab folderId={null} notebookId={notebook.id} />
      </MemoryRouter>,
    )

    await user.click(screen.getByRole('button', { name: 'Create' }))
    await user.click(screen.getByRole('button', { name: '+ New Note' }))
    await user.type(screen.getByLabelText('New note title'), 'First entry')
    await user.click(screen.getByRole('button', { name: 'Add' }))

    await waitFor(async () => {
      const notes = await db.notes.where('notebookId').equals(notebook.id).toArray()
      expect(notes.map((note) => note.title)).toContain('First entry')
    })
  })
})
