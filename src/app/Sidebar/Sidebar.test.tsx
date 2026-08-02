import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { db } from '../../db/db'
import { createFolder } from '../../domain/folders/folderRepository'
import { createNotebook } from '../../domain/notebooks/notebookRepository'
import { createNote } from '../../domain/notes/noteRepository'
import { getLeafPaddingLeft } from '../common/treeIndent'
import { Sidebar } from './Sidebar'

beforeEach(async () => {
  await db.folders.clear()
  await db.notebooks.clear()
  await db.notes.clear()
  await db.boards.clear()
  await db.yjsUpdates.clear()
  window.localStorage.clear()
})

afterEach(() => {
  cleanup()
})

describe('Sidebar', () => {
  it('shows empty-state text when there is no data', async () => {
    render(
      <MemoryRouter>
        <Sidebar
          open={false}
          routeKind="home"
          folderId={null}
          notebookId={null}
          boardId={null}
          noteId={null}
        />
      </MemoryRouter>,
    )

    expect(await screen.findByText('No folders yet')).toBeInTheDocument()
  })

  it('always shows a Home link at the top of the tree', async () => {
    render(
      <MemoryRouter>
        <Sidebar
          open={false}
          routeKind="home"
          folderId={null}
          notebookId={null}
          boardId={null}
          noteId={null}
        />
      </MemoryRouter>,
    )

    expect(await screen.findByRole('link', { name: 'Home' })).toHaveAttribute('href', '/')
  })

  it('reactively lists root-level folders and notebooks as they are created elsewhere', async () => {
    render(
      <MemoryRouter>
        <Sidebar
          open={false}
          routeKind="home"
          folderId={null}
          notebookId={null}
          boardId={null}
          noteId={null}
        />
      </MemoryRouter>,
    )

    await screen.findByText('No folders yet')

    await createFolder({ parentFolderId: null, title: 'Recipes' })
    await createNotebook({ folderId: null, title: 'Journal' })

    expect(await screen.findByRole('link', { name: 'Recipes' })).toBeInTheDocument()
    expect(await screen.findByRole('link', { name: 'Journal' })).toBeInTheDocument()
  })

  it('indents a notebook the same as its sibling folder, not as a child of that folder', async () => {
    const root = await createFolder({ parentFolderId: null, title: 'root' })
    await createFolder({ parentFolderId: root.id, title: 'secret' })
    await createNotebook({ folderId: root.id, title: 'personal' })
    const user = userEvent.setup()

    render(
      <MemoryRouter>
        <Sidebar
          open={false}
          routeKind="home"
          folderId={null}
          notebookId={null}
          boardId={null}
          noteId={null}
        />
      </MemoryRouter>,
    )

    await user.click(await screen.findByRole('button', { name: 'Expand root' }))

    const secretRow = (await screen.findByRole('link', { name: 'secret' })).closest('div')
    const personalRow = (await screen.findByRole('link', { name: 'personal' })).closest('div')

    // "secret" is a folder row at depth 1; "personal" is a sibling leaf row, also at depth 1.
    expect(personalRow).toHaveStyle({ paddingLeft: `${getLeafPaddingLeft(1)}px` })
    // Regression guard: must not land at depth 2, which is what made it look nested under "secret".
    expect(personalRow).not.toHaveStyle({ paddingLeft: `${getLeafPaddingLeft(2)}px` })
    expect(secretRow).toHaveStyle({ paddingLeft: '16px' })
  })

  it('lazily reveals a nested folder only after expanding its parent', async () => {
    const root = await createFolder({ parentFolderId: null, title: 'Root' })
    await createFolder({ parentFolderId: root.id, title: 'Child' })
    const user = userEvent.setup()

    render(
      <MemoryRouter>
        <Sidebar
          open={false}
          routeKind="home"
          folderId={null}
          notebookId={null}
          boardId={null}
          noteId={null}
        />
      </MemoryRouter>,
    )

    await screen.findByRole('link', { name: 'Root' })
    expect(screen.queryByRole('link', { name: 'Child' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Expand Root' }))

    expect(await screen.findByRole('link', { name: 'Child' })).toBeInTheDocument()
  })

  it('auto-expands the active folder ancestor chain so it stays visible', async () => {
    const root = await createFolder({ parentFolderId: null, title: 'Root' })
    const child = await createFolder({ parentFolderId: root.id, title: 'Child' })

    render(
      <MemoryRouter>
        <Sidebar
          open={false}
          routeKind="folder"
          folderId={child.id}
          notebookId={null}
          boardId={null}
          noteId={null}
        />
      </MemoryRouter>,
    )

    expect(await screen.findByRole('link', { name: 'Root' })).toBeInTheDocument()
    expect(await screen.findByRole('link', { name: 'Child' })).toBeInTheDocument()
  })

  it('lets the user collapse a folder that contains the active folder, without it reopening', async () => {
    const root = await createFolder({ parentFolderId: null, title: 'Root' })
    const child = await createFolder({ parentFolderId: root.id, title: 'Child' })
    const user = userEvent.setup()

    render(
      <MemoryRouter>
        <Sidebar
          open={false}
          routeKind="folder"
          folderId={child.id}
          notebookId={null}
          boardId={null}
          noteId={null}
        />
      </MemoryRouter>,
    )

    expect(await screen.findByRole('link', { name: 'Child' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Collapse Root' }))

    expect(screen.queryByRole('link', { name: 'Child' })).not.toBeInTheDocument()
    // Give any stray effect a chance to re-fire before asserting it's still gone.
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(screen.queryByRole('link', { name: 'Child' })).not.toBeInTheDocument()
  })

  it('keeps the folder tree visible and highlights the containing folder and notebook when a notebook is open', async () => {
    const root = await createFolder({ parentFolderId: null, title: 'Root' })
    const notebook = await createNotebook({ folderId: root.id, title: 'Weeknight Dinners' })
    await createNotebook({ folderId: root.id, title: 'Journal' })

    render(
      <MemoryRouter>
        <Sidebar
          open={false}
          routeKind="notebook"
          folderId={null}
          notebookId={notebook.id}
          boardId={null}
          noteId={null}
        />
      </MemoryRouter>,
    )

    expect(await screen.findByRole('link', { name: 'Root' })).toBeInTheDocument()
    expect(await screen.findByRole('heading', { name: 'Weeknight Dinners' })).toBeInTheDocument()

    const activeRow = (await screen.findByRole('link', { name: 'Weeknight Dinners' })).closest(
      'div',
    )
    const otherRow = (await screen.findByRole('link', { name: 'Journal' })).closest('div')
    expect(activeRow?.className).not.toEqual(otherRow?.className)
  })

  it('keeps the folder tree visible and highlights the active note when a note is open', async () => {
    const root = await createFolder({ parentFolderId: null, title: 'Root' })
    const notebook = await createNotebook({ folderId: root.id, title: 'Weeknight Dinners' })
    const note = await createNote({ notebookId: notebook.id, title: 'Pasta idea' })
    await createNote({ notebookId: notebook.id, title: 'Grocery list' })

    render(
      <MemoryRouter>
        <Sidebar
          open={false}
          routeKind="note"
          folderId={null}
          notebookId={null}
          boardId={null}
          noteId={note.id}
        />
      </MemoryRouter>,
    )

    expect(await screen.findByRole('link', { name: 'Root' })).toBeInTheDocument()
    expect(await screen.findByRole('link', { name: 'Weeknight Dinners' })).toBeInTheDocument()

    const activeLink = await screen.findByRole('link', { name: 'Pasta idea' })
    const otherLink = await screen.findByRole('link', { name: 'Grocery list' })
    expect(activeLink.className).not.toEqual(otherLink.className)
  })
})
