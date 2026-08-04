import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { db } from '../../db/db'
import { createNotebook } from '../../domain/notebooks/notebookRepository'
import { createNote } from '../../domain/notes/noteRepository'
import { createBoard } from '../../domain/boards/boardRepository'
import { createCustomDataType } from '../../domain/dataTypes/dataTypeRepository'
import { createOpfsMemoryDriver } from '../../lib/opfs/opfsMemoryDriver'
import { setOpfsDriverForTesting } from '../../lib/opfs/opfsDriver'
import { AppRoutes } from '../routes'

beforeEach(async () => {
  await db.notebooks.clear()
  await db.notes.clear()
  await db.boards.clear()
  await db.customDataTypes.clear()
  await db.yjsUpdates.clear()
  setOpfsDriverForTesting(createOpfsMemoryDriver())
})

afterEach(() => {
  cleanup()
})

describe('NotePage', () => {
  it('shows the note title and mounts the block editor', async () => {
    const notebook = await createNotebook({ folderId: null, title: 'Notebook' })
    const note = await createNote({ notebookId: notebook.id, title: 'My note' })

    render(
      <MemoryRouter initialEntries={[`/notes/${note.id}`]}>
        <AppRoutes />
      </MemoryRouter>,
    )

    expect(await screen.findByRole('heading', { name: 'My note' })).toBeInTheDocument()
    expect(await screen.findByLabelText('Add block')).toBeInTheDocument()
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

  it('opens the properties drawer via the header toggle', async () => {
    const notebook = await createNotebook({ folderId: null, title: 'Notebook' })
    const note = await createNote({ notebookId: notebook.id, title: 'My note' })
    const user = userEvent.setup()

    render(
      <MemoryRouter initialEntries={[`/notes/${note.id}`]}>
        <AppRoutes />
      </MemoryRouter>,
    )

    await screen.findByRole('heading', { name: 'My note' })
    const drawer = screen.getByRole('dialog', { hidden: true })
    expect(drawer).toHaveAttribute('aria-hidden', 'true')

    await user.click(screen.getByRole('button', { name: 'Toggle properties' }))
    expect(drawer).toHaveAttribute('aria-hidden', 'false')
    expect(screen.getByRole('heading', { name: 'My note', level: 2 })).toBeInTheDocument()
  })

  it('shows card details and saves an edited description for a board card', async () => {
    const statusType = await createCustomDataType({
      name: 'Status',
      schema: {
        kind: 'primitive',
        primitive: 'select',
        options: [{ id: '1', label: 'Todo', value: 'todo' }],
      },
    })
    const board = await createBoard({ title: 'Board', folderId: null, statusTypeId: statusType.id })
    const note = await createNote({ notebookId: null, boardId: board.id, title: 'A card' })
    const user = userEvent.setup()

    render(
      <MemoryRouter initialEntries={[`/notes/${note.id}`]}>
        <AppRoutes />
      </MemoryRouter>,
    )

    await screen.findByRole('heading', { name: 'A card' })
    expect(screen.getByRole('button', { name: 'Card details' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Card details' }))
    await user.click(screen.getByRole('button', { name: 'Add description' }))
    await user.type(screen.getByLabelText('Card description'), 'Some details')
    await user.tab()

    await waitFor(
      async () => {
        const updated = await db.notes.get(note.id)
        expect(updated?.description).toBe('Some details')
      },
      { timeout: 1000 },
    )

    expect(await screen.findByText('Some details')).toBeInTheDocument()
  })

  it('discards an in-progress description edit on Escape', async () => {
    const statusType = await createCustomDataType({
      name: 'Status',
      schema: {
        kind: 'primitive',
        primitive: 'select',
        options: [{ id: '1', label: 'Todo', value: 'todo' }],
      },
    })
    const board = await createBoard({ title: 'Board', folderId: null, statusTypeId: statusType.id })
    const note = await createNote({ notebookId: null, boardId: board.id, title: 'A card' })
    const user = userEvent.setup()

    render(
      <MemoryRouter initialEntries={[`/notes/${note.id}`]}>
        <AppRoutes />
      </MemoryRouter>,
    )

    await screen.findByRole('heading', { name: 'A card' })
    await user.click(screen.getByRole('button', { name: 'Card details' }))
    await user.click(screen.getByRole('button', { name: 'Add description' }))
    await user.type(screen.getByLabelText('Card description'), 'Discard me')
    await user.keyboard('{Escape}')

    expect(screen.queryByLabelText('Card description')).not.toBeInTheDocument()
    const updated = await db.notes.get(note.id)
    expect(updated?.description).toBeUndefined()
  })

  it('uploads a card image via the header edit menu', async () => {
    const statusType = await createCustomDataType({
      name: 'Status',
      schema: {
        kind: 'primitive',
        primitive: 'select',
        options: [{ id: '1', label: 'Todo', value: 'todo' }],
      },
    })
    const board = await createBoard({ title: 'Board', folderId: null, statusTypeId: statusType.id })
    const note = await createNote({ notebookId: null, boardId: board.id, title: 'A card' })
    const user = userEvent.setup()

    render(
      <MemoryRouter initialEntries={[`/notes/${note.id}`]}>
        <AppRoutes />
      </MemoryRouter>,
    )

    await screen.findByRole('heading', { name: 'A card' })
    await user.click(screen.getByRole('button', { name: 'Edit note' }))
    await user.click(screen.getByRole('button', { name: 'Add image' }))

    const file = new File(['x'], 'cover.png', { type: 'image/png' })
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    await user.upload(input, file)

    await waitFor(async () => {
      const updated = await db.notes.get(note.id)
      expect(updated?.cardImagePath).toBeTruthy()
    })
  })

  it('removes an existing card image via the header edit menu', async () => {
    const statusType = await createCustomDataType({
      name: 'Status',
      schema: {
        kind: 'primitive',
        primitive: 'select',
        options: [{ id: '1', label: 'Todo', value: 'todo' }],
      },
    })
    const board = await createBoard({ title: 'Board', folderId: null, statusTypeId: statusType.id })
    const note = await createNote({ notebookId: null, boardId: board.id, title: 'A card' })
    const user = userEvent.setup()

    render(
      <MemoryRouter initialEntries={[`/notes/${note.id}`]}>
        <AppRoutes />
      </MemoryRouter>,
    )

    await screen.findByRole('heading', { name: 'A card' })
    await user.click(screen.getByRole('button', { name: 'Edit note' }))
    await user.click(screen.getByRole('button', { name: 'Add image' }))
    const file = new File(['x'], 'cover.png', { type: 'image/png' })
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    await user.upload(input, file)

    await waitFor(async () => {
      const updated = await db.notes.get(note.id)
      expect(updated?.cardImagePath).toBeTruthy()
    })

    await user.click(screen.getByRole('button', { name: 'Edit note' }))
    await user.click(await screen.findByRole('button', { name: 'Remove image' }))

    await waitFor(async () => {
      const updated = await db.notes.get(note.id)
      expect(updated?.cardImagePath).toBeFalsy()
    })
  })

  it('does not show card details for a regular notebook note', async () => {
    const notebook = await createNotebook({ folderId: null, title: 'Notebook' })
    const note = await createNote({ notebookId: notebook.id, title: 'My note' })

    render(
      <MemoryRouter initialEntries={[`/notes/${note.id}`]}>
        <AppRoutes />
      </MemoryRouter>,
    )

    await screen.findByRole('heading', { name: 'My note' })
    expect(screen.queryByRole('button', { name: 'Card details' })).not.toBeInTheDocument()
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
