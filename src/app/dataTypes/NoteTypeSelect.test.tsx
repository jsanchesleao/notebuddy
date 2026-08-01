import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { NoteType } from '../../domain/entities.types'
import { NoteTypeSelect } from './NoteTypeSelect'

afterEach(() => {
  cleanup()
})

function makeNoteType(id: string, name: string): NoteType {
  return { id, name, customTypeId: 'custom-1', createdAt: 'now', updatedAt: 'now' }
}

describe('NoteTypeSelect', () => {
  it('shows Blank as the trigger label when value is null', () => {
    render(<NoteTypeSelect value={null} onChange={() => {}} noteTypes={[]} />)
    expect(screen.getByRole('button', { name: /Blank/ })).toBeInTheDocument()
  })

  it('lists each note type as a menuitemradio', async () => {
    const noteTypes = [makeNoteType('type-1', 'Journal'), makeNoteType('type-2', 'Recipe')]
    const user = userEvent.setup()
    render(<NoteTypeSelect value={null} onChange={() => {}} noteTypes={noteTypes} />)

    await user.click(screen.getByRole('button', { name: /Blank/ }))
    expect(screen.getByRole('menuitemradio', { name: 'Journal' })).toBeInTheDocument()
    expect(screen.getByRole('menuitemradio', { name: 'Recipe' })).toBeInTheDocument()
  })

  it('calls onChange with the note type id when an entry is clicked', async () => {
    const noteTypes = [makeNoteType('type-1', 'Journal')]
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<NoteTypeSelect value={null} onChange={onChange} noteTypes={noteTypes} />)

    await user.click(screen.getByRole('button', { name: /Blank/ }))
    await user.click(screen.getByRole('menuitemradio', { name: 'Journal' }))

    expect(onChange).toHaveBeenCalledWith('type-1')
  })

  it('calls onChange with null when Blank is clicked', async () => {
    const noteTypes = [makeNoteType('type-1', 'Journal')]
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<NoteTypeSelect value="type-1" onChange={onChange} noteTypes={noteTypes} />)

    await user.click(screen.getByRole('button', { name: /Journal/ }))
    await user.click(screen.getByRole('menuitemradio', { name: 'Blank' }))

    expect(onChange).toHaveBeenCalledWith(null)
  })

  it('prepends triggerPrefix to the trigger label', () => {
    render(
      <NoteTypeSelect value={null} onChange={() => {}} noteTypes={[]} triggerPrefix="Default:" />,
    )
    expect(screen.getByRole('button', { name: /Default: Blank/ })).toBeInTheDocument()
  })
})
