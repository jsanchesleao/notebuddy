import { useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import { strokeToPath } from '../notes/blocks/SketchBlock/strokeToPath'
import type { Stroke } from '../../domain/blocks/blocks.types'
import styles from './StickyNoteItem.module.css'

const PEN_SIZE = 3

// A minimal, fixed-size pointer-capture drawing loop, deliberately not reusing
// SketchBlock.tsx wholesale — that component is coupled to NoteBlock's width/height/
// displayWidth/align, and adding toolbar/lock/align concerns here would be over-abstracting
// for a much smaller, fixed-size surface. Shares only strokeToPath for stroke rendering.
interface StickyNoteSketchCanvasProps {
  strokes: Stroke[]
  penColor: string
  onChange: (strokes: Stroke[]) => void
}

export function StickyNoteSketchCanvas({
  strokes,
  penColor,
  onChange,
}: StickyNoteSketchCanvasProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [drawingPoints, setDrawingPoints] = useState<Stroke['points'] | null>(null)

  const toLocalPoint = (event: ReactPointerEvent<SVGSVGElement>): [number, number, number] => {
    const rect = svgRef.current?.getBoundingClientRect()
    const x = event.clientX - (rect?.left ?? 0)
    const y = event.clientY - (rect?.top ?? 0)
    return [x, y, event.pressure || 0.5]
  }

  const handlePointerDown = (event: ReactPointerEvent<SVGSVGElement>) => {
    event.stopPropagation()
    event.currentTarget.setPointerCapture(event.pointerId)
    setDrawingPoints([toLocalPoint(event)])
  }

  const handlePointerMove = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (!drawingPoints) return
    event.stopPropagation()
    setDrawingPoints([...drawingPoints, toLocalPoint(event)])
  }

  const commitDrawing = () => {
    if (!drawingPoints || drawingPoints.length === 0) {
      setDrawingPoints(null)
      return
    }
    const stroke: Stroke = { points: drawingPoints, color: penColor, size: PEN_SIZE }
    setDrawingPoints(null)
    onChange([...strokes, stroke])
  }

  return (
    <svg
      ref={svgRef}
      className={styles.sketchCanvas}
      role="img"
      aria-label="Sticky note sketch canvas"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={commitDrawing}
      onPointerLeave={commitDrawing}
    >
      {strokes.map((stroke, index) => (
        <path key={index} d={strokeToPath(stroke)} fill={stroke.color} />
      ))}
      {drawingPoints && drawingPoints.length > 0 && (
        <path d={strokeToPath({ points: drawingPoints, size: PEN_SIZE })} fill={penColor} />
      )}
    </svg>
  )
}
