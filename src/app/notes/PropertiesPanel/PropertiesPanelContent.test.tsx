import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../../db/db'
import { createNotebook } from '../../../domain/notebooks/notebookRepository'
import { createNote, getNote, setNoteProperty } from '../../../domain/notes/noteRepository'
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

    expect(
      await screen.findByRole('button', { name: 'Change color for tag recipe' }),
    ).toBeInTheDocument()
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

  it('shows Text/Number/Link properties as plain content until edited, with links clickable', async () => {
    const user = userEvent.setup()
    const note = await createTestNote()
    await setNoteProperty(note.id, 'website', {
      typeRef: { kind: 'primitive', primitive: 'link' },
      value: 'https://example.com',
    })
    await setNoteProperty(note.id, 'nickname', {
      typeRef: { kind: 'primitive', primitive: 'text' },
      value: '',
    })

    render(<PropertiesPanelHarness noteId={note.id} />)
    await screen.findByRole('heading', { name: 'Properties', level: 2 })

    const link = await screen.findByRole('link', { name: 'https://example.com' })
    expect(link).toHaveAttribute('href', 'https://example.com')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')

    expect(screen.getAllByText('Not set').length).toBeGreaterThan(0)
    expect(screen.queryByPlaceholderText('https://example.com')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Edit property website' }))
    expect(await screen.findByPlaceholderText('https://example.com')).toHaveValue(
      'https://example.com',
    )
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

    await user.click(screen.getByRole('button', { name: 'Edit property website' }))
    const linkInput = screen.getByPlaceholderText('https://example.com')
    await user.type(linkInput, 'not a url{Enter}')

    expect(await screen.findByText(/valid URL/i)).toBeInTheDocument()

    await user.clear(linkInput)
    await user.type(linkInput, 'https://example.com{Enter}')

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
    const propertiesSection = screen
      .getByRole('heading', { name: 'Properties', level: 3 })
      .closest('section')!
    await user.click(within(propertiesSection).getByRole('button', { name: 'Add entry' }))
    const keyInput = within(propertiesSection).getByLabelText('Entry key 1')
    await user.type(keyInput, 'color')

    const namedInputs = new Set([
      keyInput,
      within(propertiesSection).getByLabelText('New property name'),
    ])
    const valueInput = within(propertiesSection)
      .getAllByRole('textbox')
      .find((el) => !namedInputs.has(el))
    await user.type(valueInput!, 'blue')

    await waitFor(async () => {
      const updated = await getNote(note.id)
      expect(updated?.metadata.properties.meta).toEqual({
        typeRef: {
          kind: 'dictionary',
          fields: [{ key: 'color', typeRef: { kind: 'primitive', primitive: 'text' } }],
        },
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

  it('adds a List property with a chosen item type (acceptance scenario)', async () => {
    const user = userEvent.setup()
    const note = await createTestNote()

    render(<PropertiesPanelHarness noteId={note.id} />)
    await screen.findByRole('heading', { name: 'Properties', level: 2 })

    await user.type(screen.getByLabelText('New property name'), 'scores')
    await user.click(screen.getByRole('button', { name: /^Text/ }))
    await user.click(screen.getByRole('menuitemradio', { name: 'List' }))

    // The top-level picker now reads "List" — the remaining "Text" trigger is the new
    // nested item-type picker this feature adds.
    await user.click(screen.getByRole('button', { name: /^Text/ }))
    await user.click(screen.getByRole('menuitemradio', { name: 'Number' }))

    await user.click(screen.getByRole('button', { name: 'Add property' }))
    await screen.findByText('scores')

    await waitFor(async () => {
      const updated = await getNote(note.id)
      expect(updated?.metadata.properties.scores).toEqual({
        typeRef: { kind: 'list', itemType: { kind: 'primitive', primitive: 'number' } },
        value: [],
      })
    })
  })

  it('adds a Tuple property, adds a position, and retypes it (acceptance scenario)', async () => {
    const user = userEvent.setup()
    const note = await createTestNote()

    render(<PropertiesPanelHarness noteId={note.id} />)
    await screen.findByRole('heading', { name: 'Properties', level: 2 })

    await user.type(screen.getByLabelText('New property name'), 'range')
    await user.click(screen.getByRole('button', { name: /^Text/ }))
    await user.click(screen.getByRole('menuitemradio', { name: 'Tuple' }))

    await user.click(screen.getByRole('button', { name: 'Add position' }))

    const typeTriggers = screen.getAllByRole('button', { name: /^Text/ })
    await user.click(typeTriggers[1])
    await user.click(screen.getByRole('menuitemradio', { name: 'Boolean' }))

    await user.click(screen.getByRole('button', { name: 'Add property' }))
    await screen.findByText('range')

    await waitFor(async () => {
      const updated = await getNote(note.id)
      expect(updated?.metadata.properties.range).toEqual({
        typeRef: {
          kind: 'tuple',
          itemTypes: [
            { kind: 'primitive', primitive: 'text' },
            { kind: 'primitive', primitive: 'boolean' },
          ],
        },
        value: ['', false],
      })
    })
  })

  it('adds a Select property with ad hoc custom options and picks a value', async () => {
    const user = userEvent.setup()
    const note = await createTestNote()

    render(<PropertiesPanelHarness noteId={note.id} />)
    await screen.findByRole('heading', { name: 'Properties', level: 2 })

    await user.type(screen.getByLabelText('New property name'), 'priority')
    await user.click(screen.getByRole('button', { name: /^Text/ }))
    await user.click(screen.getByRole('menuitemradio', { name: 'Select' }))

    expect(screen.getByRole('button', { name: 'Custom options' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    await user.type(screen.getByLabelText('New option label'), 'Low')
    await user.click(screen.getByRole('button', { name: /Add option/ }))
    await user.type(screen.getByLabelText('New option label'), 'High')
    await user.click(screen.getByRole('button', { name: /Add option/ }))

    await user.click(screen.getByRole('button', { name: 'Add property' }))
    await screen.findByText('priority')

    await waitFor(async () => {
      const updated = await getNote(note.id)
      expect(updated?.metadata.properties.priority.typeRef).toMatchObject({
        kind: 'primitive',
        primitive: 'select',
        options: [
          { label: 'Low', value: 'Low' },
          { label: 'High', value: 'High' },
        ],
      })
    })

    await user.click(screen.getByRole('button', { name: 'Not set' }))
    await user.click(screen.getByRole('menuitemradio', { name: 'High' }))

    await waitFor(async () => {
      const updated = await getNote(note.id)
      expect(updated?.metadata.properties.priority.value).toBe('High')
    })
  })

  it('adds a Select property backed by a newly created option set', async () => {
    const user = userEvent.setup()
    const note = await createTestNote()

    render(<PropertiesPanelHarness noteId={note.id} />)
    await screen.findByRole('heading', { name: 'Properties', level: 2 })

    await user.type(screen.getByLabelText('New property name'), 'status')
    await user.click(screen.getByRole('button', { name: /^Text/ }))
    await user.click(screen.getByRole('menuitemradio', { name: 'Select' }))
    await user.click(screen.getByRole('button', { name: 'Use existing set' }))

    await user.click(screen.getByRole('button', { name: /Choose an option set/ }))
    await user.click(screen.getByRole('button', { name: /New option set/ }))
    await user.type(screen.getByLabelText('New option set name'), 'Status')
    await user.type(screen.getByLabelText('New option label'), 'Open')
    await user.click(screen.getByRole('button', { name: /Add option/ }))
    await user.click(screen.getByRole('button', { name: 'Create set' }))

    await user.click(screen.getByRole('button', { name: 'Add property' }))
    await screen.findByText('status')

    await waitFor(async () => {
      const updated = await getNote(note.id)
      expect(updated?.metadata.properties.status.typeRef.kind).toBe('customTypeRef')
    })

    const createdSet = (await db.customDataTypes.toArray()).find((type) => type.name === 'Status')
    expect(createdSet?.schema).toMatchObject({ options: [{ label: 'Open', value: 'Open' }] })

    // Options aren't editable from the note row for a set-backed select.
    expect(
      screen.queryByRole('button', { name: 'Edit options for status' }),
    ).not.toBeInTheDocument()
  })

  it('edits ad hoc select options via the gear icon, nulling a removed selected value', async () => {
    const user = userEvent.setup()
    const note = await createTestNote()
    await setNoteProperty(note.id, 'priority', {
      typeRef: {
        kind: 'primitive',
        primitive: 'select',
        options: [
          { id: '1', label: 'Low', value: 'low' },
          { id: '2', label: 'High', value: 'high' },
        ],
      },
      value: 'high',
    })

    render(<PropertiesPanelHarness noteId={note.id} />)
    await screen.findByRole('heading', { name: 'Properties', level: 2 })

    expect(screen.getByRole('button', { name: 'High' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Edit options for priority' }))
    await user.click(screen.getByRole('button', { name: 'Remove High' }))

    await waitFor(async () => {
      const updated = await getNote(note.id)
      expect(updated?.metadata.properties.priority).toEqual({
        typeRef: {
          kind: 'primitive',
          primitive: 'select',
          options: [{ id: '1', label: 'Low', value: 'low' }],
        },
        value: null,
      })
    })

    expect(await screen.findByText('Not set')).toBeInTheDocument()
  })
})
