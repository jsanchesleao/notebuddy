import { useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import { strokeToPath } from './strokeToPath'
import { TEXT_COLOR_PRESETS } from '../TextBlock/textColorPresets'
import { Icon } from '../../../../components/Icon/Icon'
import type { NoteBlock, Stroke } from '../../../../domain/blocks/blocks.types'
import styles from './SketchBlock.module.css'

const DEFAULT_COLORS = TEXT_COLOR_PRESETS.map((preset) => preset.value)
const DEFAULT_SIZES = [2, 4, 8]

const WIDTH_PRESETS: { label: string; value: number | undefined }[] = [
  { label: 'S', value: 240 },
  { label: 'M', value: 480 },
  { label: 'L', value: 720 },
  { label: 'Full', value: undefined },
]

const ALIGNMENTS = [
  { value: 'left', label: 'Align left', icon: 'alignLeft' },
  { value: 'center', label: 'Align center', icon: 'alignCenter' },
  { value: 'right', label: 'Align right', icon: 'alignRight' },
] as const

type Alignment = (typeof ALIGNMENTS)[number]['value']

const ALIGN_CLASS: Record<Alignment, string> = {
  left: styles.alignLeft,
  center: styles.alignCenter,
  right: styles.alignRight,
}

interface SketchBlockProps {
  block: Extract<NoteBlock, { type: 'sketch' }>
  onUpdate: (patch: { strokes?: Stroke[]; displayWidth?: number; align?: Alignment }) => void
}

export function SketchBlock({ block, onUpdate }: SketchBlockProps) {
  const [color, setColor] = useState(DEFAULT_COLORS[0])
  const [size, setSize] = useState(DEFAULT_SIZES[1])
  const [drawingPoints, setDrawingPoints] = useState<Stroke['points'] | null>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const align = block.align ?? 'left'

  const toLocalPoint = (event: ReactPointerEvent<SVGSVGElement>): [number, number, number] => {
    const rect = svgRef.current?.getBoundingClientRect()
    const scaleX = rect && rect.width ? block.width / rect.width : 1
    const scaleY = rect && rect.height ? block.height / rect.height : 1
    const x = (event.clientX - (rect?.left ?? 0)) * scaleX
    const y = (event.clientY - (rect?.top ?? 0)) * scaleY
    return [x, y, event.pressure || 0.5]
  }

  const handlePointerDown = (event: ReactPointerEvent<SVGSVGElement>) => {
    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    setDrawingPoints([toLocalPoint(event)])
  }

  const handlePointerMove = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (!drawingPoints) return
    event.preventDefault()
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
      <div className={`${styles.sketchFrame} ${ALIGN_CLASS[align]}`}>
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
          <div className={styles.divider} />
          <div className={styles.widthPresets}>
            {WIDTH_PRESETS.map((preset) => (
              <button
                key={preset.label}
                type="button"
                className={
                  block.displayWidth === preset.value
                    ? `${styles.widthButton} ${styles.active}`
                    : styles.widthButton
                }
                onClick={() => onUpdate({ displayWidth: preset.value })}
              >
                {preset.label}
              </button>
            ))}
          </div>
          <div className={styles.divider} />
          {ALIGNMENTS.map((option) => (
            <button
              key={option.value}
              type="button"
              className={styles.iconButton}
              aria-label={option.label}
              aria-pressed={align === option.value}
              onClick={() => onUpdate({ align: option.value })}
            >
              <Icon name={option.icon} size={14} />
            </button>
          ))}
        </div>
        <svg
          ref={svgRef}
          className={styles.canvas}
          width={block.width}
          height={block.height}
          viewBox={`0 0 ${block.width} ${block.height}`}
          style={block.displayWidth ? { width: block.displayWidth, height: 'auto' } : undefined}
          role="img"
          aria-label="Sketch canvas"
          tabIndex={0}
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
    </div>
  )
}
