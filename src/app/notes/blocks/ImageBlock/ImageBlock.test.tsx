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
})
