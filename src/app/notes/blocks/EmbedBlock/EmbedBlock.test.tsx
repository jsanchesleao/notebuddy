import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createOpfsMemoryDriver } from '../../../../lib/opfs/opfsMemoryDriver'
import { setOpfsDriverForTesting } from '../../../../lib/opfs/opfsDriver'
import { createEmptyBlock } from '../../../../domain/blocks/noteBlocksFactory'
import { EmbedBlock } from './EmbedBlock'

beforeEach(() => {
  setOpfsDriverForTesting(createOpfsMemoryDriver())
})

afterEach(() => {
  cleanup()
})

describe('EmbedBlock', () => {
  it('shows a placeholder when no file has been chosen yet', () => {
    const block = createEmptyBlock('embed')
    render(<EmbedBlock block={block} noteId="note-1" onUpdate={vi.fn()} />)

    expect(screen.getByText('No file selected')).toBeInTheDocument()
  })

  it('writes the chosen file to OPFS and reports opfsPath + mimeType', async () => {
    const block = createEmptyBlock('embed')
    const onUpdate = vi.fn()
    const user = userEvent.setup()
    const file = new File(['%PDF-1.4'], 'doc.pdf', { type: 'application/pdf' })

    render(<EmbedBlock block={block} noteId="note-1" onUpdate={onUpdate} />)
    await user.upload(screen.getByLabelText('Choose file'), file)

    await waitFor(() => expect(onUpdate).toHaveBeenCalledTimes(1))
    const [[patch]] = onUpdate.mock.calls
    expect(patch.opfsPath).toMatch(/^notes\/note-1\/.*-doc\.pdf$/)
    expect(patch.mimeType).toBe('application/pdf')
  })

  it('renders a download file card with the file name for a non-image file', async () => {
    const driver = createOpfsMemoryDriver()
    setOpfsDriverForTesting(driver)
    await driver.writeFile('notes/note-1/asset-doc.pdf', new Blob(['%PDF']))

    const block = {
      ...createEmptyBlock('embed'),
      opfsPath: 'notes/note-1/asset-doc.pdf',
      mimeType: 'application/pdf',
    }
    render(<EmbedBlock block={block} noteId="note-1" onUpdate={vi.fn()} />)

    expect(await screen.findByText('doc.pdf')).toBeInTheDocument()
  })
})
