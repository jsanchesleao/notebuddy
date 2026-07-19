import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createOpfsMemoryDriver } from '../../../../lib/opfs/opfsMemoryDriver'
import { setOpfsDriverForTesting } from '../../../../lib/opfs/opfsDriver'
import { createEmptyBlock } from '../../../../domain/blocks/noteBlocksFactory'
import { ImageBlock } from './ImageBlock'

beforeEach(() => {
  setOpfsDriverForTesting(createOpfsMemoryDriver())
})

afterEach(() => {
  cleanup()
})

describe('ImageBlock', () => {
  it('shows a placeholder when no image has been chosen yet', () => {
    const block = createEmptyBlock('image')
    render(<ImageBlock block={block} noteId="note-1" onUpdate={vi.fn()} />)

    expect(screen.getByText('No image selected')).toBeInTheDocument()
  })

  it('writes the chosen file to OPFS and reports the new opfsPath', async () => {
    const block = createEmptyBlock('image')
    const onUpdate = vi.fn()
    const user = userEvent.setup()
    const file = new File(['fake-image-bytes'], 'photo.png', { type: 'image/png' })

    render(<ImageBlock block={block} noteId="note-1" onUpdate={onUpdate} />)
    await user.upload(screen.getByLabelText('Choose image file'), file)

    await waitFor(() => expect(onUpdate).toHaveBeenCalledTimes(1))
    const [[patch]] = onUpdate.mock.calls
    expect(patch.opfsPath).toMatch(/^notes\/note-1\/.*-photo\.png$/)
  })

  it('applies a width preset immediately', async () => {
    const block = { ...createEmptyBlock('image'), opfsPath: 'notes/note-1/x-a.png' }
    const onUpdate = vi.fn()
    const user = userEvent.setup()

    render(<ImageBlock block={block} noteId="note-1" onUpdate={onUpdate} />)
    await user.click(screen.getByRole('button', { name: 'M' }))

    expect(onUpdate).toHaveBeenCalledWith({ width: 480 })
  })

  it('debounces caption edits', async () => {
    const block = createEmptyBlock('image')
    const onUpdate = vi.fn()
    const user = userEvent.setup()

    render(<ImageBlock block={block} noteId="note-1" onUpdate={onUpdate} />)
    await user.type(screen.getByLabelText('Image caption'), 'A cat')

    expect(onUpdate).not.toHaveBeenCalled()
    await waitFor(() => expect(onUpdate).toHaveBeenCalledWith({ caption: 'A cat' }), {
      timeout: 1000,
    })
  })

  it('sets alignment and reflects the active alignment button', async () => {
    const block = { ...createEmptyBlock('image'), align: 'center' as const }
    const onUpdate = vi.fn()
    const user = userEvent.setup()

    render(<ImageBlock block={block} noteId="note-1" onUpdate={onUpdate} />)

    expect(screen.getByRole('button', { name: 'Align center' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )

    await user.click(screen.getByRole('button', { name: 'Align right' }))
    expect(onUpdate).toHaveBeenCalledWith({ align: 'right' })
  })

  it('opens the file picker automatically when autoOpenPicker is set, once', () => {
    const block = createEmptyBlock('image')
    const onPickerOpened = vi.fn()
    const clickSpy = vi.spyOn(HTMLInputElement.prototype, 'click').mockImplementation(() => {})

    const { rerender } = render(
      <ImageBlock
        block={block}
        noteId="note-1"
        onUpdate={vi.fn()}
        autoOpenPicker
        onPickerOpened={onPickerOpened}
      />,
    )

    expect(clickSpy).toHaveBeenCalledTimes(1)
    expect(onPickerOpened).toHaveBeenCalledTimes(1)

    rerender(
      <ImageBlock
        block={block}
        noteId="note-1"
        onUpdate={vi.fn()}
        autoOpenPicker={false}
        onPickerOpened={onPickerOpened}
      />,
    )
    expect(clickSpy).toHaveBeenCalledTimes(1)

    clickSpy.mockRestore()
  })

  it('shows the caption as static text only when non-empty, and focuses the input on click', async () => {
    const block = { ...createEmptyBlock('image'), caption: 'A cat napping' }
    const user = userEvent.setup()

    render(<ImageBlock block={block} noteId="note-1" onUpdate={vi.fn()} />)

    const captionText = screen.getByText('A cat napping')
    expect(screen.getByLabelText('Image caption')).not.toHaveFocus()

    await user.click(captionText)
    expect(screen.getByLabelText('Image caption')).toHaveFocus()
  })

  it('renders no static caption text when the caption is empty', () => {
    const block = createEmptyBlock('image')
    render(<ImageBlock block={block} noteId="note-1" onUpdate={vi.fn()} />)

    // Toolbar-only buttons: replace, 4 width presets, 3 alignment — no caption button.
    expect(screen.getAllByRole('button')).toHaveLength(8)
    expect(screen.getByLabelText('Image caption')).toHaveValue('')
  })
})
