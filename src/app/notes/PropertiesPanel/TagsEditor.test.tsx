import { useRef, useState } from 'react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../../db/db'
import { createNotebook } from '../../../domain/notebooks/notebookRepository'
import { createNote, getNote } from '../../../domain/notes/noteRepository'
import { listTags } from '../../../domain/tags/tagRepository'
import { PILL_PALETTE } from '../../../domain/tags/tagPalette'
import { TagsEditor } from './TagsEditor'
import type { Note } from '../../../domain/entities.types'

beforeEach(async () => {
  await db.notebooks.clear()
  await db.notes.clear()
  await db.tags.clear()
})

afterEach(() => {
  cleanup()
})

async function createTestNote(): Promise<Note> {
  const notebook = await createNotebook({ folderId: null, title: 'Notebook' })
  return createNote({ notebookId: notebook.id, title: 'A note' })
}

// Mirrors how NotePage feeds a live note snapshot into the properties panel — edits made
// through TagsEditor write to Dexie, and this harness reflects them back into props. The
// add-tag form is owned by a parent (AddMenuButton + PropertiesPanelContent in the real
// app) — this harness starts it open since these tests exercise tag CRUD, not the menu.
function TagsEditorHarness({ noteId }: { noteId: string }) {
  const note = useLiveQuery(() => getNote(noteId), [noteId])
  const [isAdding, setIsAdding] = useState(true)
  const ignoreRef = useRef<HTMLElement | null>(null)
  if (!note) return null
  return (
    <TagsEditor
      noteId={noteId}
      tags={note.metadata.tags}
      isAdding={isAdding}
      onCancelAdd={() => setIsAdding(false)}
      ignoreRef={ignoreRef}
    />
  )
}

describe('TagsEditor', () => {
  it('assigns a new tag a palette color on first use', async () => {
    const user = userEvent.setup()
    const note = await createTestNote()

    render(<TagsEditorHarness noteId={note.id} />)
    await user.type(await screen.findByLabelText('New tag'), 'urgent')
    await user.click(screen.getByRole('button', { name: 'Add tag' }))

    await waitFor(async () => {
      const tags = await listTags()
      expect(tags).toHaveLength(1)
      expect(tags[0].name).toBe('urgent')
      expect(PILL_PALETTE).toContain(tags[0].color)
    })
  })

  it('reuses the same color for a tag already registered on another note', async () => {
    const first = await createTestNote()
    const second = await createTestNote()

    render(<TagsEditorHarness noteId={first.id} />)
    const user = userEvent.setup()
    await user.type(await screen.findByLabelText('New tag'), 'urgent')
    await user.click(screen.getByRole('button', { name: 'Add tag' }))
    await waitFor(async () => expect(await listTags()).toHaveLength(1))
    const [{ color }] = await listTags()
    cleanup()

    render(<TagsEditorHarness noteId={second.id} />)
    await userEvent.setup().type(await screen.findByLabelText('New tag'), 'urgent')
    await userEvent.setup().click(screen.getByRole('button', { name: 'Add tag' }))

    await waitFor(async () => {
      const tags = await listTags()
      expect(tags).toHaveLength(1)
      expect(tags[0].color).toBe(color)
    })
  })

  it('lets the user override a tag color via the picker', async () => {
    const user = userEvent.setup()
    const note = await createTestNote()

    render(<TagsEditorHarness noteId={note.id} />)
    await user.type(await screen.findByLabelText('New tag'), 'urgent')
    await user.click(screen.getByRole('button', { name: 'Add tag' }))
    await screen.findByRole('button', { name: 'Change color for tag urgent' })

    await user.click(screen.getByRole('button', { name: 'Change color for tag urgent' }))
    await user.clear(screen.getByLabelText('Hex color'))
    await user.type(screen.getByLabelText('Hex color'), '#123456')
    await user.click(screen.getByRole('button', { name: 'Set' }))

    await waitFor(async () => {
      const tags = await listTags()
      expect(tags[0].color).toBe('#123456')
    })
  })

  it('dismisses the add-tag form via the Cancel button, without persisting a draft', async () => {
    const user = userEvent.setup()
    const note = await createTestNote()

    render(<TagsEditorHarness noteId={note.id} />)
    await user.type(await screen.findByLabelText('New tag'), 'draft')
    await user.click(screen.getByRole('button', { name: 'Cancel adding tag' }))
    expect(screen.queryByLabelText('New tag')).not.toBeInTheDocument()

    expect(await listTags()).toHaveLength(0)
  })

  it('dismisses the add-tag form via Escape, without persisting a draft', async () => {
    const user = userEvent.setup()
    const note = await createTestNote()

    render(<TagsEditorHarness noteId={note.id} />)
    await user.type(await screen.findByLabelText('New tag'), 'draft')
    await user.keyboard('{Escape}')
    expect(screen.queryByLabelText('New tag')).not.toBeInTheDocument()

    expect(await listTags()).toHaveLength(0)
  })

  it('dismisses the add-tag form via an outside click, without persisting a draft', async () => {
    const user = userEvent.setup()
    const note = await createTestNote()

    render(
      <div>
        <button type="button">outside</button>
        <TagsEditorHarness noteId={note.id} />
      </div>,
    )
    await user.type(await screen.findByLabelText('New tag'), 'draft')
    await user.click(screen.getByRole('button', { name: 'outside' }))
    expect(screen.queryByLabelText('New tag')).not.toBeInTheDocument()

    expect(await listTags()).toHaveLength(0)
  })
})
