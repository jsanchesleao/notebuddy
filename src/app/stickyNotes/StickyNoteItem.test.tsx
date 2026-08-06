import { DndContext } from '@dnd-kit/core'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { StickyNoteItem } from './StickyNoteItem'
import type { StickyNote } from '../../domain/entities.types'

const textStickyNote: StickyNote = {
  id: 'sticky-1',
  x: 0,
  y: 0,
  color: '#ffe58a',
  content: { kind: 'text', text: 'hello' },
}

const sketchStickyNote: StickyNote = {
  id: 'sticky-2',
  x: 0,
  y: 0,
  color: '#ffe58a',
  content: { kind: 'sketch', strokes: [] },
}

// useDraggable requires a DndContext ancestor, matching how StickyNoteLayer wraps it in the app.
function renderStickyNoteItem(overrides: Partial<Parameters<typeof StickyNoteItem>[0]> = {}) {
  const onChangeContent = vi.fn()
  const onChangeColor = vi.fn()
  const onDelete = vi.fn()
  const onBringToFront = vi.fn()

  render(
    <DndContext>
      <StickyNoteItem
        stickyNote={textStickyNote}
        onChangeContent={onChangeContent}
        onChangeColor={onChangeColor}
        onDelete={onDelete}
        onBringToFront={onBringToFront}
        {...overrides}
      />
    </DndContext>,
  )

  return { onChangeContent, onChangeColor, onDelete, onBringToFront }
}

describe('StickyNoteItem', () => {
  it('opens the color picker when the grip handle is clicked', () => {
    renderStickyNoteItem()

    fireEvent.click(screen.getByRole('button', { name: /change sticky note color/i }))

    expect(screen.getByRole('menu')).toBeInTheDocument()
  })

  it('brings the note to front when the color picker is opened', () => {
    const { onBringToFront } = renderStickyNoteItem()

    fireEvent.click(screen.getByRole('button', { name: /change sticky note color/i }))

    expect(onBringToFront).toHaveBeenCalledTimes(1)
  })

  it('does not enter edit mode when the color picker grip is clicked', () => {
    renderStickyNoteItem()

    fireEvent.click(screen.getByRole('button', { name: /change sticky note color/i }))

    expect(screen.queryByLabelText('Sticky note text')).not.toBeInTheDocument()
  })

  it('changes color when a swatch is clicked and closes the picker', () => {
    const { onChangeColor } = renderStickyNoteItem()

    fireEvent.click(screen.getByRole('button', { name: /change sticky note color/i }))
    const swatch = screen.getByRole('button', { name: '#f2b134' })
    fireEvent.click(swatch)

    expect(onChangeColor).toHaveBeenCalledWith('#f2b134')
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })

  it('disables the hex submit button for an invalid hex value', () => {
    renderStickyNoteItem()

    fireEvent.click(screen.getByRole('button', { name: /change sticky note color/i }))
    const hexInput = screen.getByRole('textbox', { name: /hex color/i })
    fireEvent.change(hexInput, { target: { value: 'not-a-color' } })

    expect(screen.getByRole('button', { name: 'Set' })).toBeDisabled()
  })

  it('still calls onDelete when the delete button is clicked', () => {
    const { onDelete } = renderStickyNoteItem()

    fireEvent.click(screen.getByRole('button', { name: 'Delete sticky note' }))

    expect(onDelete).toHaveBeenCalled()
  })

  it('does not enter edit mode when the delete button is clicked', () => {
    renderStickyNoteItem()

    fireEvent.click(screen.getByRole('button', { name: 'Delete sticky note' }))

    expect(screen.queryByLabelText('Sticky note text')).not.toBeInTheDocument()
  })

  it('enters edit mode and shows the live text editor when the note body is clicked', () => {
    const { onBringToFront } = renderStickyNoteItem()

    fireEvent.click(screen.getByText('hello'))

    expect(screen.getByLabelText('Sticky note text')).toHaveValue('hello')
    expect(onBringToFront).toHaveBeenCalledTimes(1)
  })

  it('exits edit mode and shows the preview again when the text editor loses focus', () => {
    renderStickyNoteItem()

    fireEvent.click(screen.getByText('hello'))
    fireEvent.blur(screen.getByLabelText('Sticky note text'))

    expect(screen.queryByLabelText('Sticky note text')).not.toBeInTheDocument()
    expect(screen.getByText('hello')).toBeInTheDocument()
  })

  it('enters edit mode and shows the live sketch canvas when a sketch note is clicked', () => {
    const { onBringToFront } = renderStickyNoteItem({ stickyNote: sketchStickyNote })

    fireEvent.click(screen.getByRole('img', { name: 'Sticky note sketch' }))

    expect(screen.getByLabelText('Sticky note sketch canvas')).toBeInTheDocument()
    expect(onBringToFront).toHaveBeenCalledTimes(1)
  })

  it('exits edit mode and shows the sketch preview again when the canvas loses focus', () => {
    renderStickyNoteItem({ stickyNote: sketchStickyNote })

    fireEvent.click(screen.getByRole('img', { name: 'Sticky note sketch' }))
    fireEvent.blur(screen.getByLabelText('Sticky note sketch canvas'))

    expect(screen.queryByLabelText('Sticky note sketch canvas')).not.toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Sticky note sketch' })).toBeInTheDocument()
  })
})
