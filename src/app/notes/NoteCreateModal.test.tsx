import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { db } from '../../db/db'
import { createNotebook } from '../../domain/notebooks/notebookRepository'
import { createCustomDataType } from '../../domain/dataTypes/dataTypeRepository'
import { createNoteType } from '../../domain/noteTypes/noteTypeRepository'
import { NoteCreateModal } from './NoteCreateModal'

const navigateMock = vi.fn()

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return { ...actual, useNavigate: () => navigateMock }
})

beforeEach(async () => {
  await db.notebooks.clear()
  await db.notes.clear()
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
        <NoteCreateModal open={false} onClose={() => {}} notebookId="notebook-1" />
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
        <NoteCreateModal open onClose={onClose} notebookId={notebook.id} />
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
        <NoteCreateModal open onClose={() => {}} notebookId={notebook.id} />
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
        <NoteCreateModal open onClose={() => {}} notebookId={notebook.id} />
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

  it('cancels via Escape without creating a note', async () => {
    const user = userEvent.setup()
    const notebook = await createNotebook({ folderId: null, title: 'Journal' })
    const onClose = vi.fn()

    render(
      <MemoryRouter>
        <NoteCreateModal open onClose={onClose} notebookId={notebook.id} />
      </MemoryRouter>,
    )

    await user.click(screen.getByLabelText('New note title'))
    await user.keyboard('{Escape}')

    expect(onClose).toHaveBeenCalled()
  })
})
