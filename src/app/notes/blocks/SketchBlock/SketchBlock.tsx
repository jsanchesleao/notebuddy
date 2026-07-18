import { useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import { strokeToPath } from './strokeToPath'
import type { NoteBlock, Stroke } from '../../../../domain/blocks/blocks.types'
import styles from './SketchBlock.module.css'

const DEFAULT_COLORS = ['#2b2620', '#b3552a', '#4c7a52', '#a23b3b', '#6b6255']
const DEFAULT_SIZES = [2, 4, 8]

interface SketchBlockProps {
  block: Extract<NoteBlock, { type: 'sketch' }>
  onUpdate: (patch: { strokes: Stroke[] }) => void
}

export function SketchBlock({ block, onUpdate }: SketchBlockProps) {
  const [color, setColor] = useState(DEFAULT_COLORS[0])
  const [size, setSize] = useState(DEFAULT_SIZES[1])
  const [drawingPoints, setDrawingPoints] = useState<Stroke['points'] | null>(null)
  const svgRef = useRef<SVGSVGElement>(null)

  const toLocalPoint = (event: ReactPointerEvent<SVGSVGElement>): [number, number, number] => {
    const rect = svgRef.current?.getBoundingClientRect()
    const x = event.clientX - (rect?.left ?? 0)
    const y = event.clientY - (rect?.top ?? 0)
    return [x, y, event.pressure || 0.5]
  }

  const handlePointerDown = (event: ReactPointerEvent<SVGSVGElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId)
    setDrawingPoints([toLocalPoint(event)])
  }

  const handlePointerMove = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (!drawingPoints) return
    setDrawingPoints([...drawingPoints, toLocalPoint(event)])
  }

  const handlePointerUp = () => {
    if (!drawingPoints || drawingPoints.length === 0) {
      setDrawingPoints(null)
      return
    }
    const stroke: Stroke = { points: drawingPoints, color, size }
    setDrawingPoints(null)
    onUpdate({ strokes: [...block.strokes, stroke] })
  }

  return (
    <div className={styles.sketchBlock}>
      <div className={styles.toolbar}>
        {DEFAULT_COLORS.map((swatch) => (
          <button
            key={swatch}
            type="button"
            className={swatch === color ? `${styles.swatch} ${styles.active}` : styles.swatch}
            style={{ background: swatch }}
            aria-label={`Color ${swatch}`}
            onClick={() => setColor(swatch)}
          />
        ))}
        {DEFAULT_SIZES.map((option) => (
          <button
            key={option}
            type="button"
            className={
              option === size ? `${styles.sizeButton} ${styles.active}` : styles.sizeButton
            }
            aria-label={`Stroke size ${option}`}
            onClick={() => setSize(option)}
          >
            {option}
          </button>
        ))}
        <button
          type="button"
          className={styles.clearButton}
          onClick={() => onUpdate({ strokes: [] })}
          disabled={block.strokes.length === 0}
        >
          Clear
        </button>
      </div>
      <svg
        ref={svgRef}
        className={styles.canvas}
        width={block.width}
        height={block.height}
        viewBox={`0 0 ${block.width} ${block.height}`}
        role="img"
        aria-label="Sketch canvas"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        {block.strokes.map((stroke, index) => (
          <path key={index} d={strokeToPath(stroke)} fill={stroke.color} />
        ))}
        {drawingPoints && drawingPoints.length > 0 && (
          <path d={strokeToPath({ points: drawingPoints, size })} fill={color} />
        )}
      </svg>
    </div>
  )
}
