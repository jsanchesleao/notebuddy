import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { db } from '../../db/db'
import { createId } from '../../domain/ids'
import { DataTypesPage } from './DataTypesPage'
import type { Note } from '../../domain/entities.types'

beforeEach(async () => {
  await db.customDataTypes.clear()
  await db.noteTypes.clear()
  await db.notes.clear()
})

afterEach(() => {
  cleanup()
})

describe('DataTypesPage', () => {
  it('builds a Dictionary nesting a List of Tuples through the UI and lists it', async () => {
    const user = userEvent.setup()
    render(<DataTypesPage />)

    await user.click(screen.getByRole('button', { name: 'New type' }))
    await user.type(screen.getByLabelText('Custom data type name'), 'Recipe')

    // Root schema defaults to Dictionary; add a "steps" field and turn it into a List.
    await user.click(screen.getByRole('button', { name: 'Add field' }))
    await user.type(screen.getByPlaceholderText('Field name'), 'steps')

    await user.click(screen.getByRole('button', { name: /^Text/ }))
    await user.click(screen.getByRole('menuitemradio', { name: 'List' }))

    // The list's item type defaults to Text; turn it into a Tuple.
    await user.click(screen.getByRole('button', { name: /^Text/ }))
    await user.click(screen.getByRole('menuitemradio', { name: 'Tuple' }))

    // Sample preview should now render a nested tuple text input inside the list.
    expect(screen.getByText('Preview')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Create type' }))

    await waitFor(async () => {
      const stored = await db.customDataTypes.toArray()
      expect(stored.map((type) => type.name)).toContain('Recipe')
    })

    const recipeType = (await db.customDataTypes.toArray()).find((type) => type.name === 'Recipe')
    expect(recipeType?.schema).toEqual({
      kind: 'dictionary',
      fields: [
        {
          key: 'steps',
          typeRef: {
            kind: 'list',
            itemType: { kind: 'tuple', itemTypes: [{ kind: 'primitive', primitive: 'text' }] },
          },
        },
      ],
    })

    expect(await screen.findByText('Recipe')).toBeInTheDocument()
  })

  it('blocks deleting a custom data type still referenced by another one, surfacing the error inline', async () => {
    const user = userEvent.setup()
    render(<DataTypesPage />)

    // Create the referenced type first.
    await user.click(screen.getByRole('button', { name: 'New type' }))
    await user.type(screen.getByLabelText('Custom data type name'), 'Recipe')
    await user.click(screen.getByRole('button', { name: 'Create type' }))
    await screen.findByText('Recipe')

    // Create a second type with a field that references "Recipe".
    await user.click(screen.getByRole('button', { name: 'New type' }))
    await user.type(screen.getByLabelText('Custom data type name'), 'Wrapper')
    await user.click(screen.getByRole('button', { name: 'Add field' }))
    await user.type(screen.getByPlaceholderText('Field name'), 'ref')
    await user.click(screen.getByRole('button', { name: /^Text/ }))
    await user.click(screen.getByRole('menuitemradio', { name: 'Recipe' }))
    await user.click(screen.getByRole('button', { name: 'Create type' }))
    await screen.findByText('Wrapper')

    const recipeItem = screen.getByText('Recipe').closest('li') as HTMLElement
    await user.click(within(recipeItem).getByRole('button', { name: 'Delete Recipe' }))
    await user.click(within(recipeItem).getByRole('button', { name: 'Confirm delete' }))

    expect(await within(recipeItem).findByText(/still referenced/i)).toBeInTheDocument()
    expect(await screen.findByText('Recipe')).toBeInTheDocument()
  })

  it('creates a Note Type from a Dictionary custom type and lists it', async () => {
    const user = userEvent.setup()
    render(<DataTypesPage />)

    await user.click(screen.getByRole('button', { name: 'New type' }))
    await user.type(screen.getByLabelText('Custom data type name'), 'Recipe')
    await user.click(screen.getByRole('button', { name: 'Create type' }))
    await screen.findByText('Recipe')

    await user.click(screen.getByRole('button', { name: 'New note type' }))
    await user.type(screen.getByLabelText('Note type name'), 'Recipe Note')
    await user.click(screen.getByRole('button', { name: 'Recipe' }))
    await user.click(screen.getByRole('button', { name: 'Create note type' }))

    expect(await screen.findByText('Recipe Note')).toBeInTheDocument()
  })

  it('excludes non-Dictionary custom types from the Note Type picker', async () => {
    const user = userEvent.setup()
    render(<DataTypesPage />)

    // Create a Recipe (Dictionary) type and a Tags (List) type.
    await user.click(screen.getByRole('button', { name: 'New type' }))
    await user.type(screen.getByLabelText('Custom data type name'), 'Recipe')
    await user.click(screen.getByRole('button', { name: 'Create type' }))
    await screen.findByText('Recipe')

    await user.click(screen.getByRole('button', { name: 'New type' }))
    await user.type(screen.getByLabelText('Custom data type name'), 'Tags')
    await user.click(screen.getByRole('button', { name: /^Dictionary/ }))
    await user.click(screen.getByRole('menuitemradio', { name: 'List' }))
    await user.click(screen.getByRole('button', { name: 'Create type' }))
    await screen.findByText('Tags')

    await user.click(screen.getByRole('button', { name: 'New note type' }))
    await user.click(screen.getByRole('button', { name: /^Recipe/ }))

    expect(screen.getByRole('menuitemradio', { name: 'Recipe' })).toBeInTheDocument()
    expect(screen.queryByRole('menuitemradio', { name: 'Tags' })).not.toBeInTheDocument()
  })

  it('blocks deleting a note type still referenced by a note', async () => {
    const user = userEvent.setup()
    render(<DataTypesPage />)

    await user.click(screen.getByRole('button', { name: 'New type' }))
    await user.type(screen.getByLabelText('Custom data type name'), 'Recipe')
    await user.click(screen.getByRole('button', { name: 'Create type' }))
    await screen.findByText('Recipe')

    await user.click(screen.getByRole('button', { name: 'New note type' }))
    await user.type(screen.getByLabelText('Note type name'), 'Recipe Note')
    await user.click(screen.getByRole('button', { name: 'Recipe' }))
    await user.click(screen.getByRole('button', { name: 'Create note type' }))
    await screen.findByText('Recipe Note')

    const noteType = (await db.noteTypes.toArray())[0]
    const now = new Date().toISOString()
    const note: Note = {
      id: createId(),
      notebookId: null,
      boardId: null,
      noteTypeId: noteType.id,
      title: 'A recipe',
      metadata: { tags: [], createdAt: now, updatedAt: now, properties: {} },
      blockDocId: createId(),
      createdAt: now,
      updatedAt: now,
    }
    await db.notes.add(note)

    const noteTypeItem = screen.getByText('Recipe Note').closest('li') as HTMLElement
    await user.click(within(noteTypeItem).getByRole('button', { name: 'Delete Recipe Note' }))
    await user.click(within(noteTypeItem).getByRole('button', { name: 'Confirm delete' }))

    expect(await within(noteTypeItem).findByText(/still used by/i)).toBeInTheDocument()
  })
})
