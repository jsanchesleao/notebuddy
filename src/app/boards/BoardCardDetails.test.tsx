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
  it('saves an edited description after a debounce', async () => {
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

    await user.type(screen.getByLabelText('Card description'), 'Notes about this card')

    await waitFor(
      async () => {
        const updated = await getNote(note.id)
        expect(updated?.description).toBe('Notes about this card')
      },
      { timeout: 1000 },
    )
  })

  it('uploads an image and shows it', async () => {
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

    const file = new File(['x'], 'cover.png', { type: 'image/png' })
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    await user.upload(input, file)

    await waitFor(async () => {
      const updated = await getNote(note.id)
      expect(updated?.cardImagePath).toBeTruthy()
    })
  })
})
