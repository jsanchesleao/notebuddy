import { cleanup, render } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createEmptyBlock } from '../../../../domain/blocks/noteBlocksFactory'
import { TextBlock } from './TextBlock'

afterEach(() => {
  cleanup()
})

describe('TextBlock', () => {
  it('renders a contenteditable surface seeded from the block content', () => {
    const block = createEmptyBlock('text')
    const { container } = render(<TextBlock block={block} onUpdate={vi.fn()} onConvert={vi.fn()} />)

    const editable = container.querySelector('.ProseMirror')
    expect(editable).toBeTruthy()
    expect(editable).toHaveAttribute('contenteditable', 'true')
  })

  it('debounces onUpdate while typing, flushing the pending save on unmount', async () => {
    const block = createEmptyBlock('text')
    const onUpdate = vi.fn()
    const user = userEvent.setup()

    const { container, unmount } = render(
      <TextBlock block={block} onUpdate={onUpdate} onConvert={vi.fn()} />,
    )
    const editable = container.querySelector('.ProseMirror') as HTMLElement

    await user.click(editable)
    await user.type(editable, 'Hello')

    expect(onUpdate).not.toHaveBeenCalled()

    unmount()

    expect(onUpdate).toHaveBeenCalledTimes(1)
    const [[patch]] = onUpdate.mock.calls
    expect(JSON.stringify(patch.content)).toContain('Hello')
  })

  it('shows a filtered slash-command menu when typing "/" at the start of the block', async () => {
    const block = createEmptyBlock('text')
    const user = userEvent.setup()

    const { container, getByRole, queryByRole } = render(
      <TextBlock block={block} onUpdate={vi.fn()} onConvert={vi.fn()} />,
    )
    const editable = container.querySelector('.ProseMirror') as HTMLElement

    await user.click(editable)
    await user.type(editable, '/tab')

    expect(getByRole('menuitem', { name: 'Table' })).toBeInTheDocument()
    expect(queryByRole('menuitem', { name: 'Text' })).not.toBeInTheDocument()
  })

  it('shows no menu items for a query that matches no block type', async () => {
    const block = createEmptyBlock('text')
    const user = userEvent.setup()

    const { container, queryByRole } = render(
      <TextBlock block={block} onUpdate={vi.fn()} onConvert={vi.fn()} />,
    )
    const editable = container.querySelector('.ProseMirror') as HTMLElement

    await user.click(editable)
    await user.type(editable, '/xyz')

    expect(queryByRole('menu')).not.toBeInTheDocument()
  })

  it('calls onConvert with the selected type when a slash-command entry is chosen', async () => {
    const block = createEmptyBlock('text')
    const onUpdate = vi.fn()
    const onConvert = vi.fn()
    const user = userEvent.setup()

    const { container, getByRole } = render(
      <TextBlock block={block} onUpdate={onUpdate} onConvert={onConvert} />,
    )
    const editable = container.querySelector('.ProseMirror') as HTMLElement

    await user.click(editable)
    await user.type(editable, '/tab')
    await user.click(getByRole('menuitem', { name: 'Table' }))

    expect(onConvert).toHaveBeenCalledWith('table')
  })
})
