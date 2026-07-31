import { useState } from 'react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../../db/db'
import { createNotebook } from '../../../domain/notebooks/notebookRepository'
import { createNote, getNote, setNoteProperty } from '../../../domain/notes/noteRepository'
import { PropertiesPanel } from './PropertiesPanel'
import type { Note } from '../../../domain/entities.types'

function stubMatchMedia(matches: boolean) {
  const original = window.matchMedia
  window.matchMedia = ((query: string) =>
    ({
      matches,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }) as unknown as MediaQueryList) as typeof window.matchMedia
  return () => {
    window.matchMedia = original
  }
}

beforeEach(async () => {
  await db.notebooks.clear()
  await db.notes.clear()
})

afterEach(() => {
  cleanup()
})

async function createTestNote(): Promise<Note> {
  const notebook = await createNotebook({ folderId: null, title: 'Notebook' })
  return createNote({ notebookId: notebook.id, title: 'A note' })
}

// Mirrors how NotePage owns the open flag and toggles it from a header button,
// so tests can exercise close-then-reopen the same way the real app does.
function ToggleableHarness({ noteId }: { noteId: string }) {
  const [open, setOpen] = useState(true)
  const note = useLiveQuery(() => getNote(noteId), [noteId])
  if (!note) return null
  return (
    <>
      <button type="button" onClick={() => setOpen((current) => !current)}>
        Toggle properties
      </button>
      <PropertiesPanel note={note} open={open} onClose={() => setOpen(false)} />
    </>
  )
}

describe('PropertiesPanel', () => {
  it('detaches into a modal and docks back to the drawer', async () => {
    const restoreMatchMedia = stubMatchMedia(true)
    const user = userEvent.setup()
    const note = await createTestNote()

    render(<ToggleableHarness noteId={note.id} />)
    await screen.findByRole('heading', { name: 'A note', level: 2 })

    await user.click(screen.getByRole('button', { name: 'Open properties in a separate window' }))

    expect(screen.getByRole('button', { name: 'Dock properties to sidebar' })).toBeInTheDocument()
    expect(screen.getAllByRole('dialog')).toHaveLength(1)

    await user.click(screen.getByRole('button', { name: 'Dock properties to sidebar' }))

    expect(
      screen.getByRole('button', { name: 'Open properties in a separate window' }),
    ).toBeInTheDocument()

    restoreMatchMedia()
  })

  it('always reopens in drawer mode after being closed', async () => {
    const restoreMatchMedia = stubMatchMedia(true)
    const user = userEvent.setup()
    const note = await createTestNote()

    render(<ToggleableHarness noteId={note.id} />)
    await screen.findByRole('heading', { name: 'A note', level: 2 })

    await user.click(screen.getByRole('button', { name: 'Open properties in a separate window' }))
    await screen.findByRole('button', { name: 'Dock properties to sidebar' })

    await user.click(screen.getByRole('button', { name: 'Close properties' }))
    await user.click(screen.getByRole('button', { name: 'Toggle properties' }))

    await screen.findByRole('heading', { name: 'A note', level: 2 })
    expect(
      screen.getByRole('button', { name: 'Open properties in a separate window' }),
    ).toBeInTheDocument()

    restoreMatchMedia()
  })

  it('hides the detach toggle on non-desktop viewports', async () => {
    const restoreMatchMedia = stubMatchMedia(false)
    const note = await createTestNote()

    render(<ToggleableHarness noteId={note.id} />)
    await screen.findByRole('heading', { name: 'A note', level: 2 })

    expect(
      screen.queryByRole('button', { name: 'Open properties in a separate window' }),
    ).not.toBeInTheDocument()

    restoreMatchMedia()
  })

  it('always stacks property rows in the drawer, even at a desktop viewport, and switches to inline rows once detached to a modal', async () => {
    const restoreMatchMedia = stubMatchMedia(true)
    const user = userEvent.setup()
    const note = await createTestNote()
    await setNoteProperty(note.id, 'favorite', {
      typeRef: { kind: 'primitive', primitive: 'text' },
      value: 'blue',
    })

    render(<ToggleableHarness noteId={note.id} />)
    await screen.findByRole('heading', { name: 'A note', level: 2 })

    const row = (await screen.findByText('favorite')).closest('[data-mode]')
    expect(row).toHaveAttribute('data-mode', 'drawer')

    await user.click(screen.getByRole('button', { name: 'Open properties in a separate window' }))

    const modalRow = (await screen.findByText('favorite')).closest('[data-mode]')
    expect(modalRow).toHaveAttribute('data-mode', 'modal')

    restoreMatchMedia()
  })
})
