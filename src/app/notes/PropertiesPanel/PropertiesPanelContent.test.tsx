import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../../db/db'
import { createNotebook } from '../../../domain/notebooks/notebookRepository'
import { createNote, getNote } from '../../../domain/notes/noteRepository'
import { PropertiesPanel } from './PropertiesPanel'
import type { Note } from '../../../domain/entities.types'

beforeEach(async () => {
  await db.notebooks.clear()
  await db.notes.clear()
  await db.customDataTypes.clear()
  await db.noteTypes.clear()
})

afterEach(() => {
  cleanup()
})

async function createTestNote(): Promise<Note> {
  const notebook = await createNotebook({ folderId: null, title: 'Notebook' })
  return createNote({ notebookId: notebook.id, title: 'A note' })
}

// PropertiesPanel takes a `note` snapshot as a prop, same as NotePage passes it in
// the real app via useLiveQuery — this harness mirrors that so edits made through the
// panel (which write to Dexie) are reflected back into the rendered props, instead of
// testing against a single frozen snapshot.
function PropertiesPanelHarness({ noteId }: { noteId: string }) {
  const note = useLiveQuery(() => getNote(noteId), [noteId])
  if (!note) return null
  return <PropertiesPanel note={note} open onClose={() => {}} />
}

describe('PropertiesPanelContent', () => {
  it('adds and removes tags', async () => {
    const user = userEvent.setup()
    const note = await createTestNote()

    render(<PropertiesPanelHarness noteId={note.id} />)
    await screen.findByRole('heading', { name: 'Properties', level: 2 })

    await user.type(screen.getByLabelText('New tag'), 'recipe')
    await user.click(screen.getByRole('button', { name: 'Add tag' }))

    await waitFor(async () => {
      const updated = await getNote(note.id)
      expect(updated?.metadata.tags).toEqual(['recipe'])
    })

    expect(await screen.findByText('recipe')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Remove tag recipe' }))

    await waitFor(async () => {
      const updated = await getNote(note.id)
      expect(updated?.metadata.tags).toEqual([])
    })
  })

  it('adds an ad hoc property with no validation error (acceptance scenario)', async () => {
    const user = userEvent.setup()
    const note = await createTestNote()

    render(<PropertiesPanelHarness noteId={note.id} />)
    await screen.findByRole('heading', { name: 'Properties', level: 2 })

    await user.type(screen.getByLabelText('New property name'), 'favorite')
    await user.click(screen.getByRole('button', { name: 'Add property' }))

    await waitFor(async () => {
      const updated = await getNote(note.id)
      expect(updated?.metadata.properties.favorite).toEqual({
        typeRef: { kind: 'primitive', primitive: 'text' },
        value: '',
      })
    })

    expect(screen.queryByText(/must be/i)).not.toBeInTheDocument()
  })

  it('rejects adding a property with a name that already exists', async () => {
    const user = userEvent.setup()
    const note = await createTestNote()

    render(<PropertiesPanelHarness noteId={note.id} />)
    await screen.findByRole('heading', { name: 'Properties', level: 2 })

    await user.type(screen.getByLabelText('New property name'), 'favorite')
    await user.click(screen.getByRole('button', { name: 'Add property' }))
    await screen.findByText('favorite')

    await user.type(screen.getByLabelText('New property name'), 'favorite')
    await user.click(screen.getByRole('button', { name: 'Add property' }))

    expect(await screen.findByText(/already exists/i)).toBeInTheDocument()
  })

  it('removes a property', async () => {
    const user = userEvent.setup()
    const note = await createTestNote()

    render(<PropertiesPanelHarness noteId={note.id} />)
    await screen.findByRole('heading', { name: 'Properties', level: 2 })

    await user.type(screen.getByLabelText('New property name'), 'favorite')
    await user.click(screen.getByRole('button', { name: 'Add property' }))
    await screen.findByText('favorite')

    await user.click(screen.getByRole('button', { name: 'Remove property favorite' }))

    await waitFor(async () => {
      const updated = await getNote(note.id)
      expect(updated?.metadata.properties.favorite).toBeUndefined()
    })
  })

  it('blocks an invalid value on a single row without affecting others, then succeeds once corrected', async () => {
    const user = userEvent.setup()
    const note = await createTestNote()
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

    render(<PropertiesPanelHarness noteId={note.id} />)
    await screen.findByRole('heading', { name: 'Properties', level: 2 })

    await user.type(screen.getByLabelText('New property name'), 'website')
    const kindTrigger = screen.getByRole('button', { name: /^Text/ })
    await user.click(kindTrigger)
    await user.click(screen.getByRole('menuitemradio', { name: 'Link' }))
    await user.click(screen.getByRole('button', { name: 'Add property' }))
    await screen.findByText('website')

    const linkInput = screen.getByPlaceholderText('https://example.com')
    await user.type(linkInput, 'not a url')

    expect(await screen.findByText(/valid URL/i)).toBeInTheDocument()

    await user.clear(linkInput)
    await user.type(linkInput, 'https://example.com')

    await waitFor(async () => {
      const updated = await getNote(note.id)
      expect(updated?.metadata.properties.website.value).toBe('https://example.com')
    })
    expect(screen.queryByText(/valid URL/i)).not.toBeInTheDocument()

    consoleError.mockRestore()
  })

  it('adds, renames, and removes entries on a Dictionary property (acceptance scenario)', async () => {
    const user = userEvent.setup()
    const note = await createTestNote()

    render(<PropertiesPanelHarness noteId={note.id} />)
    await screen.findByRole('heading', { name: 'Properties', level: 2 })

    await user.type(screen.getByLabelText('New property name'), 'meta')
    await user.click(screen.getByRole('button', { name: /^Text/ }))
    await user.click(screen.getByRole('menuitemradio', { name: 'Dictionary' }))
    await user.click(screen.getByRole('button', { name: 'Add property' }))
    await screen.findByText('meta')

    // Empty dictionary shows only the add-entry affordance — this is the reported bug.
    const propertiesSection = screen.getByRole('heading', { name: 'Properties', level: 3 }).closest('section')!
    await user.click(within(propertiesSection).getByRole('button', { name: 'Add entry' }))
    const keyInput = within(propertiesSection).getByLabelText('Entry key 1')
    await user.type(keyInput, 'color')

    const namedInputs = new Set([keyInput, within(propertiesSection).getByLabelText('New property name')])
    const valueInput = within(propertiesSection)
      .getAllByRole('textbox')
      .find((el) => !namedInputs.has(el))
    await user.type(valueInput!, 'blue')

    await waitFor(async () => {
      const updated = await getNote(note.id)
      expect(updated?.metadata.properties.meta).toEqual({
        typeRef: { kind: 'dictionary', fields: [{ key: 'color', typeRef: { kind: 'primitive', primitive: 'text' } }] },
        value: { color: 'blue' },
      })
    })

    await user.click(screen.getByRole('button', { name: 'Remove entry 1' }))

    await waitFor(async () => {
      const updated = await getNote(note.id)
      expect(updated?.metadata.properties.meta).toEqual({
        typeRef: { kind: 'dictionary', fields: [] },
        value: {},
      })
    })
  })
})
