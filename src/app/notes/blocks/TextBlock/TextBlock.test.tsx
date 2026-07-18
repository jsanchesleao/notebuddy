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
    const { container } = render(
      <TextBlock block={block} onUpdate={vi.fn()} onConvert={vi.fn()} onSplit={vi.fn()} />,
    )

    const editable = container.querySelector('.ProseMirror')
    expect(editable).toBeTruthy()
    expect(editable).toHaveAttribute('contenteditable', 'true')
  })

  it('debounces onUpdate while typing, flushing the pending save on unmount', async () => {
    const block = createEmptyBlock('text')
    const onUpdate = vi.fn()
    const user = userEvent.setup()

    const { container, unmount } = render(
      <TextBlock block={block} onUpdate={onUpdate} onConvert={vi.fn()} onSplit={vi.fn()} />,
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
      <TextBlock block={block} onUpdate={vi.fn()} onConvert={vi.fn()} onSplit={vi.fn()} />,
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
      <TextBlock block={block} onUpdate={vi.fn()} onConvert={vi.fn()} onSplit={vi.fn()} />,
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
      <TextBlock block={block} onUpdate={onUpdate} onConvert={onConvert} onSplit={vi.fn()} />,
    )
    const editable = container.querySelector('.ProseMirror') as HTMLElement

    await user.click(editable)
    await user.type(editable, '/tab')
    await user.click(getByRole('menuitem', { name: 'Table' }))

    expect(onConvert).toHaveBeenCalledWith('table')
  })

  it('calls onSplit and not onUpdate/onConvert when Enter is pressed', async () => {
    const block = createEmptyBlock('text')
    const onSplit = vi.fn()
    const user = userEvent.setup()

    const { container } = render(
      <TextBlock block={block} onUpdate={vi.fn()} onConvert={vi.fn()} onSplit={onSplit} />,
    )
    const editable = container.querySelector('.ProseMirror') as HTMLElement

    await user.click(editable)
    await user.type(editable, 'Hello{Enter}')

    expect(onSplit).toHaveBeenCalledTimes(1)
    expect(editable.textContent).toBe('Hello')
  })

  it('inserts a line break instead of calling onSplit on Shift+Enter', async () => {
    const block = createEmptyBlock('text')
    const onSplit = vi.fn()
    const user = userEvent.setup()

    const { container } = render(
      <TextBlock block={block} onUpdate={vi.fn()} onConvert={vi.fn()} onSplit={onSplit} />,
    )
    const editable = container.querySelector('.ProseMirror') as HTMLElement

    await user.click(editable)
    await user.type(editable, 'Hello{Shift>}{Enter}{/Shift}World')

    expect(onSplit).not.toHaveBeenCalled()
    expect(editable.querySelector('br')).toBeTruthy()
  })

  it('does not call onSplit when Enter selects a slash-command entry', async () => {
    const block = createEmptyBlock('text')
    const onConvert = vi.fn()
    const onSplit = vi.fn()
    const user = userEvent.setup()

    const { container } = render(
      <TextBlock block={block} onUpdate={vi.fn()} onConvert={onConvert} onSplit={onSplit} />,
    )
    const editable = container.querySelector('.ProseMirror') as HTMLElement

    await user.click(editable)
    await user.type(editable, '/tab{Enter}')

    expect(onConvert).toHaveBeenCalledWith('table')
    expect(onSplit).not.toHaveBeenCalled()
  })
})
