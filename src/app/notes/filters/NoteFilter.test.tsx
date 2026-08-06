import { useEffect, useState } from 'react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../../db/db'
import { createNote, setNoteTags } from '../../../domain/notes/noteRepository'
import { listCustomDataTypes } from '../../../domain/dataTypes/dataTypeRepository'
import { filterNotes } from '../../../domain/notes/noteFilterMatch'
import type { FilterState } from '../../../domain/notes/noteFilter.types'
import type { Note } from '../../../domain/entities.types'
import { NoteFilter } from './NoteFilter'

function Harness({ notes }: { notes: Note[] }) {
  const [filterState, setFilterState] = useState<FilterState>({ mode: 'and', blocks: [] })
  const customTypes = useLiveQuery(() => listCustomDataTypes(), [], [])
  const [filtered, setFiltered] = useState<Note[]>([])

  useEffect(() => {
    let cancelled = false
    const resolveCustomType = (id: string) => customTypes?.find((type) => type.id === id)
    filterNotes(notes, filterState, resolveCustomType).then((result) => {
      if (!cancelled) setFiltered(result)
    })
    return () => {
      cancelled = true
    }
  }, [notes, filterState, customTypes])

  return (
    <>
      <NoteFilter notes={notes} value={filterState} onChange={setFilterState} />
      <ul>
        {filtered.map((note) => (
          <li key={note.id}>{note.title}</li>
        ))}
      </ul>
    </>
  )
}

beforeEach(async () => {
  await db.notes.clear()
  await db.yjsUpdates.clear()
  await db.tags.clear()
  await db.customDataTypes.clear()
  await db.noteTypes.clear()
})

afterEach(() => {
  cleanup()
})

describe('NoteFilter', () => {
  it('narrows the note list to those matching a single criterion', async () => {
    const pancakes = await createNote({ notebookId: null, title: 'Recipe Pancakes' })
    await setNoteTags(pancakes.id, ['breakfast'])
    const dinner = await createNote({ notebookId: null, title: 'Recipe Dinner' })
    await setNoteTags(dinner.id, ['dinner'])
    const meeting = await createNote({ notebookId: null, title: 'Meeting notes' })
    await setNoteTags(meeting.id, ['work'])

    const notes = await db.notes.toArray()
    const user = userEvent.setup()
    render(<Harness notes={notes} />)

    await waitFor(() => {
      expect(screen.getByText('Recipe Pancakes')).toBeInTheDocument()
      expect(screen.getByText('Recipe Dinner')).toBeInTheDocument()
      expect(screen.getByText('Meeting notes')).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /Filter/ }))
    await user.click(screen.getByRole('button', { name: /Add block/ }))
    await user.click(screen.getByRole('button', { name: /Add criterion/ }))
    await user.click(screen.getByRole('menuitem', { name: 'Tag' }))
    await user.click(screen.getByRole('button', { name: /Choose a tag/ }))
    await user.click(screen.getByRole('menuitemradio', { name: 'breakfast' }))

    await waitFor(() => {
      expect(screen.getByText('Recipe Pancakes')).toBeInTheDocument()
      expect(screen.queryByText('Recipe Dinner')).not.toBeInTheDocument()
      expect(screen.queryByText('Meeting notes')).not.toBeInTheDocument()
    })
  })

  it('applies the AND/OR mode duality across two blocks', async () => {
    const pancakes = await createNote({ notebookId: null, title: 'Recipe Pancakes' })
    await setNoteTags(pancakes.id, ['breakfast'])
    const dinner = await createNote({ notebookId: null, title: 'Recipe Dinner' })
    await setNoteTags(dinner.id, ['dinner'])
    const meeting = await createNote({ notebookId: null, title: 'Meeting notes' })
    await setNoteTags(meeting.id, ['work'])

    const notes = await db.notes.toArray()
    const user = userEvent.setup()
    render(<Harness notes={notes} />)

    await user.click(screen.getByRole('button', { name: /Filter/ }))

    // Block 1: title contains "recipe" -> matches Pancakes + Dinner.
    await user.click(screen.getByRole('button', { name: /Add block/ }))
    await user.click(screen.getByRole('button', { name: /Add criterion/ }))
    await user.click(screen.getByRole('menuitem', { name: 'Title' }))
    await user.type(screen.getByRole('textbox'), 'recipe')

    await waitFor(() => {
      expect(screen.getByText('Recipe Pancakes')).toBeInTheDocument()
      expect(screen.getByText('Recipe Dinner')).toBeInTheDocument()
      expect(screen.queryByText('Meeting notes')).not.toBeInTheDocument()
    })

    // Block 2: tag = "work" -> matches Meeting notes.
    await user.click(screen.getByRole('button', { name: /Add block/ }))
    const addCriterionButtons = screen.getAllByRole('button', { name: /Add criterion/ })
    await user.click(addCriterionButtons[1])
    await user.click(screen.getByRole('menuitem', { name: 'Tag' }))
    await user.click(screen.getByRole('button', { name: /Choose a tag/ }))
    await user.click(screen.getByRole('menuitemradio', { name: 'work' }))

    // mode=and (default): criteria AND within a block, blocks OR together -> union of both blocks.
    await waitFor(() => {
      expect(screen.getByText('Recipe Pancakes')).toBeInTheDocument()
      expect(screen.getByText('Recipe Dinner')).toBeInTheDocument()
      expect(screen.getByText('Meeting notes')).toBeInTheDocument()
    })

    // mode=or: criteria OR within a block, blocks AND together -> intersection (title AND tag), which is empty.
    await user.click(screen.getByRole('button', { name: 'OR' }))

    await waitFor(() => {
      expect(screen.queryByText('Recipe Pancakes')).not.toBeInTheDocument()
      expect(screen.queryByText('Recipe Dinner')).not.toBeInTheDocument()
      expect(screen.queryByText('Meeting notes')).not.toBeInTheDocument()
    })
  })
})
