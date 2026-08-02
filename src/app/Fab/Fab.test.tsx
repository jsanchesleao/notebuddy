import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { db } from '../../db/db'
import { createFolder } from '../../domain/folders/folderRepository'
import { createNotebook } from '../../domain/notebooks/notebookRepository'
import { createBoard } from '../../domain/boards/boardRepository'
import { createCustomDataType } from '../../domain/dataTypes/dataTypeRepository'
import type { Notebook } from '../../domain/entities.types'
import { Fab } from './Fab'

function fakeNotebook(id: string): Notebook {
  return {
    id,
    folderId: null,
    title: 'Fake notebook',
    defaultNoteTypeId: null,
    encryption: null,
    stickyNotesDocId: 'doc-1',
  }
}

beforeEach(async () => {
  await db.folders.clear()
  await db.notebooks.clear()
  await db.boards.clear()
  await db.notes.clear()
  await db.yjsUpdates.clear()
  await db.customDataTypes.clear()
})

afterEach(() => {
  cleanup()
})

describe('Fab', () => {
  it('offers folder, notebook, and board actions, but not note or card, outside a notebook/board page', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <Fab folderId={null} notebook={null} />
      </MemoryRouter>,
    )

    await user.click(screen.getByRole('button', { name: 'Create' }))

    expect(screen.getByRole('button', { name: 'New Folder' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'New Notebook' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'New Board' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'New Note' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'New Card' })).not.toBeInTheDocument()
  })

  it('also offers a note action when a notebook is in context', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <Fab folderId={null} notebook={fakeNotebook('notebook-1')} />
      </MemoryRouter>,
    )

    await user.click(screen.getByRole('button', { name: 'Create' }))

    expect(screen.getByRole('button', { name: 'New Note' })).toBeInTheDocument()
  })

  it('also offers a card action when a board is in context', async () => {
    const user = userEvent.setup()
    const statusType = await createCustomDataType({
      name: 'Status',
      schema: {
        kind: 'primitive',
        primitive: 'select',
        options: [{ id: '1', label: 'Todo', value: 'todo' }],
      },
    })
    const board = await createBoard({ title: 'Board', folderId: null, statusTypeId: statusType.id })

    render(
      <MemoryRouter>
        <Fab folderId={null} notebook={null} board={board} />
      </MemoryRouter>,
    )

    await user.click(screen.getByRole('button', { name: 'Create' }))

    expect(screen.getByRole('button', { name: 'New Card' })).toBeInTheDocument()
  })

  it('creates a folder under the current folder and collapses afterwards', async () => {
    const user = userEvent.setup()
    const parent = await createFolder({ parentFolderId: null, title: 'Parent' })

    render(
      <MemoryRouter>
        <Fab folderId={parent.id} notebook={null} />
      </MemoryRouter>,
    )

    await user.click(screen.getByRole('button', { name: 'Create' }))
    await user.click(screen.getByRole('button', { name: 'New Folder' }))
    await user.type(screen.getByLabelText('New folder title'), 'Child')
    await user.click(screen.getByRole('button', { name: 'Add' }))

    await waitFor(async () => {
      const folders = await db.folders.where('parentFolderId').equals(parent.id).toArray()
      expect(folders).toHaveLength(1)
      expect(folders[0].title).toBe('Child')
    })

    expect(screen.queryByLabelText('New folder title')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'New Folder' })).not.toBeInTheDocument()
  })

  it('creates a notebook under the current folder', async () => {
    const user = userEvent.setup()

    render(
      <MemoryRouter>
        <Fab folderId={null} notebook={null} />
      </MemoryRouter>,
    )

    await user.click(screen.getByRole('button', { name: 'Create' }))
    await user.click(screen.getByRole('button', { name: 'New Notebook' }))
    await user.type(screen.getByLabelText('New notebook title'), 'Journal')
    await user.click(screen.getByRole('button', { name: 'Add' }))

    await waitFor(async () => {
      const notebooks = await db.notebooks
        .filter((notebook) => notebook.folderId === null)
        .toArray()
      expect(notebooks.map((notebook) => notebook.title)).toContain('Journal')
    })
  })

  it('creates a note in the current notebook via the note creation modal', async () => {
    const user = userEvent.setup()
    const notebook = await createNotebook({ folderId: null, title: 'Journal' })

    render(
      <MemoryRouter>
        <Fab folderId={null} notebook={notebook} />
      </MemoryRouter>,
    )

    await user.click(screen.getByRole('button', { name: 'Create' }))
    await user.click(screen.getByRole('button', { name: 'New Note' }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()

    await user.type(screen.getByLabelText('New note title'), 'First entry')
    await user.click(screen.getByRole('button', { name: 'Create note' }))

    await waitFor(async () => {
      const notes = await db.notes.where('notebookId').equals(notebook.id).toArray()
      expect(notes.map((note) => note.title)).toContain('First entry')
    })

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('creates a board via the board creation modal', async () => {
    const user = userEvent.setup()
    const statusType = await createCustomDataType({
      name: 'Status',
      schema: {
        kind: 'primitive',
        primitive: 'select',
        options: [{ id: '1', label: 'Todo', value: 'todo' }],
      },
    })

    render(
      <MemoryRouter>
        <Fab folderId={null} notebook={null} />
      </MemoryRouter>,
    )

    await user.click(screen.getByRole('button', { name: 'Create' }))
    await user.click(screen.getByRole('button', { name: 'New Board' }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()

    await user.type(screen.getByLabelText('New board title'), 'Sprint')
    await user.click(screen.getByRole('button', { name: /Choose an option set/ }))
    await user.click(screen.getByRole('menuitemradio', { name: 'Status' }))
    await user.click(screen.getByRole('button', { name: 'Create board' }))

    await waitFor(async () => {
      const boards = await db.boards.toArray()
      expect(boards.map((board) => board.title)).toContain('Sprint')
      expect(boards[0].statusTypeId).toBe(statusType.id)
    })
  })

  it('creates a card in the current board via the note creation modal', async () => {
    const user = userEvent.setup()
    const statusType = await createCustomDataType({
      name: 'Status',
      schema: {
        kind: 'primitive',
        primitive: 'select',
        options: [{ id: '1', label: 'Todo', value: 'todo' }],
      },
    })
    const board = await createBoard({ title: 'Board', folderId: null, statusTypeId: statusType.id })

    render(
      <MemoryRouter>
        <Fab folderId={null} notebook={null} board={board} />
      </MemoryRouter>,
    )

    await user.click(screen.getByRole('button', { name: 'Create' }))
    await user.click(screen.getByRole('button', { name: 'New Card' }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()

    await user.type(screen.getByLabelText('New note title'), 'A card')
    await user.click(screen.getByRole('button', { name: 'Create note' }))

    // createNote does further async Y.Doc work after the note row itself is inserted, so
    // wait on the modal closing rather than racing on the note merely existing in db.
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())

    const notes = await db.notes.where('boardId').equals(board.id).toArray()
    expect(notes.map((note) => note.title)).toContain('A card')
  })

  it('lets the note creation modal be cancelled without creating a note', async () => {
    const user = userEvent.setup()
    const notebook = await createNotebook({ folderId: null, title: 'Journal' })

    render(
      <MemoryRouter>
        <Fab folderId={null} notebook={notebook} />
      </MemoryRouter>,
    )

    await user.click(screen.getByRole('button', { name: 'Create' }))
    await user.click(screen.getByRole('button', { name: 'New Note' }))
    await user.type(screen.getByLabelText('New note title'), 'Discarded')
    await user.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    const notes = await db.notes.where('notebookId').equals(notebook.id).toArray()
    expect(notes).toHaveLength(0)
  })
})
