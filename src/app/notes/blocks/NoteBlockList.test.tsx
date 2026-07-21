import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '../../../db/db'
import { createId } from '../../../domain/ids'
import { insertBlock, loadNoteBlocks } from '../../../domain/blocks/noteBlocksStore'
import { createEmptyBlock } from '../../../domain/blocks/noteBlocksFactory'
import { NoteBlockList } from './NoteBlockList'

function textBlockWith(text: string) {
  return {
    ...createEmptyBlock('text'),
    content: {
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text }] }],
    },
  }
}

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

  it('keeps focus on the promoted block when the idle debounce fires mid-typing', async () => {
    // Regression test: promoting the phantom via the idle save-debounce
    // (rather than an explicit Enter/Backspace/Delete/slash-selection) used
    // to steal focus into the brand-new, unrelated empty phantom, cutting the
    // user off mid-typing. Focus should stay on the block they were just
    // typing in, which is now the real (non-trailing) block.
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
      const promoted = document.querySelectorAll('.ProseMirror')[0]
      expect(document.activeElement).toBe(promoted)
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

  it('focuses the new block and opens the file picker when an image is inserted via the add-block menu', async () => {
    const docId = createId()
    await loadNoteBlocks(docId)
    const user = userEvent.setup()
    const clickSpy = vi.spyOn(HTMLInputElement.prototype, 'click').mockImplementation(() => {})

    render(<NoteBlockList noteId="note-1" blockDocId={docId} />)
    await waitFor(() => expect(screen.getByLabelText('Add block')).toBeInTheDocument())

    await user.click(screen.getByLabelText('Add block'))
    await user.click(screen.getByRole('button', { name: 'Image' }))

    await waitFor(() => expect(screen.getByLabelText('Choose image file')).toBeInTheDocument())
    const wrapper = screen
      .getByLabelText('Choose image file')
      .closest('[data-block-wrapper]') as HTMLElement

    await waitFor(() => expect(document.activeElement).toBe(wrapper))
    expect(clickSpy).toHaveBeenCalled()

    clickSpy.mockRestore()
  })

  it('focuses the new block and opens the file picker when an image is inserted via the slash-command menu', async () => {
    const docId = createId()
    const { doc } = await loadNoteBlocks(docId)
    await insertBlock(docId, doc, createEmptyBlock('text'), 0)
    const user = userEvent.setup()
    const clickSpy = vi.spyOn(HTMLInputElement.prototype, 'click').mockImplementation(() => {})

    render(<NoteBlockList noteId="note-1" blockDocId={docId} />)
    await waitFor(() => {
      expect(document.querySelector('.ProseMirror')).toBeTruthy()
    })

    const editable = document.querySelectorAll('.ProseMirror')[0] as HTMLElement
    await user.click(editable)
    await user.type(editable, '/image')
    await user.click(screen.getByRole('menuitem', { name: 'Image' }))

    await waitFor(() => expect(screen.getByLabelText('Choose image file')).toBeInTheDocument())
    const wrapper = screen
      .getByLabelText('Choose image file')
      .closest('[data-block-wrapper]') as HTMLElement

    await waitFor(() => expect(document.activeElement).toBe(wrapper))
    expect(clickSpy).toHaveBeenCalled()

    clickSpy.mockRestore()
  })

  it('focuses the new block and opens the file picker when the trailing phantom itself is converted to an image via slash-command', async () => {
    // Regression test: promoting the empty trailing phantom (not a real
    // pre-existing text block) goes through `onPromoteAsType`, a separate
    // code path from `handleConvertBlock` — easy to wire the focus/auto-open
    // behavior into one and forget the other.
    const docId = createId()
    await loadNoteBlocks(docId)
    const user = userEvent.setup()
    const clickSpy = vi.spyOn(HTMLInputElement.prototype, 'click').mockImplementation(() => {})

    render(<NoteBlockList noteId="note-1" blockDocId={docId} />)
    await waitFor(() => expect(document.querySelector('.ProseMirror')).toBeTruthy())

    const trailing = document.querySelector('.ProseMirror') as HTMLElement
    await user.click(trailing)
    await user.type(trailing, '/image')
    await user.click(screen.getByRole('menuitem', { name: 'Image' }))

    await waitFor(() => expect(screen.getByLabelText('Choose image file')).toBeInTheDocument())
    const wrapper = screen
      .getByLabelText('Choose image file')
      .closest('[data-block-wrapper]') as HTMLElement

    await waitFor(() => expect(document.activeElement).toBe(wrapper))
    expect(clickSpy).toHaveBeenCalled()

    const reloaded = await loadNoteBlocks(docId)
    expect(reloaded.blocks).toHaveLength(1)
    expect(reloaded.blocks[0].type).toBe('image')

    clickSpy.mockRestore()
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

  it('ArrowDown at the end of a text block moves the cursor into the next text block', async () => {
    const docId = createId()
    const { doc } = await loadNoteBlocks(docId)
    await insertBlock(docId, doc, createEmptyBlock('text'), 0)
    await insertBlock(docId, doc, createEmptyBlock('text'), 1)
    const user = userEvent.setup()

    render(<NoteBlockList noteId="note-1" blockDocId={docId} />)
    // 2 real text blocks + the trailing phantom.
    await waitFor(() => expect(document.querySelectorAll('.ProseMirror').length).toBe(3))

    const [first, second] = document.querySelectorAll('.ProseMirror')
    await user.click(first as HTMLElement)
    await user.keyboard('{ArrowDown}')

    await waitFor(() => expect(document.activeElement).toBe(second))
  })

  it('ArrowDown from a text block into a non-text block selects it with a visible focus ring, and a further ArrowDown continues past it', async () => {
    const docId = createId()
    const { doc } = await loadNoteBlocks(docId)
    await insertBlock(docId, doc, createEmptyBlock('text'), 0)
    await insertBlock(docId, doc, createEmptyBlock('table'), 1)
    const user = userEvent.setup()

    render(<NoteBlockList noteId="note-1" blockDocId={docId} />)
    await waitFor(() => expect(screen.getByLabelText('Row 1, column 1')).toBeInTheDocument())

    const textEditable = document.querySelectorAll('.ProseMirror')[0] as HTMLElement
    await user.click(textEditable)
    await user.keyboard('{ArrowDown}')

    const wrapper = document.querySelectorAll('[data-block-wrapper]')[1] as HTMLElement
    await waitFor(() => {
      expect(document.activeElement).toBe(wrapper)
      expect(wrapper).toHaveAttribute('aria-selected', 'true')
    })

    // The table is the last real block, so continuing past it lands in the
    // always-present trailing phantom.
    await user.keyboard('{ArrowDown}')
    const phantom = document.querySelectorAll('.ProseMirror')[1] as HTMLElement
    await waitFor(() => expect(document.activeElement).toBe(phantom))
  })

  it('merges a text block into the previous one on Backspace at the start of non-empty content', async () => {
    const docId = createId()
    const { doc } = await loadNoteBlocks(docId)
    await insertBlock(docId, doc, textBlockWith('Hello '), 0)
    await insertBlock(docId, doc, textBlockWith('World'), 1)

    render(<NoteBlockList noteId="note-1" blockDocId={docId} />)
    await waitFor(() => expect(document.querySelectorAll('.ProseMirror').length).toBe(3))

    // The second block has never been clicked, so ProseMirror's selection is
    // still at its construction-time default (the document start) — exactly
    // the "Backspace at start of non-empty text" case, without depending on
    // jsdom's unsupported caret navigation to get there.
    const second = document.querySelectorAll('.ProseMirror')[1] as HTMLElement
    fireEvent.keyDown(second, { key: 'Backspace' })

    await waitFor(() => expect(document.querySelectorAll('.ProseMirror').length).toBe(2))
    await waitFor(async () => {
      const reloaded = await loadNoteBlocks(docId)
      expect(reloaded.blocks).toHaveLength(1)
      expect(JSON.stringify(reloaded.blocks[0])).toContain('Hello World')
    })
  })

  it('selects a non-text previous block on the first Backspace, and deletes it on a second Backspace', async () => {
    const docId = createId()
    const { doc } = await loadNoteBlocks(docId)
    await insertBlock(docId, doc, createEmptyBlock('table'), 0)
    await insertBlock(docId, doc, textBlockWith('Hi'), 1)

    render(<NoteBlockList noteId="note-1" blockDocId={docId} />)
    await waitFor(() => expect(screen.getByLabelText('Row 1, column 1')).toBeInTheDocument())

    const textEditable = document.querySelector('.ProseMirror') as HTMLElement
    fireEvent.keyDown(textEditable, { key: 'Backspace' })

    const tableWrapper = document.querySelectorAll('[data-block-wrapper]')[0] as HTMLElement
    await waitFor(() => {
      expect(document.activeElement).toBe(tableWrapper)
      expect(tableWrapper).toHaveAttribute('aria-selected', 'true')
    })
    // Nothing was deleted yet by the first press.
    expect(screen.getByLabelText('Row 1, column 1')).toBeInTheDocument()

    fireEvent.keyDown(tableWrapper, { key: 'Backspace' })

    await waitFor(() => expect(screen.queryByLabelText('Row 1, column 1')).not.toBeInTheDocument())
    const reloaded = await loadNoteBlocks(docId)
    expect(reloaded.blocks).toHaveLength(1)
    expect(reloaded.blocks[0].type).toBe('text')
  })

  it('Shift+ArrowDown builds a multi-block range, and Backspace deletes the whole range', async () => {
    const docId = createId()
    const { doc } = await loadNoteBlocks(docId)
    await insertBlock(docId, doc, createEmptyBlock('text'), 0)
    await insertBlock(docId, doc, createEmptyBlock('table'), 1)
    await insertBlock(docId, doc, createEmptyBlock('code'), 2)
    const user = userEvent.setup()

    render(<NoteBlockList noteId="note-1" blockDocId={docId} />)
    await waitFor(() => expect(screen.getByLabelText('Row 1, column 1')).toBeInTheDocument())

    const textEditable = document.querySelectorAll('.ProseMirror')[0] as HTMLElement
    await user.click(textEditable)
    await user.keyboard('{ArrowDown}') // selects the table block

    const wrappers = () => document.querySelectorAll('[data-block-wrapper]')
    await waitFor(() => expect(wrappers()[1]).toHaveAttribute('aria-selected', 'true'))

    await user.keyboard('{Shift>}{ArrowDown}{/Shift}') // extends the range onto the code block

    await waitFor(() => {
      expect(wrappers()[1]).toHaveAttribute('aria-selected', 'true')
      expect(wrappers()[2]).toHaveAttribute('aria-selected', 'true')
    })

    await user.keyboard('{Backspace}')

    await waitFor(() => expect(screen.queryByLabelText('Row 1, column 1')).not.toBeInTheDocument())
    const reloaded = await loadNoteBlocks(docId)
    expect(reloaded.blocks).toHaveLength(1)
    expect(reloaded.blocks[0].type).toBe('text')

    // Focus lands back on the remaining text block (before the deleted range).
    await waitFor(() => expect(document.activeElement).toBe(document.querySelector('.ProseMirror')))
  })

  it('dragging across blocks builds a range that persists after mouseup, and Backspace deletes it', async () => {
    const docId = createId()
    const { doc } = await loadNoteBlocks(docId)
    await insertBlock(docId, doc, createEmptyBlock('text'), 0)
    await insertBlock(docId, doc, createEmptyBlock('table'), 1)
    await insertBlock(docId, doc, createEmptyBlock('code'), 2)

    render(<NoteBlockList noteId="note-1" blockDocId={docId} />)
    await waitFor(() => expect(screen.getByLabelText('Row 1, column 1')).toBeInTheDocument())

    const wrappers = () => document.querySelectorAll('[data-block-wrapper]')
    const content = (i: number) => wrappers()[i].querySelector('[data-block-content]') as HTMLElement

    fireEvent.mouseDown(content(0), { button: 0 })
    fireEvent.mouseEnter(content(1), { buttons: 1 })

    await waitFor(() => {
      expect(wrappers()[0]).toHaveAttribute('aria-selected', 'true')
      expect(wrappers()[1]).toHaveAttribute('aria-selected', 'true')
    })

    fireEvent.mouseEnter(content(2), { buttons: 1 })
    await waitFor(() => expect(wrappers()[2]).toHaveAttribute('aria-selected', 'true'))

    fireEvent.mouseUp(window)

    // Range persists after release, exactly like a keyboard-built one.
    expect(wrappers()[0]).toHaveAttribute('aria-selected', 'true')
    expect(wrappers()[1]).toHaveAttribute('aria-selected', 'true')
    expect(wrappers()[2]).toHaveAttribute('aria-selected', 'true')

    fireEvent.keyDown(wrappers()[2], { key: 'Backspace' })

    await waitFor(() => expect(screen.queryByLabelText('Row 1, column 1')).not.toBeInTheDocument())
    const reloaded = await loadNoteBlocks(docId)
    expect(reloaded.blocks).toHaveLength(0)
  })

  it('a drag that never leaves its starting block selects nothing', async () => {
    const docId = createId()
    const { doc } = await loadNoteBlocks(docId)
    await insertBlock(docId, doc, createEmptyBlock('text'), 0)
    await insertBlock(docId, doc, createEmptyBlock('table'), 1)

    render(<NoteBlockList noteId="note-1" blockDocId={docId} />)
    await waitFor(() => expect(screen.getByLabelText('Row 1, column 1')).toBeInTheDocument())

    const wrappers = () => document.querySelectorAll('[data-block-wrapper]')
    const content = (i: number) => wrappers()[i].querySelector('[data-block-content]') as HTMLElement

    fireEvent.mouseDown(content(0), { button: 0 })
    fireEvent.mouseUp(window)

    expect(wrappers()[0]).not.toHaveAttribute('aria-selected', 'true')
    expect(wrappers()[1]).not.toHaveAttribute('aria-selected', 'true')

    // The session is fully cleared — a later, unrelated mouseenter over
    // another block must not retroactively start a range.
    fireEvent.mouseEnter(content(1), { buttons: 1 })
    expect(wrappers()[1]).not.toHaveAttribute('aria-selected', 'true')
  })

  it('Shift+Click extends a range from the last-focused block, without placing a text caret', async () => {
    const docId = createId()
    const { doc } = await loadNoteBlocks(docId)
    await insertBlock(docId, doc, createEmptyBlock('text'), 0)
    await insertBlock(docId, doc, createEmptyBlock('table'), 1)
    await insertBlock(docId, doc, createEmptyBlock('code'), 2)
    const user = userEvent.setup()

    render(<NoteBlockList noteId="note-1" blockDocId={docId} />)
    await waitFor(() => expect(screen.getByLabelText('Row 1, column 1')).toBeInTheDocument())

    const textEditable = document.querySelectorAll('.ProseMirror')[0] as HTMLElement
    await user.click(textEditable)

    const wrappers = () => document.querySelectorAll('[data-block-wrapper]')
    const content = (i: number) => wrappers()[i].querySelector('[data-block-content]') as HTMLElement

    fireEvent.mouseDown(content(2), { button: 0, shiftKey: true })

    await waitFor(() => {
      expect(wrappers()[0]).toHaveAttribute('aria-selected', 'true')
      expect(wrappers()[1]).toHaveAttribute('aria-selected', 'true')
      expect(wrappers()[2]).toHaveAttribute('aria-selected', 'true')
    })
    expect(document.activeElement).toBe(wrappers()[2])
  })

  it('a plain click selects a non-text block', async () => {
    const docId = createId()
    const { doc } = await loadNoteBlocks(docId)
    await insertBlock(docId, doc, createEmptyBlock('table'), 0)

    render(<NoteBlockList noteId="note-1" blockDocId={docId} />)
    await waitFor(() => expect(screen.getByLabelText('Row 1, column 1')).toBeInTheDocument())

    const wrapper = document.querySelector('[data-block-wrapper]') as HTMLElement
    const content = wrapper.querySelector('[data-block-content]') as HTMLElement

    fireEvent.mouseDown(content, { button: 0 })
    fireEvent.mouseUp(window)
    fireEvent.click(content)

    await waitFor(() => expect(wrapper).toHaveAttribute('aria-selected', 'true'))
    expect(document.activeElement).toBe(wrapper)
  })

  it('clicking an interactive control inside a block performs its action without selecting the block', async () => {
    const docId = createId()
    const { doc } = await loadNoteBlocks(docId)
    await insertBlock(docId, doc, createEmptyBlock('table'), 0)
    const user = userEvent.setup()

    render(<NoteBlockList noteId="note-1" blockDocId={docId} />)
    await waitFor(() => expect(screen.getByLabelText('Row 1, column 1')).toBeInTheDocument())

    await user.click(screen.getByLabelText('Delete row 1'))

    const wrapper = document.querySelector('[data-block-wrapper]') as HTMLElement
    expect(wrapper).not.toHaveAttribute('aria-selected', 'true')
  })

  it('Backspace on the empty trailing phantom moves focus back without deleting or creating anything', async () => {
    const docId = createId()
    const { doc } = await loadNoteBlocks(docId)
    await insertBlock(docId, doc, createEmptyBlock('text'), 0)

    render(<NoteBlockList noteId="note-1" blockDocId={docId} />)
    await waitFor(() => expect(document.querySelectorAll('.ProseMirror').length).toBe(2))

    const phantom = document.querySelectorAll('.ProseMirror')[1] as HTMLElement
    fireEvent.keyDown(phantom, { key: 'Backspace' })

    const first = document.querySelectorAll('.ProseMirror')[0] as HTMLElement
    await waitFor(() => expect(document.activeElement).toBe(first))

    const reloaded = await loadNoteBlocks(docId)
    expect(reloaded.blocks).toHaveLength(1)
  })
})
