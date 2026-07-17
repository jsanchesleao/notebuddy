import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { db } from '../../db/db'
import { createFolder } from '../../domain/folders/folderRepository'
import { createNotebook } from '../../domain/notebooks/notebookRepository'
import { FolderContents } from './FolderContents'

beforeEach(async () => {
  await db.folders.clear()
  await db.notebooks.clear()
  await db.boards.clear()
})

afterEach(() => {
  cleanup()
})

describe('FolderContents', () => {
  it('shows empty states when there are no folders, notebooks or boards', async () => {
    render(
      <MemoryRouter>
        <FolderContents parentFolderId={null} />
      </MemoryRouter>,
    )

    expect(await screen.findByText('No folders yet')).toBeInTheDocument()
    expect(await screen.findByText('No notebooks yet')).toBeInTheDocument()
    expect(await screen.findByText('No boards yet')).toBeInTheDocument()
  })

  it('reactively lists folders, notebooks and boards created elsewhere', async () => {
    render(
      <MemoryRouter>
        <FolderContents parentFolderId={null} />
      </MemoryRouter>,
    )

    await screen.findByText('No folders yet')

    await createFolder({ parentFolderId: null, title: 'Recipes' })
    await createNotebook({ folderId: null, title: 'Journal' })
    await db.boards.add({ id: 'board-1', folderId: null, title: 'Kanban', columns: [] })

    expect(await screen.findByRole('link', { name: 'Recipes' })).toBeInTheDocument()
    expect(await screen.findByRole('link', { name: 'Journal' })).toBeInTheDocument()
    expect(await screen.findByText('Kanban')).toBeInTheDocument()
  })

  it('renames and deletes a folder', async () => {
    const user = userEvent.setup()
    await createFolder({ parentFolderId: null, title: 'Old name' })

    render(
      <MemoryRouter>
        <FolderContents parentFolderId={null} />
      </MemoryRouter>,
    )

    await screen.findByRole('link', { name: 'Old name' })

    await user.click(screen.getByRole('button', { name: 'Rename Old name' }))
    const input = screen.getByLabelText('Rename Old name')
    await user.clear(input)
    await user.type(input, 'New name')
    await user.click(screen.getByRole('button', { name: 'Save name' }))

    expect(await screen.findByRole('link', { name: 'New name' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Delete New name' }))
    await user.click(screen.getByRole('button', { name: 'Confirm delete' }))

    await waitFor(() => {
      expect(screen.queryByRole('link', { name: 'New name' })).not.toBeInTheDocument()
    })
    expect(await screen.findByText('No folders yet')).toBeInTheDocument()
  })
})
