import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { db } from '../../db/db'
import { createFolder } from '../../domain/folders/folderRepository'
import { AppRoutes } from '../routes'

beforeEach(async () => {
  await db.folders.clear()
  await db.notebooks.clear()
})

afterEach(() => {
  cleanup()
})

describe('FolderPage', () => {
  it('shows the folder title and its nested folders/notebooks', async () => {
    const folder = await createFolder({ parentFolderId: null, title: 'Recipes' })
    await createFolder({ parentFolderId: folder.id, title: 'Desserts' })

    render(
      <MemoryRouter initialEntries={[`/folders/${folder.id}`]}>
        <AppRoutes />
      </MemoryRouter>,
    )

    expect(await screen.findByRole('heading', { name: 'Recipes' })).toBeInTheDocument()
    expect(await screen.findByRole('link', { name: 'Desserts' })).toBeInTheDocument()
  })

  it('renames the folder via the page header', async () => {
    const folder = await createFolder({ parentFolderId: null, title: 'Old' })
    const user = userEvent.setup()

    render(
      <MemoryRouter initialEntries={[`/folders/${folder.id}`]}>
        <AppRoutes />
      </MemoryRouter>,
    )

    await screen.findByRole('heading', { name: 'Old' })
    await user.click(screen.getByRole('button', { name: 'Rename folder' }))
    const input = screen.getByLabelText('Rename folder')
    await user.clear(input)
    await user.type(input, 'New')
    await user.click(screen.getByRole('button', { name: 'Save name' }))

    expect(await screen.findByRole('heading', { name: 'New' })).toBeInTheDocument()
  })

  it('navigates to the parent folder after deleting a nested folder', async () => {
    const root = await createFolder({ parentFolderId: null, title: 'Root' })
    const child = await createFolder({ parentFolderId: root.id, title: 'Child' })
    const user = userEvent.setup()

    render(
      <MemoryRouter initialEntries={[`/folders/${child.id}`]}>
        <AppRoutes />
      </MemoryRouter>,
    )

    await screen.findByRole('heading', { name: 'Child' })
    await user.click(screen.getByRole('button', { name: 'Delete folder' }))
    await user.click(screen.getByRole('button', { name: 'Confirm delete' }))

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Root' })).toBeInTheDocument()
    })
  })

  it('redirects home when the folder does not exist', async () => {
    render(
      <MemoryRouter initialEntries={['/folders/does-not-exist']}>
        <AppRoutes />
      </MemoryRouter>,
    )

    expect(await screen.findByText('Welcome to Notebuddy')).toBeInTheDocument()
  })
})
