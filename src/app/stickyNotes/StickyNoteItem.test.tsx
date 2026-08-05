import { DndContext } from '@dnd-kit/core'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { StickyNoteItem } from './StickyNoteItem'
import type { StickyNote } from '../../domain/entities.types'

const stickyNote: StickyNote = {
  id: 'sticky-1',
  x: 0,
  y: 0,
  color: '#ffe58a',
  content: { kind: 'text', text: 'hello' },
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
        stickyNote={stickyNote}
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

    fireEvent.click(screen.getByRole('button', { name: /move or change color/i }))

    expect(screen.getByRole('menu')).toBeInTheDocument()
  })

  it('brings the note to front when the color picker is opened', () => {
    const { onBringToFront } = renderStickyNoteItem()

    fireEvent.click(screen.getByRole('button', { name: /move or change color/i }))

    expect(onBringToFront).toHaveBeenCalledTimes(1)
  })

  it('changes color when a swatch is clicked and closes the picker', () => {
    const { onChangeColor } = renderStickyNoteItem()

    fireEvent.click(screen.getByRole('button', { name: /move or change color/i }))
    const swatch = screen.getByRole('button', { name: '#f2b134' })
    fireEvent.click(swatch)

    expect(onChangeColor).toHaveBeenCalledWith('#f2b134')
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })

  it('disables the hex submit button for an invalid hex value', () => {
    renderStickyNoteItem()

    fireEvent.click(screen.getByRole('button', { name: /move or change color/i }))
    const hexInput = screen.getByRole('textbox', { name: /hex color/i })
    fireEvent.change(hexInput, { target: { value: 'not-a-color' } })

    expect(screen.getByRole('button', { name: 'Set' })).toBeDisabled()
  })

  it('still calls onDelete when the delete button is clicked', () => {
    const { onDelete } = renderStickyNoteItem()

    fireEvent.click(screen.getByRole('button', { name: 'Delete sticky note' }))

    expect(onDelete).toHaveBeenCalled()
  })
})
