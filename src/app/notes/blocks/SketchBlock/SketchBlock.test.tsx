import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createEmptyBlock } from '../../../../domain/blocks/noteBlocksFactory'
import { SketchBlock } from './SketchBlock'

afterEach(() => {
  cleanup()
})

// The canvas now requires an initial "arming" pointerdown before it will
// accept a drawing stroke -- this fires that arming tap so drawing-focused
// tests can get straight to the behavior they're actually testing.
function armCanvas(canvas: HTMLElement) {
  fireEvent.pointerDown(canvas, { clientX: 0, clientY: 0, pointerId: 1 })
  fireEvent.pointerUp(canvas, { clientX: 0, clientY: 0, pointerId: 1 })
}

describe('SketchBlock', () => {
  it('renders an empty canvas with no strokes', () => {
    const block = createEmptyBlock('sketch')
    render(<SketchBlock block={block} onUpdate={vi.fn()} />)

    const canvas = screen.getByRole('img', { name: 'Sketch canvas' })
    expect(canvas.querySelectorAll('path')).toHaveLength(0)
  })

  it('does not draw from the first pointerdown on an unfocused canvas', () => {
    const block = createEmptyBlock('sketch')
    const onUpdate = vi.fn()
    render(<SketchBlock block={block} onUpdate={onUpdate} />)

    const canvas = screen.getByRole('img', { name: 'Sketch canvas' })
    fireEvent.pointerDown(canvas, { clientX: 10, clientY: 10, pointerId: 1 })
    fireEvent.pointerUp(canvas, { clientX: 10, clientY: 10, pointerId: 1 })

    expect(onUpdate).not.toHaveBeenCalled()
  })

  it('commits a new stroke to onUpdate after arming, then a pointer drag', () => {
    const block = createEmptyBlock('sketch')
    const onUpdate = vi.fn()
    render(<SketchBlock block={block} onUpdate={onUpdate} />)

    const canvas = screen.getByRole('img', { name: 'Sketch canvas' })
    armCanvas(canvas)
    fireEvent.pointerDown(canvas, { clientX: 10, clientY: 10, pointerId: 1 })
    fireEvent.pointerMove(canvas, { clientX: 20, clientY: 20, pointerId: 1 })
    fireEvent.pointerMove(canvas, { clientX: 30, clientY: 15, pointerId: 1 })
    fireEvent.pointerUp(canvas, { clientX: 30, clientY: 15, pointerId: 1 })

    expect(onUpdate).toHaveBeenCalledTimes(1)
    const [[patch]] = onUpdate.mock.calls
    expect(patch.strokes).toHaveLength(1)
    expect(patch.strokes[0].points.length).toBeGreaterThanOrEqual(3)
  })

  it('picks a color and size before drawing, applied to the new stroke', () => {
    const block = createEmptyBlock('sketch')
    const onUpdate = vi.fn()
    render(<SketchBlock block={block} onUpdate={onUpdate} />)

    fireEvent.click(screen.getByLabelText('Color #2f6f9e'))
    fireEvent.click(screen.getByLabelText('Stroke size 8'))

    const canvas = screen.getByRole('img', { name: 'Sketch canvas' })
    armCanvas(canvas)
    fireEvent.pointerDown(canvas, { clientX: 0, clientY: 0, pointerId: 1 })
    fireEvent.pointerMove(canvas, { clientX: 5, clientY: 5, pointerId: 1 })
    fireEvent.pointerUp(canvas, { clientX: 5, clientY: 5, pointerId: 1 })

    const [[patch]] = onUpdate.mock.calls
    expect(patch.strokes[0]).toMatchObject({ color: '#2f6f9e', size: 8 })
  })

  it('commits an in-progress stroke when the block is blurred mid-drag', () => {
    const block = createEmptyBlock('sketch')
    const onUpdate = vi.fn()
    render(<SketchBlock block={block} onUpdate={onUpdate} />)

    const canvas = screen.getByRole('img', { name: 'Sketch canvas' })
    armCanvas(canvas)
    fireEvent.pointerDown(canvas, { clientX: 0, clientY: 0, pointerId: 1 })
    fireEvent.pointerMove(canvas, { clientX: 10, clientY: 10, pointerId: 1 })

    fireEvent.pointerDown(document.body, { pointerId: 2 })

    expect(onUpdate).toHaveBeenCalledTimes(1)
    const [[patch]] = onUpdate.mock.calls
    expect(patch.strokes).toHaveLength(1)
  })

  it('blurring without an in-progress stroke does not call onUpdate, and drawing again requires re-arming', () => {
    const block = createEmptyBlock('sketch')
    const onUpdate = vi.fn()
    render(<SketchBlock block={block} onUpdate={onUpdate} />)

    const canvas = screen.getByRole('img', { name: 'Sketch canvas' })
    armCanvas(canvas)
    fireEvent.pointerDown(document.body, { pointerId: 2 })
    expect(onUpdate).not.toHaveBeenCalled()

    // Now unfocused again -- a lone pointerdown should just re-arm, not draw.
    fireEvent.pointerDown(canvas, { clientX: 0, clientY: 0, pointerId: 1 })
    fireEvent.pointerUp(canvas, { clientX: 0, clientY: 0, pointerId: 1 })
    expect(onUpdate).not.toHaveBeenCalled()
  })

  it('clears all strokes when Clear is clicked', () => {
    const block = {
      ...createEmptyBlock('sketch'),
      strokes: [
        {
          points: [
            [0, 0, 0.5],
            [1, 1, 0.5],
          ] as [number, number, number][],
          color: '#000',
          size: 4,
        },
      ],
    }
    const onUpdate = vi.fn()
    render(<SketchBlock block={block} onUpdate={onUpdate} />)

    fireEvent.click(screen.getByRole('button', { name: 'Clear' }))
    expect(onUpdate).toHaveBeenCalledWith({ strokes: [] })
  })

  it('disables Clear when there are no strokes', () => {
    const block = createEmptyBlock('sketch')
    render(<SketchBlock block={block} onUpdate={vi.fn()} />)

    expect(screen.getByRole('button', { name: 'Clear' })).toBeDisabled()
  })

  it('updates displayWidth when a size preset is clicked', () => {
    const block = createEmptyBlock('sketch')
    const onUpdate = vi.fn()
    render(<SketchBlock block={block} onUpdate={onUpdate} />)

    fireEvent.click(screen.getByRole('button', { name: 'M' }))
    expect(onUpdate).toHaveBeenCalledWith({ displayWidth: 480 })
  })

  it('updates align when an alignment button is clicked', () => {
    const block = createEmptyBlock('sketch')
    const onUpdate = vi.fn()
    render(<SketchBlock block={block} onUpdate={onUpdate} />)

    fireEvent.click(screen.getByLabelText('Align center'))
    expect(onUpdate).toHaveBeenCalledWith({ align: 'center' })
  })

  it('ignores canvas pointer interaction while locked', () => {
    const block = { ...createEmptyBlock('sketch'), locked: true }
    const onUpdate = vi.fn()
    render(<SketchBlock block={block} onUpdate={onUpdate} />)

    const canvas = screen.getByRole('img', { name: 'Sketch canvas' })
    fireEvent.pointerDown(canvas, { clientX: 0, clientY: 0, pointerId: 1 })
    fireEvent.pointerMove(canvas, { clientX: 10, clientY: 10, pointerId: 1 })
    fireEvent.pointerUp(canvas, { clientX: 10, clientY: 10, pointerId: 1 })

    expect(onUpdate).not.toHaveBeenCalled()
  })

  it('disables every toolbar control except the lock toggle while locked', () => {
    const block = { ...createEmptyBlock('sketch'), locked: true }
    render(<SketchBlock block={block} onUpdate={vi.fn()} />)

    expect(screen.getByLabelText('Color #2f6f9e')).toBeDisabled()
    expect(screen.getByLabelText('Stroke size 8')).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Clear' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'M' })).toBeDisabled()
    expect(screen.getByLabelText('Align center')).toBeDisabled()
    expect(screen.getByLabelText('Unlock sketch')).not.toBeDisabled()
  })

  it('toggles locked via the lock/unlock button', () => {
    const block = createEmptyBlock('sketch')
    const onUpdate = vi.fn()
    render(<SketchBlock block={block} onUpdate={onUpdate} />)

    fireEvent.click(screen.getByLabelText('Lock sketch'))
    expect(onUpdate).toHaveBeenCalledWith({ locked: true })

    const lockedBlock = { ...block, locked: true }
    const onUpdate2 = vi.fn()
    render(<SketchBlock block={lockedBlock} onUpdate={onUpdate2} />)
    fireEvent.click(screen.getByLabelText('Unlock sketch'))
    expect(onUpdate2).toHaveBeenCalledWith({ locked: false })
  })

  it('restores drawing after unlocking', () => {
    const block = { ...createEmptyBlock('sketch'), locked: true }
    const onUpdate = vi.fn()
    const { rerender } = render(<SketchBlock block={block} onUpdate={onUpdate} />)

    rerender(<SketchBlock block={{ ...block, locked: false }} onUpdate={onUpdate} />)

    const canvas = screen.getByRole('img', { name: 'Sketch canvas' })
    armCanvas(canvas)
    fireEvent.pointerDown(canvas, { clientX: 0, clientY: 0, pointerId: 1 })
    fireEvent.pointerMove(canvas, { clientX: 10, clientY: 10, pointerId: 1 })
    fireEvent.pointerUp(canvas, { clientX: 10, clientY: 10, pointerId: 1 })

    expect(onUpdate).toHaveBeenCalledTimes(1)
    const [[patch]] = onUpdate.mock.calls
    expect(patch.strokes).toHaveLength(1)
  })
})
