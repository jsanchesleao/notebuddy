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

// Both add-forms are only mounted while their action is active — open the floating
// menu and pick the action before the first interaction with either form.
async function openAdd(user: ReturnType<typeof userEvent.setup>, action: 'Add tag' | 'Add property') {
  await user.click(screen.getByRole('button', { name: 'Add tag or property' }))
  await user.click(screen.getByRole('menuitem', { name: action }))
}

describe('PropertiesPanelContent', () => {
  it('adds and removes tags', async () => {
    const user = userEvent.setup()
    const note = await createTestNote()

    render(<PropertiesPanelHarness noteId={note.id} />)
    await screen.findByRole('heading', { name: 'Properties', level: 2 })

    await openAdd(user, 'Add tag')
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

    await openAdd(user, 'Add property')
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

    await openAdd(user, 'Add property')
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

    await openAdd(user, 'Add property')
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

    await openAdd(user, 'Add property')
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

    await openAdd(user, 'Add property')
    await user.type(screen.getByLabelText('New property name'), 'meta')
    await user.click(screen.getByRole('button', { name: /^Text/ }))
    await user.click(screen.getByRole('menuitemradio', { name: 'Dictionary' }))
    await user.click(screen.getByRole('button', { name: 'Add property' }))
    await screen.findByText('meta')

    // Empty dictionary shows only the add-entry affordance — this is the reported bug.
    // Clicking "Add entry" (on the just-added PropertyRow, outside the compose form)
    // dismisses the now-idle "Add property" form as an outside click, so only the
    // dictionary's own key/value inputs remain.
    const propertiesSection = screen
      .getByRole('heading', { name: 'Properties', level: 3 })
      .closest('section')!
    // Dictionary properties start collapsed in the new read-only display mode — the
    // "Add entry" control only exists once the row's edit pencil reveals the full editor.
    await user.click(within(propertiesSection).getByRole('button', { name: 'Edit meta' }))
    await user.click(within(propertiesSection).getByRole('button', { name: 'Add entry' }))
    const keyInput = within(propertiesSection).getByLabelText('Entry key 1')
    await user.type(keyInput, 'color')

    const valueInput = within(propertiesSection)
      .getAllByRole('textbox')
      .find((el) => el !== keyInput)
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

    await openAdd(user, 'Add property')
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

    await openAdd(user, 'Add property')
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

    await openAdd(user, 'Add property')
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

    await openAdd(user, 'Add property')
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

  it('edits a List item type via the pencil icon, resetting its items', async () => {
    const user = userEvent.setup()
    const note = await createTestNote()
    await setNoteProperty(note.id, 'scores', {
      typeRef: { kind: 'list', itemType: { kind: 'primitive', primitive: 'text' } },
      value: ['a', 'b'],
    })

    render(<PropertiesPanelHarness noteId={note.id} />)
    await screen.findByRole('heading', { name: 'Properties', level: 2 })

    expect(screen.getByRole('button', { name: 'a' })).toBeInTheDocument()
    expect(screen.queryByText('Item type')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Edit scores' }))
    await user.click(screen.getByRole('button', { name: 'Text' }))
    await user.click(screen.getByRole('menuitemradio', { name: 'Number' }))

    await waitFor(async () => {
      const updated = await getNote(note.id)
      expect(updated?.metadata.properties.scores).toEqual({
        typeRef: { kind: 'list', itemType: { kind: 'primitive', primitive: 'number' } },
        value: [],
      })
    })

    expect(screen.queryByRole('button', { name: 'a' })).not.toBeInTheDocument()
  })

  it('edits a Set item type via the pencil icon, resetting its items', async () => {
    const user = userEvent.setup()
    const note = await createTestNote()
    await setNoteProperty(note.id, 'tags2', {
      typeRef: { kind: 'set', itemType: { kind: 'primitive', primitive: 'text' } },
      value: ['a', 'b'],
    })

    render(<PropertiesPanelHarness noteId={note.id} />)
    await screen.findByRole('heading', { name: 'Properties', level: 2 })

    await user.click(screen.getByRole('button', { name: 'Edit tags2' }))
    await user.click(screen.getByRole('button', { name: 'Text' }))
    await user.click(screen.getByRole('menuitemradio', { name: 'Boolean' }))

    await waitFor(async () => {
      const updated = await getNote(note.id)
      expect(updated?.metadata.properties.tags2).toEqual({
        typeRef: { kind: 'set', itemType: { kind: 'primitive', primitive: 'boolean' } },
        value: [],
      })
    })
  })

  it('toggles per-slot Tuple type pickers and retypes a slot', async () => {
    const user = userEvent.setup()
    const note = await createTestNote()
    await setNoteProperty(note.id, 'range', {
      typeRef: {
        kind: 'tuple',
        itemTypes: [
          { kind: 'primitive', primitive: 'text' },
          { kind: 'primitive', primitive: 'number' },
        ],
      },
      value: ['x', 5],
    })

    render(<PropertiesPanelHarness noteId={note.id} />)
    await screen.findByRole('heading', { name: 'Properties', level: 2 })

    // The "Add property" compose form is closed by default (only mounted while its
    // action is active), so no baseline "Text" trigger exists until positions are
    // opened for editing.
    expect(screen.queryAllByRole('button', { name: 'Text' })).toHaveLength(0)
    expect(screen.queryByRole('button', { name: 'Number' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Remove position 1' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Add position' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Edit range' }))

    expect(screen.getAllByRole('button', { name: 'Text' })).toHaveLength(1)
    expect(screen.getByRole('button', { name: 'Remove position 1' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Remove position 2' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Add position' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Number' }))
    await user.click(screen.getByRole('menuitemradio', { name: 'Boolean' }))

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
        value: ['x', false],
      })
    })

    await user.click(screen.getByRole('button', { name: 'Edit range' }))

    expect(screen.queryAllByRole('button', { name: 'Text' })).toHaveLength(0)
    expect(screen.queryByRole('button', { name: 'Boolean' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Remove position 1' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Add position' })).not.toBeInTheDocument()
  })

  it('shows a List of numbers as read-only chips, hiding add/remove until the edit pencil is clicked', async () => {
    const user = userEvent.setup()
    const note = await createTestNote()
    await setNoteProperty(note.id, 'amounts', {
      typeRef: { kind: 'list', itemType: { kind: 'primitive', primitive: 'number' } },
      value: [1, 2, 3],
    })

    render(<PropertiesPanelHarness noteId={note.id} />)
    await screen.findByRole('heading', { name: 'Properties', level: 2 })

    expect(screen.getByText('1')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Add item' })).not.toBeInTheDocument()
    expect(screen.queryByRole('spinbutton')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Edit amounts' }))

    expect(screen.getByRole('button', { name: 'Add item' })).toBeInTheDocument()
    expect(screen.getAllByRole('spinbutton')).toHaveLength(3)
  })

  it('keeps text pill quick-edit available on a List without entering edit mode, while hiding add/remove', async () => {
    const user = userEvent.setup()
    const note = await createTestNote()
    await setNoteProperty(note.id, 'labels', {
      typeRef: { kind: 'list', itemType: { kind: 'primitive', primitive: 'text' } },
      value: ['draft'],
    })

    render(<PropertiesPanelHarness noteId={note.id} />)
    await screen.findByRole('heading', { name: 'Properties', level: 2 })

    expect(screen.queryByRole('button', { name: 'Remove item 1' })).not.toBeInTheDocument()
    expect(screen.queryByLabelText('New item')).not.toBeInTheDocument()

    // The pill quick-edit shortcut stays available without clicking the row's edit pencil.
    await user.click(screen.getByRole('button', { name: 'draft' }))
    const editInput = screen.getByLabelText('Edit item')
    await user.clear(editInput)
    await user.type(editInput, 'final')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(async () => {
      const updated = await getNote(note.id)
      expect(updated?.metadata.properties.labels.value).toEqual(['final'])
    })
  })

  it('shows a Dictionary read-only as key: value lines, and a Tuple read-only inline with a clickable link', async () => {
    const note = await createTestNote()
    await setNoteProperty(note.id, 'team', {
      typeRef: {
        kind: 'dictionary',
        fields: [
          { key: 'lead', typeRef: { kind: 'primitive', primitive: 'text' } },
          { key: 'size', typeRef: { kind: 'primitive', primitive: 'number' } },
        ],
      },
      value: { lead: 'Alice', size: 4 },
    })
    await setNoteProperty(note.id, 'bookmark', {
      typeRef: {
        kind: 'tuple',
        itemTypes: [
          { kind: 'primitive', primitive: 'text' },
          { kind: 'primitive', primitive: 'link' },
        ],
      },
      value: ['docs', 'https://example.com'],
    })

    render(<PropertiesPanelHarness noteId={note.id} />)
    await screen.findByRole('heading', { name: 'Properties', level: 2 })

    expect(screen.getByText('lead:')).toBeInTheDocument()
    expect(screen.getByText('Alice')).toBeInTheDocument()
    expect(screen.getByText('size:')).toBeInTheDocument()
    expect(screen.getByText('4')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Add entry' })).not.toBeInTheDocument()

    const link = screen.getByRole('link', { name: 'https://example.com' })
    expect(link).toHaveAttribute('href', 'https://example.com')
    expect(screen.getByText('docs')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Add position' })).not.toBeInTheDocument()
  })

  it('opens the add menu, adds a tag/property, and dismisses via cancel/escape/outside-click/re-click', async () => {
    const user = userEvent.setup()
    const note = await createTestNote()

    render(<PropertiesPanelHarness noteId={note.id} />)
    const heading = await screen.findByRole('heading', { name: 'Properties', level: 2 })

    const trigger = screen.getByRole('button', { name: 'Add tag or property' })
    await user.click(trigger)
    expect(screen.getByRole('menuitem', { name: 'Add tag' })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: 'Add property' })).toBeInTheDocument()

    await user.click(screen.getByRole('menuitem', { name: 'Add property' }))
    const nameInput = screen.getByLabelText('New property name')
    expect(nameInput).toHaveFocus()

    // Re-clicking the trigger closes the active property form (rather than reopening
    // the menu); clicking it again then opens the menu to switch to "Add tag",
    // discarding the property draft.
    await user.type(nameInput, 'draft')
    await user.click(trigger)
    expect(screen.queryByLabelText('New property name')).not.toBeInTheDocument()
    await user.click(trigger)
    await user.click(screen.getByRole('menuitem', { name: 'Add tag' }))
    const tagInput = screen.getByLabelText('New tag')
    expect(tagInput).toHaveFocus()

    // Escape dismisses the active form.
    await user.keyboard('{Escape}')
    expect(screen.queryByLabelText('New tag')).not.toBeInTheDocument()

    // Cancel button dismisses the active form.
    await user.click(trigger)
    await user.click(screen.getByRole('menuitem', { name: 'Add tag' }))
    await user.click(screen.getByRole('button', { name: 'Cancel adding tag' }))
    expect(screen.queryByLabelText('New tag')).not.toBeInTheDocument()

    // Clicking outside the active form dismisses it.
    await user.click(trigger)
    await user.click(screen.getByRole('menuitem', { name: 'Add property' }))
    expect(screen.getByLabelText('New property name')).toBeInTheDocument()
    await user.click(heading)
    expect(screen.queryByLabelText('New property name')).not.toBeInTheDocument()

    // Re-clicking the trigger while a form is open closes it (without reopening the menu).
    await user.click(trigger)
    await user.click(screen.getByRole('menuitem', { name: 'Add property' }))
    expect(screen.getByLabelText('New property name')).toBeInTheDocument()
    await user.click(trigger)
    expect(screen.queryByLabelText('New property name')).not.toBeInTheDocument()
    expect(screen.queryByRole('menuitem', { name: 'Add tag' })).not.toBeInTheDocument()

    // The draft never got submitted.
    const updated = await getNote(note.id)
    expect(updated?.metadata.properties.draft).toBeUndefined()
  })
})
