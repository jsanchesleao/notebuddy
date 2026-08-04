import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { db } from '../../db/db'
import { createOpfsMemoryDriver } from '../../lib/opfs/opfsMemoryDriver'
import { setOpfsDriverForTesting } from '../../lib/opfs/opfsDriver'
import { createBoard } from '../../domain/boards/boardRepository'
import { createCustomDataType } from '../../domain/dataTypes/dataTypeRepository'
import { createNote, getNote } from '../../domain/notes/noteRepository'
import { BoardCardDetails } from './BoardCardDetails'

beforeEach(async () => {
  await db.boards.clear()
  await db.customDataTypes.clear()
  await db.notes.clear()
  setOpfsDriverForTesting(createOpfsMemoryDriver())
})

afterEach(() => {
  cleanup()
})

describe('BoardCardDetails', () => {
  it('starts collapsed', async () => {
    const statusType = await createCustomDataType({
      name: 'Status',
      schema: {
        kind: 'primitive',
        primitive: 'select',
        options: [{ id: '1', label: 'Todo', value: 'todo' }],
      },
    })
    const board = await createBoard({ title: 'Board', folderId: null, statusTypeId: statusType.id })
    const note = await createNote({ notebookId: null, boardId: board.id, title: 'Card' })

    render(<BoardCardDetails note={note} />)

    expect(
      screen.getByRole('button', { name: 'Card details', expanded: false }),
    ).toBeInTheDocument()
    expect(screen.queryByLabelText('Card description')).not.toBeInTheDocument()
  })

  it('adds and saves a description via click-to-edit once expanded', async () => {
    const statusType = await createCustomDataType({
      name: 'Status',
      schema: {
        kind: 'primitive',
        primitive: 'select',
        options: [{ id: '1', label: 'Todo', value: 'todo' }],
      },
    })
    const board = await createBoard({ title: 'Board', folderId: null, statusTypeId: statusType.id })
    const note = await createNote({ notebookId: null, boardId: board.id, title: 'Card' })
    const user = userEvent.setup()

    render(<BoardCardDetails note={note} />)

    await user.click(screen.getByRole('button', { name: 'Card details' }))
    await user.click(screen.getByRole('button', { name: 'Add description' }))
    await user.type(screen.getByLabelText('Card description'), 'Notes about this card')
    await user.tab()

    await waitFor(async () => {
      const updated = await getNote(note.id)
      expect(updated?.description).toBe('Notes about this card')
    })

    // View mode reads the live `note` prop directly (same contract as PropertyRow's
    // SimplePropertyRow) — the isolated render here doesn't re-fetch after commit, so the
    // reflected text is covered by the NotePage-level test instead; this just checks the
    // form closes back to view mode after a successful commit.
    expect(screen.queryByLabelText('Card description')).not.toBeInTheDocument()
  })

  it('discards the draft on Escape', async () => {
    const statusType = await createCustomDataType({
      name: 'Status',
      schema: {
        kind: 'primitive',
        primitive: 'select',
        options: [{ id: '1', label: 'Todo', value: 'todo' }],
      },
    })
    const board = await createBoard({ title: 'Board', folderId: null, statusTypeId: statusType.id })
    const note = await createNote({ notebookId: null, boardId: board.id, title: 'Card' })
    const user = userEvent.setup()

    render(<BoardCardDetails note={note} />)

    await user.click(screen.getByRole('button', { name: 'Card details' }))
    await user.click(screen.getByRole('button', { name: 'Add description' }))
    await user.type(screen.getByLabelText('Card description'), 'Discard me')
    await user.keyboard('{Escape}')

    expect(screen.queryByLabelText('Card description')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Add description' })).toBeInTheDocument()
    const updated = await getNote(note.id)
    expect(updated?.description).toBeUndefined()
  })
})
