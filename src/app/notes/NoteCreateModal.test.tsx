import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { db } from '../../db/db'
import { createNotebook, setDefaultNoteTypeId } from '../../domain/notebooks/notebookRepository'
import { createCustomDataType } from '../../domain/dataTypes/dataTypeRepository'
import { createNoteType } from '../../domain/noteTypes/noteTypeRepository'
import { createBoard } from '../../domain/boards/boardRepository'
import { createId } from '../../domain/ids'
import type { Notebook, SelectOption } from '../../domain/entities.types'
import { NoteCreateModal } from './NoteCreateModal'

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

const navigateMock = vi.fn()

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return { ...actual, useNavigate: () => navigateMock }
})

beforeEach(async () => {
  await db.notebooks.clear()
  await db.notes.clear()
  await db.boards.clear()
  await db.customDataTypes.clear()
  await db.noteTypes.clear()
  navigateMock.mockClear()
})

afterEach(() => {
  cleanup()
})

describe('NoteCreateModal', () => {
  it('renders nothing when closed', () => {
    render(
      <MemoryRouter>
        <NoteCreateModal open={false} onClose={() => {}} notebook={fakeNotebook('notebook-1')} />
      </MemoryRouter>,
    )
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('creates a blank note by default and navigates to it', async () => {
    const user = userEvent.setup()
    const notebook = await createNotebook({ folderId: null, title: 'Journal' })
    const onClose = vi.fn()

    render(
      <MemoryRouter>
        <NoteCreateModal open onClose={onClose} notebook={notebook} />
      </MemoryRouter>,
    )

    await user.type(screen.getByLabelText('New note title'), 'First entry')
    await user.click(screen.getByRole('button', { name: 'Create note' }))

    const created = await waitFor(async () => {
      const notes = await db.notes.where('notebookId').equals(notebook.id).toArray()
      expect(notes).toHaveLength(1)
      return notes[0]
    })

    expect(created.noteTypeId).toBeNull()
    expect(onClose).toHaveBeenCalled()
    expect(navigateMock).toHaveBeenCalledWith(`/notes/${created.id}`)
  })

  it('does nothing on submit with an empty title', async () => {
    const user = userEvent.setup()
    const notebook = await createNotebook({ folderId: null, title: 'Journal' })

    render(
      <MemoryRouter>
        <NoteCreateModal open onClose={() => {}} notebook={notebook} />
      </MemoryRouter>,
    )

    await user.click(screen.getByRole('button', { name: 'Create note' }))

    const notes = await db.notes.where('notebookId').equals(notebook.id).toArray()
    expect(notes).toHaveLength(0)
    expect(navigateMock).not.toHaveBeenCalled()
  })

  it('creates a note pre-filled from a selected Note Type', async () => {
    const user = userEvent.setup()
    const notebook = await createNotebook({ folderId: null, title: 'Journal' })
    const customType = await createCustomDataType({
      name: 'Recipe',
      schema: {
        kind: 'dictionary',
        fields: [{ key: 'servings', typeRef: { kind: 'primitive', primitive: 'number' } }],
      },
    })
    await createNoteType({ name: 'Recipe', customTypeId: customType.id })

    render(
      <MemoryRouter>
        <NoteCreateModal open onClose={() => {}} notebook={notebook} />
      </MemoryRouter>,
    )

    await user.type(screen.getByLabelText('New note title'), 'Pancakes')
    await user.click(screen.getByRole('button', { name: 'Blank' }))
    await user.click(screen.getByRole('menuitemradio', { name: 'Recipe' }))
    await user.click(screen.getByRole('button', { name: 'Create note' }))

    const created = await waitFor(async () => {
      const notes = await db.notes.where('notebookId').equals(notebook.id).toArray()
      expect(notes).toHaveLength(1)
      return notes[0]
    })

    expect(created.metadata.properties.servings).toEqual({
      typeRef: { kind: 'primitive', primitive: 'number' },
      value: null,
    })
  })

  it('pre-selects the notebook default note type, and allows overriding to Blank', async () => {
    const user = userEvent.setup()
    const notebook = await createNotebook({ folderId: null, title: 'Journal' })
    const customType = await createCustomDataType({
      name: 'Recipe',
      schema: { kind: 'dictionary', fields: [] },
    })
    const noteType = await createNoteType({ name: 'Recipe', customTypeId: customType.id })
    await setDefaultNoteTypeId(notebook.id, noteType.id)
    const updatedNotebook = { ...notebook, defaultNoteTypeId: noteType.id }

    render(
      <MemoryRouter>
        <NoteCreateModal open onClose={() => {}} notebook={updatedNotebook} />
      </MemoryRouter>,
    )

    expect(await screen.findByRole('button', { name: 'Recipe' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Recipe' }))
    await user.click(screen.getByRole('menuitemradio', { name: 'Blank' }))

    expect(screen.getByRole('button', { name: 'Blank' })).toBeInTheDocument()
  })

  it('creates a board card without a notebook and stays on the board (no navigation)', async () => {
    const user = userEvent.setup()
    const options: SelectOption[] = [{ id: createId(), label: 'Todo', value: 'todo' }]
    const customType = await createCustomDataType({
      name: 'Status',
      schema: { kind: 'primitive', primitive: 'select', options },
    })
    const board = await createBoard({ title: 'Board', folderId: null, statusTypeId: customType.id })
    const onClose = vi.fn()

    render(
      <MemoryRouter>
        <NoteCreateModal
          open
          onClose={onClose}
          notebook={null}
          boardId={board.id}
          defaultStatusValue="todo"
        />
      </MemoryRouter>,
    )

    await user.type(screen.getByLabelText('New note title'), 'Card one')
    await user.click(screen.getByRole('button', { name: 'Create note' }))

    // createNote does further async Y.Doc work (loading/appending the card order entry)
    // after the note row itself is inserted, so wait on onClose — set only once createNote's
    // returned promise fully settles — rather than racing on the note merely existing in db.
    await waitFor(() => expect(onClose).toHaveBeenCalled())

    const notes = await db.notes.where('boardId').equals(board.id).toArray()
    expect(notes).toHaveLength(1)
    expect(notes[0].notebookId).toBeNull()
    expect(notes[0].metadata.properties.status?.value).toBe('todo')
    expect(navigateMock).not.toHaveBeenCalled()
  })

  it('does nothing on submit when neither a notebook nor a board is given', async () => {
    const user = userEvent.setup()

    render(
      <MemoryRouter>
        <NoteCreateModal open onClose={() => {}} notebook={null} />
      </MemoryRouter>,
    )

    await user.type(screen.getByLabelText('New note title'), 'Orphan title')
    await user.click(screen.getByRole('button', { name: 'Create note' }))

    expect(await db.notes.count()).toBe(0)
    expect(navigateMock).not.toHaveBeenCalled()
  })

  it('cancels via Escape without creating a note', async () => {
    const user = userEvent.setup()
    const notebook = await createNotebook({ folderId: null, title: 'Journal' })
    const onClose = vi.fn()

    render(
      <MemoryRouter>
        <NoteCreateModal open onClose={onClose} notebook={notebook} />
      </MemoryRouter>,
    )

    await user.click(screen.getByLabelText('New note title'))
    await user.keyboard('{Escape}')

    expect(onClose).toHaveBeenCalled()
  })
})
