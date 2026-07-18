import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { db } from '../../../db/db'
import { createId } from '../../../domain/ids'
import { insertBlock, loadNoteBlocks } from '../../../domain/blocks/noteBlocksStore'
import { createEmptyBlock } from '../../../domain/blocks/noteBlocksFactory'
import { NoteBlockList } from './NoteBlockList'

beforeEach(async () => {
  await db.yjsUpdates.clear()
})

afterEach(() => {
  cleanup()
})

describe('NoteBlockList', () => {
  it('renders a mix of pre-seeded block types', async () => {
    const docId = createId()
    const { doc } = await loadNoteBlocks(docId)
    await insertBlock(docId, doc, createEmptyBlock('text'), 0)
    await insertBlock(docId, doc, createEmptyBlock('table'), 1)
    await insertBlock(docId, doc, createEmptyBlock('code'), 2)

    render(<NoteBlockList noteId="note-1" blockDocId={docId} />)

    await waitFor(() => {
      expect(document.querySelector('.ProseMirror')).toBeTruthy()
    })
    expect(screen.getByLabelText('Row 1, column 1')).toBeInTheDocument()
    expect(screen.getByLabelText('Code')).toBeInTheDocument()
  })

  it('inserts a new block via the add-block menu', async () => {
    const docId = createId()
    await loadNoteBlocks(docId)
    const user = userEvent.setup()

    render(<NoteBlockList noteId="note-1" blockDocId={docId} />)
    await waitFor(() => expect(screen.getByLabelText('Add block')).toBeInTheDocument())

    await user.click(screen.getByLabelText('Add block'))
    await user.click(screen.getByRole('button', { name: 'Table' }))

    await waitFor(() => expect(screen.getByLabelText('Row 1, column 1')).toBeInTheDocument())
  })

  it('deletes a block via the grip handle actions menu', async () => {
    const docId = createId()
    const { doc } = await loadNoteBlocks(docId)
    await insertBlock(docId, doc, createEmptyBlock('table'), 0)
    const user = userEvent.setup()

    render(<NoteBlockList noteId="note-1" blockDocId={docId} />)
    await waitFor(() => expect(screen.getByLabelText('Row 1, column 1')).toBeInTheDocument())

    await user.click(screen.getByLabelText('Reorder block'))
    await user.click(screen.getByRole('menuitem', { name: 'Delete' }))

    await waitFor(() => expect(screen.queryByLabelText('Row 1, column 1')).not.toBeInTheDocument())
  })

  it('opens the actions menu on a plain click without starting a drag', async () => {
    const docId = createId()
    const { doc } = await loadNoteBlocks(docId)
    await insertBlock(docId, doc, createEmptyBlock('table'), 0)
    const user = userEvent.setup()

    render(<NoteBlockList noteId="note-1" blockDocId={docId} />)
    await waitFor(() => expect(screen.getByLabelText('Row 1, column 1')).toBeInTheDocument())

    await user.click(screen.getByLabelText('Reorder block'))

    expect(screen.getByRole('menu')).toBeInTheDocument()
    expect(screen.getByLabelText('Row 1, column 1')).toBeInTheDocument()
  })

  it('closes the actions menu when clicking outside', async () => {
    const docId = createId()
    const { doc } = await loadNoteBlocks(docId)
    await insertBlock(docId, doc, createEmptyBlock('table'), 0)
    const user = userEvent.setup()

    render(<NoteBlockList noteId="note-1" blockDocId={docId} />)
    await waitFor(() => expect(screen.getByLabelText('Row 1, column 1')).toBeInTheDocument())

    await user.click(screen.getByLabelText('Reorder block'))
    expect(screen.getByRole('menu')).toBeInTheDocument()

    await user.click(document.body)
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })

  it('converts a text block to another type via the slash-command menu', async () => {
    const docId = createId()
    const { doc } = await loadNoteBlocks(docId)
    await insertBlock(docId, doc, createEmptyBlock('text'), 0)
    const user = userEvent.setup()

    render(<NoteBlockList noteId="note-1" blockDocId={docId} />)
    await waitFor(() => {
      expect(document.querySelector('.ProseMirror')).toBeTruthy()
    })

    const editable = document.querySelectorAll('.ProseMirror')[0] as HTMLElement
    await user.click(editable)
    await user.type(editable, '/tab')
    await user.click(screen.getByRole('menuitem', { name: 'Table' }))

    await waitFor(() => expect(screen.getByLabelText('Row 1, column 1')).toBeInTheDocument())
  })

  it('always renders a trailing empty text block, even for a note with existing content', async () => {
    const docId = createId()
    const { doc } = await loadNoteBlocks(docId)
    await insertBlock(docId, doc, createEmptyBlock('text'), 0)
    await insertBlock(docId, doc, createEmptyBlock('table'), 1)

    render(<NoteBlockList noteId="note-1" blockDocId={docId} />)

    // 1 ProseMirror for the real text block + 1 for the trailing phantom
    // (the table block renders no `.ProseMirror`).
    await waitFor(() => {
      expect(document.querySelectorAll('.ProseMirror').length).toBe(2)
    })
  })

  it('does not autofocus the trailing phantom when the note already has content', async () => {
    const docId = createId()
    const { doc } = await loadNoteBlocks(docId)
    await insertBlock(docId, doc, createEmptyBlock('table'), 0)

    render(<NoteBlockList noteId="note-1" blockDocId={docId} />)

    await waitFor(() => expect(screen.getByLabelText('Row 1, column 1')).toBeInTheDocument())
    const trailing = document.querySelectorAll('.ProseMirror')[0] as HTMLElement
    expect(document.activeElement).not.toBe(trailing)
  })

  it('promotes the trailing phantom to a real block on first edit, and a new phantom appears after it', async () => {
    const docId = createId()
    await loadNoteBlocks(docId)
    const user = userEvent.setup()

    render(<NoteBlockList noteId="note-1" blockDocId={docId} />)
    await waitFor(() => expect(document.querySelector('.ProseMirror')).toBeTruthy())

    const trailing = document.querySelector('.ProseMirror') as HTMLElement
    await user.click(trailing)
    await user.type(trailing, 'Hello')

    await waitFor(
      () => {
        expect(document.querySelectorAll('.ProseMirror').length).toBe(2)
      },
      { timeout: 1000 },
    )

    const reloaded = await loadNoteBlocks(docId)
    expect(reloaded.blocks).toHaveLength(1)
    expect(reloaded.blocks[0].type).toBe('text')
  })

  it('focuses the new trailing phantom after promotion', async () => {
    const docId = createId()
    await loadNoteBlocks(docId)
    const user = userEvent.setup()

    render(<NoteBlockList noteId="note-1" blockDocId={docId} />)
    await waitFor(() => expect(document.querySelector('.ProseMirror')).toBeTruthy())

    const trailing = document.querySelector('.ProseMirror') as HTMLElement
    await user.click(trailing)
    await user.type(trailing, 'Hello')

    await waitFor(
      () => {
        expect(document.querySelectorAll('.ProseMirror').length).toBe(2)
      },
      { timeout: 1000 },
    )

    await waitFor(() => {
      const newTrailing = document.querySelectorAll('.ProseMirror')[1]
      expect(document.activeElement).toBe(newTrailing)
    })
  })

  it('focuses the trailing phantom after converting the last block via slash-command', async () => {
    const docId = createId()
    const { doc } = await loadNoteBlocks(docId)
    await insertBlock(docId, doc, createEmptyBlock('text'), 0)
    const user = userEvent.setup()

    render(<NoteBlockList noteId="note-1" blockDocId={docId} />)
    await waitFor(() => {
      expect(document.querySelectorAll('.ProseMirror').length).toBe(2)
    })

    const editable = document.querySelectorAll('.ProseMirror')[0] as HTMLElement
    await user.click(editable)
    await user.type(editable, '/tab')
    await user.click(screen.getByRole('menuitem', { name: 'Table' }))

    await waitFor(() => expect(screen.getByLabelText('Row 1, column 1')).toBeInTheDocument())
    await waitFor(() => {
      const trailing = document.querySelector('.ProseMirror')
      expect(document.activeElement).toBe(trailing)
    })
  })

  it('converts the trailing phantom itself via slash-command without appending a duplicate block', async () => {
    // Regression test: converting the phantom before its own debounced save
    // fires used to leave a stale pending save that flushed on unmount,
    // appending a second block with the same id once the phantom was
    // replaced by a fresh one (see TextBlock's slash-command onSelect handler).
    const docId = createId()
    await loadNoteBlocks(docId)
    const user = userEvent.setup()

    render(<NoteBlockList noteId="note-1" blockDocId={docId} />)
    await waitFor(() => expect(document.querySelector('.ProseMirror')).toBeTruthy())

    const trailing = document.querySelector('.ProseMirror') as HTMLElement
    await user.click(trailing)
    await user.type(trailing, '/tab')
    // Convert immediately, well before the 500ms save-debounce would fire.
    await user.click(screen.getByRole('menuitem', { name: 'Table' }))

    await waitFor(() => expect(screen.getByLabelText('Row 1, column 1')).toBeInTheDocument())

    // Wait past the debounce window to let any stale flush occur, then assert
    // exactly one block was persisted (the table), not two.
    await new Promise((resolve) => setTimeout(resolve, 700))
    const reloaded = await loadNoteBlocks(docId)
    expect(reloaded.blocks).toHaveLength(1)
    expect(reloaded.blocks[0].type).toBe('table')
    expect(screen.getAllByLabelText('Row 1, column 1')).toHaveLength(1)
  })

  it('renders only one add-block button, after the trailing phantom block', async () => {
    const docId = createId()
    const { doc } = await loadNoteBlocks(docId)
    await insertBlock(docId, doc, createEmptyBlock('text'), 0)
    await insertBlock(docId, doc, createEmptyBlock('table'), 1)

    render(<NoteBlockList noteId="note-1" blockDocId={docId} />)

    await waitFor(() => expect(screen.getByLabelText('Row 1, column 1')).toBeInTheDocument())
    expect(screen.getAllByLabelText('Add block')).toHaveLength(1)
  })

  it('pressing Enter in a real block inserts a new empty text block after it and focuses it', async () => {
    const docId = createId()
    const { doc } = await loadNoteBlocks(docId)
    await insertBlock(docId, doc, createEmptyBlock('text'), 0)
    const user = userEvent.setup()

    render(<NoteBlockList noteId="note-1" blockDocId={docId} />)
    await waitFor(() => {
      expect(document.querySelectorAll('.ProseMirror').length).toBe(2)
    })

    const editable = document.querySelectorAll('.ProseMirror')[0] as HTMLElement
    await user.click(editable)
    await user.type(editable, 'Hello{Enter}')

    await waitFor(() => {
      expect(document.querySelectorAll('.ProseMirror').length).toBe(3)
    })

    const reloaded = await loadNoteBlocks(docId)
    expect(reloaded.blocks).toHaveLength(2)
    expect(reloaded.blocks[1].type).toBe('text')

    await waitFor(() => {
      const newBlockEditable = document.querySelectorAll('.ProseMirror')[1]
      expect(document.activeElement).toBe(newBlockEditable)
    })
  })

  it('pressing Enter in the trailing phantom promotes it and focuses a fresh phantom', async () => {
    const docId = createId()
    await loadNoteBlocks(docId)
    const user = userEvent.setup()

    render(<NoteBlockList noteId="note-1" blockDocId={docId} />)
    await waitFor(() => expect(document.querySelector('.ProseMirror')).toBeTruthy())

    const trailing = document.querySelector('.ProseMirror') as HTMLElement
    await user.click(trailing)
    await user.type(trailing, 'Hello{Enter}')

    await waitFor(() => {
      expect(document.querySelectorAll('.ProseMirror').length).toBe(2)
    })

    const reloaded = await loadNoteBlocks(docId)
    expect(reloaded.blocks).toHaveLength(1)
    expect(reloaded.blocks[0].type).toBe('text')

    await waitFor(() => {
      const newTrailing = document.querySelectorAll('.ProseMirror')[1]
      expect(document.activeElement).toBe(newTrailing)
    })
  })
})
