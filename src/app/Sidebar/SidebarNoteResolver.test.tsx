import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { db } from '../../db/db'
import { createNotebook } from '../../domain/notebooks/notebookRepository'
import { createNote } from '../../domain/notes/noteRepository'
import { SidebarNoteResolver } from './SidebarNoteResolver'

beforeEach(async () => {
  await db.folders.clear()
  await db.notebooks.clear()
  await db.notes.clear()
  await db.yjsUpdates.clear()
})

afterEach(() => {
  cleanup()
})

describe('SidebarNoteResolver', () => {
  it('resolves the note to its notebook and renders the notebook view with the note active', async () => {
    const notebook = await createNotebook({ folderId: null, title: 'Journal' })
    const note = await createNote({ notebookId: notebook.id, title: 'Pasta idea' })

    render(
      <MemoryRouter>
        <SidebarNoteResolver noteId={note.id} />
      </MemoryRouter>,
    )

    expect(await screen.findByText('Journal')).toBeInTheDocument()
    expect(await screen.findByRole('link', { name: 'Pasta idea' })).toBeInTheDocument()
  })

  it('renders nothing for a note with no notebook', async () => {
    const note = await createNote({ notebookId: null, boardId: 'board-1', title: 'Board note' })

    const { container } = render(
      <MemoryRouter>
        <SidebarNoteResolver noteId={note.id} />
      </MemoryRouter>,
    )

    expect(container).toBeEmptyDOMElement()
  })
})
