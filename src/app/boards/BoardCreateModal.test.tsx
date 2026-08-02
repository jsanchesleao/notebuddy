import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { db } from '../../db/db'
import { createCustomDataType } from '../../domain/dataTypes/dataTypeRepository'
import { BoardCreateModal } from './BoardCreateModal'

const navigateMock = vi.fn()

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return { ...actual, useNavigate: () => navigateMock }
})

beforeEach(async () => {
  await db.boards.clear()
  await db.customDataTypes.clear()
  navigateMock.mockClear()
})

afterEach(() => {
  cleanup()
})

describe('BoardCreateModal', () => {
  it('renders nothing when closed', () => {
    render(
      <MemoryRouter>
        <BoardCreateModal open={false} onClose={() => {}} folderId={null} />
      </MemoryRouter>,
    )
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('creates a board from an existing option set and navigates to it', async () => {
    const user = userEvent.setup()
    const statusType = await createCustomDataType({
      name: 'Status',
      schema: {
        kind: 'primitive',
        primitive: 'select',
        options: [
          { id: '1', label: 'Todo', value: 'todo' },
          { id: '2', label: 'Done', value: 'done' },
        ],
      },
    })
    const onClose = vi.fn()

    render(
      <MemoryRouter>
        <BoardCreateModal open onClose={onClose} folderId={null} />
      </MemoryRouter>,
    )

    await user.type(screen.getByLabelText('New board title'), 'Sprint board')
    await user.click(screen.getByRole('button', { name: /Choose an option set/ }))
    await user.click(screen.getByRole('menuitemradio', { name: 'Status' }))
    await user.click(screen.getByRole('button', { name: 'Create board' }))

    const created = await waitFor(async () => {
      const boards = await db.boards.toArray()
      expect(boards).toHaveLength(1)
      return boards[0]
    })

    expect(created.title).toBe('Sprint board')
    expect(created.statusTypeId).toBe(statusType.id)
    expect(created.columns.map((c) => c.name)).toEqual(['Todo', 'Done'])
    expect(onClose).toHaveBeenCalled()
    expect(navigateMock).toHaveBeenCalledWith(`/boards/${created.id}`)
  })

  it('does nothing on submit without a title', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <BoardCreateModal open onClose={() => {}} folderId={null} />
      </MemoryRouter>,
    )

    await user.click(screen.getByRole('button', { name: 'Create board' }))

    expect(await db.boards.count()).toBe(0)
    expect(navigateMock).not.toHaveBeenCalled()
  })

  it('shows an error when submitting without choosing a column set', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <BoardCreateModal open onClose={() => {}} folderId={null} />
      </MemoryRouter>,
    )

    await user.type(screen.getByLabelText('New board title'), 'Sprint board')
    await user.click(screen.getByRole('button', { name: 'Create board' }))

    expect(screen.getByText(/Choose or create a column set/)).toBeInTheDocument()
    expect(await db.boards.count()).toBe(0)
  })

  it('cancels via the Cancel button without creating a board', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(
      <MemoryRouter>
        <BoardCreateModal open onClose={onClose} folderId={null} />
      </MemoryRouter>,
    )

    await user.type(screen.getByLabelText('New board title'), 'Discarded')
    await user.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(onClose).toHaveBeenCalled()
    expect(await db.boards.count()).toBe(0)
  })
})
