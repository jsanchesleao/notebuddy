import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { db } from '../../db/db'
import { createCustomDataType } from '../../domain/dataTypes/dataTypeRepository'
import { createBoard, setColumnVisibility } from '../../domain/boards/boardRepository'
import type { Board } from '../../domain/entities.types'
import { HiddenColumnsControl } from './HiddenColumnsControl'

beforeEach(async () => {
  await db.boards.clear()
  await db.customDataTypes.clear()
})

afterEach(() => {
  cleanup()
})

async function setupBoard(): Promise<Board> {
  const statusType = await createCustomDataType({
    name: 'Status',
    schema: {
      kind: 'primitive',
      primitive: 'select',
      options: [
        { id: '1', label: 'To do', value: 'todo' },
        { id: '2', label: 'Doing', value: 'doing' },
        { id: '3', label: 'Done', value: 'done' },
      ],
    },
  })
  return createBoard({ title: 'Sprint board', folderId: null, statusTypeId: statusType.id })
}

describe('HiddenColumnsControl', () => {
  it('renders nothing when every column is visible', () => {
    render(
      <HiddenColumnsControl
        boardId="board-1"
        columns={[{ id: '1', name: 'To do', tag: 'todo', color: '#fff', visible: true }]}
      />,
    )

    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('lists hidden columns with a count and unhides on click', async () => {
    const user = userEvent.setup()
    const board = await setupBoard()
    await setColumnVisibility(board.id, '2', false)
    await setColumnVisibility(board.id, '3', false)
    const updatedBoard = await db.boards.get(board.id)

    render(<HiddenColumnsControl boardId={board.id} columns={updatedBoard!.columns} />)

    expect(screen.getByRole('button', { name: 'Hidden (2)' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Hidden (2)' }))
    expect(screen.getByText('Doing')).toBeInTheDocument()
    expect(screen.getByText('Done')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Show column Doing' }))

    await waitFor(async () => {
      const updated = await db.boards.get(board.id)
      expect(updated?.columns.find((column) => column.id === '2')?.visible).toBe(true)
    })

    // Dropdown stays open after unhiding one column, and the still-hidden one remains listed.
    expect(screen.getByRole('menu')).toBeInTheDocument()
    expect(screen.getByText('Done')).toBeInTheDocument()
  })
})
