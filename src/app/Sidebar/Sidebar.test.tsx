import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { db } from '../../db/db'
import { createFolder } from '../../domain/folders/folderRepository'
import { createNotebook } from '../../domain/notebooks/notebookRepository'
import { Sidebar } from './Sidebar'

beforeEach(async () => {
  await db.folders.clear()
  await db.notebooks.clear()
  await db.boards.clear()
})

afterEach(() => {
  cleanup()
})

describe('Sidebar', () => {
  it('shows empty-state text when there is no data', async () => {
    render(
      <MemoryRouter>
        <Sidebar open={false} currentFolderId={null} />
      </MemoryRouter>,
    )

    expect(await screen.findByText('No folders yet')).toBeInTheDocument()
    expect(await screen.findByText('No notebooks yet')).toBeInTheDocument()
    expect(await screen.findByText('No boards yet')).toBeInTheDocument()
  })

  it('does not show an up-link at the root', async () => {
    render(
      <MemoryRouter>
        <Sidebar open={false} currentFolderId={null} />
      </MemoryRouter>,
    )

    await screen.findByText('No folders yet')
    expect(screen.queryByRole('link', { name: 'Up' })).not.toBeInTheDocument()
  })

  it('reactively lists root-level folders and notebooks as they are created elsewhere', async () => {
    render(
      <MemoryRouter>
        <Sidebar open={false} currentFolderId={null} />
      </MemoryRouter>,
    )

    await screen.findByText('No folders yet')

    await createFolder({ parentFolderId: null, title: 'Recipes' })
    await createNotebook({ folderId: null, title: 'Journal' })

    expect(await screen.findByRole('link', { name: 'Recipes' })).toBeInTheDocument()
    expect(await screen.findByRole('link', { name: 'Journal' })).toBeInTheDocument()
  })

  it('shows only the current folder contents, plus an up-link to its parent', async () => {
    const root = await createFolder({ parentFolderId: null, title: 'Root' })
    await createNotebook({ folderId: null, title: 'Root notebook' })
    const subfolder = await createFolder({ parentFolderId: root.id, title: 'Subfolder' })
    await createNotebook({ folderId: subfolder.id, title: 'Scoped notebook' })
    await db.boards.add({ id: 'board-1', folderId: subfolder.id, title: 'Scoped board', columns: [] })

    render(
      <MemoryRouter>
        <Sidebar open={false} currentFolderId={subfolder.id} />
      </MemoryRouter>,
    )

    expect(await screen.findByRole('link', { name: 'Scoped notebook' })).toBeInTheDocument()
    expect(screen.getByText('Scoped board')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Root notebook' })).not.toBeInTheDocument()

    const upLink = await screen.findByRole('link', { name: 'Up' })
    expect(upLink).toHaveAttribute('href', `/folders/${root.id}`)
  })

  it('points the up-link at home when the current folder is top-level', async () => {
    const folder = await createFolder({ parentFolderId: null, title: 'Top level' })

    render(
      <MemoryRouter>
        <Sidebar open={false} currentFolderId={folder.id} />
      </MemoryRouter>,
    )

    const upLink = await screen.findByRole('link', { name: 'Up' })
    expect(upLink).toHaveAttribute('href', '/')
  })
})
