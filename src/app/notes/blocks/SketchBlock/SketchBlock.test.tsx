import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createEmptyBlock } from '../../../../domain/blocks/noteBlocksFactory'
import { SketchBlock } from './SketchBlock'

afterEach(() => {
  cleanup()
})

describe('SketchBlock', () => {
  it('renders an empty canvas with no strokes', () => {
    const block = createEmptyBlock('sketch')
    render(<SketchBlock block={block} onUpdate={vi.fn()} />)

    const canvas = screen.getByRole('img', { name: 'Sketch canvas' })
    expect(canvas.querySelectorAll('path')).toHaveLength(0)
  })

  it('commits a new stroke to onUpdate after a pointer drag', () => {
    const block = createEmptyBlock('sketch')
    const onUpdate = vi.fn()
    render(<SketchBlock block={block} onUpdate={onUpdate} />)

    const canvas = screen.getByRole('img', { name: 'Sketch canvas' })
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

    fireEvent.click(screen.getByLabelText('Color #b3552a'))
    fireEvent.click(screen.getByLabelText('Stroke size 8'))

    const canvas = screen.getByRole('img', { name: 'Sketch canvas' })
    fireEvent.pointerDown(canvas, { clientX: 0, clientY: 0, pointerId: 1 })
    fireEvent.pointerMove(canvas, { clientX: 5, clientY: 5, pointerId: 1 })
    fireEvent.pointerUp(canvas, { clientX: 5, clientY: 5, pointerId: 1 })

    const [[patch]] = onUpdate.mock.calls
    expect(patch.strokes[0]).toMatchObject({ color: '#b3552a', size: 8 })
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
})
