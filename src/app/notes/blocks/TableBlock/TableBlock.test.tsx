import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createEmptyBlock } from '../../../../domain/blocks/noteBlocksFactory'
import { TableBlock } from './TableBlock'

afterEach(() => {
  cleanup()
})

describe('TableBlock', () => {
  it('renders the initial 2x2 grid of cells', () => {
    const block = createEmptyBlock('table')
    render(<TableBlock block={block} onUpdate={vi.fn()} />)

    expect(screen.getByLabelText('Row 1, column 1')).toBeInTheDocument()
    expect(screen.getByLabelText('Row 2, column 2')).toBeInTheDocument()
  })

  it('debounces onUpdate after editing a cell', async () => {
    const block = createEmptyBlock('table')
    const onUpdate = vi.fn()
    const user = userEvent.setup()

    render(<TableBlock block={block} onUpdate={onUpdate} />)
    await user.type(screen.getByLabelText('Row 1, column 1'), 'hi')

    expect(onUpdate).not.toHaveBeenCalled()

    await waitFor(() => expect(onUpdate).toHaveBeenCalledTimes(1), { timeout: 1000 })
    expect(onUpdate.mock.calls[0][0].rows[0][0]).toEqual({ value: 'hi' })
  })

  it('adds and removes a row immediately (no debounce)', async () => {
    const block = createEmptyBlock('table')
    const onUpdate = vi.fn()
    const user = userEvent.setup()

    render(<TableBlock block={block} onUpdate={onUpdate} />)
    await user.click(screen.getByRole('button', { name: 'Row' }))

    expect(onUpdate).toHaveBeenCalledTimes(1)
    expect(onUpdate.mock.calls[0][0].rows).toHaveLength(3)
    expect(screen.getByLabelText('Row 3, column 1')).toBeInTheDocument()

    await user.click(screen.getByLabelText('Delete row 3'))
    expect(onUpdate).toHaveBeenCalledTimes(2)
    expect(onUpdate.mock.calls[1][0].rows).toHaveLength(2)
  })

  it('adds and removes a column immediately (no debounce)', async () => {
    const block = createEmptyBlock('table')
    const onUpdate = vi.fn()
    const user = userEvent.setup()

    render(<TableBlock block={block} onUpdate={onUpdate} />)
    await user.click(screen.getByRole('button', { name: 'Column' }))

    expect(onUpdate.mock.calls[0][0].rows[0]).toHaveLength(3)
    expect(screen.getByLabelText('Row 1, column 3')).toBeInTheDocument()

    await user.click(screen.getByLabelText('Delete column 3'))
    expect(onUpdate.mock.calls[1][0].rows[0]).toHaveLength(2)
  })

  it('does not allow removing the last row or column', () => {
    const block = { ...createEmptyBlock('table'), rows: [[{ value: '' }]] }
    render(<TableBlock block={block} onUpdate={vi.fn()} />)

    expect(screen.getByLabelText('Delete row 1')).toBeDisabled()
    expect(screen.getByLabelText('Delete column 1')).toBeDisabled()
  })
})
