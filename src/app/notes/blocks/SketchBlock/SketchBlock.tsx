import { useEffect, useRef, useState } from 'react'
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
  onUpdate: (patch: {
    strokes?: Stroke[]
    displayWidth?: number
    align?: Alignment
    locked?: boolean
  }) => void
}

export function SketchBlock({ block, onUpdate }: SketchBlockProps) {
  const [color, setColor] = useState(DEFAULT_COLORS[0])
  const [size, setSize] = useState(DEFAULT_SIZES[1])
  const [drawingPoints, setDrawingPoints] = useState<Stroke['points'] | null>(null)
  const [isFocused, setIsFocused] = useState(false)
  const svgRef = useRef<SVGSVGElement>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const drawingPointsRef = useRef<Stroke['points'] | null>(null)
  // Mirrors color/size so a blur-triggered commit (fired from a document-level
  // listener whose closure isn't refreshed on every render) always uses the
  // stroke's actual color/size rather than whatever was current when that
  // listener was last (re)attached.
  const styleRef = useRef({ color, size })
  const align = block.align ?? 'left'
  const locked = block.locked ?? false

  useEffect(() => {
    styleRef.current = { color, size }
  })

  const updateDrawingPoints = (points: Stroke['points'] | null) => {
    drawingPointsRef.current = points
    setDrawingPoints(points)
  }

  const commitDrawing = () => {
    const points = drawingPointsRef.current
    if (!points || points.length === 0) {
      updateDrawingPoints(null)
      return
    }
    const stroke: Stroke = { points, color: styleRef.current.color, size: styleRef.current.size }
    updateDrawingPoints(null)
    onUpdate({ strokes: [...block.strokes, stroke] })
  }

  // Kept current every render so the outside-pointerdown effect below can
  // call the latest commitDrawing (closing over the latest block/onUpdate)
  // without needing to tear down and re-add its document listener whenever
  // those change.
  const commitDrawingRef = useRef(commitDrawing)
  useEffect(() => {
    commitDrawingRef.current = commitDrawing
  })

  // Mirrors the capture-phase document pointerdown pattern in
  // useDismissableMenu: while armed, any pointerdown outside the block blurs
  // it (and commits an in-progress stroke, rather than discarding it).
  useEffect(() => {
    if (!isFocused) return
    const handleOutsidePointerDown = (event: PointerEvent) => {
      if (wrapperRef.current?.contains(event.target as Node)) return
      if (drawingPointsRef.current) commitDrawingRef.current()
      setIsFocused(false)
    }
    document.addEventListener('pointerdown', handleOutsidePointerDown, true)
    return () => document.removeEventListener('pointerdown', handleOutsidePointerDown, true)
  }, [isFocused])

  const toLocalPoint = (event: ReactPointerEvent<SVGSVGElement>): [number, number, number] => {
    const rect = svgRef.current?.getBoundingClientRect()
    const scaleX = rect && rect.width ? block.width / rect.width : 1
    const scaleY = rect && rect.height ? block.height / rect.height : 1
    const x = (event.clientX - (rect?.left ?? 0)) * scaleX
    const y = (event.clientY - (rect?.top ?? 0)) * scaleY
    return [x, y, event.pressure || 0.5]
  }

  const handleWrapperPointerDown = () => {
    setIsFocused(true)
  }

  const handlePointerDown = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (locked) return
    event.preventDefault()
    if (!isFocused) {
      // First tap only arms the block for drawing -- it must never start a
      // stroke itself, so an accidental scroll/select gesture can't leave a mark.
      setIsFocused(true)
      return
    }
    event.currentTarget.setPointerCapture(event.pointerId)
    updateDrawingPoints([toLocalPoint(event)])
  }

  const handlePointerMove = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (locked || !drawingPoints) return
    event.preventDefault()
    updateDrawingPoints([...drawingPoints, toLocalPoint(event)])
  }

  const handlePointerUp = () => {
    commitDrawing()
  }

  const handleToggleLock = () => {
    onUpdate({ locked: !locked })
  }

  return (
    <div ref={wrapperRef} className={styles.sketchBlock} onPointerDown={handleWrapperPointerDown}>
      <div
        className={`${styles.sketchFrame} ${ALIGN_CLASS[align]} ${isFocused ? styles.focused : ''}`}
      >
        <div className={styles.toolbar}>
          {DEFAULT_COLORS.map((swatch) => (
            <button
              key={swatch}
              type="button"
              className={swatch === color ? `${styles.swatch} ${styles.active}` : styles.swatch}
              style={{ background: swatch }}
              aria-label={`Color ${swatch}`}
              onClick={() => setColor(swatch)}
              disabled={locked}
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
              disabled={locked}
            >
              {option}
            </button>
          ))}
          <button
            type="button"
            className={styles.clearButton}
            onClick={() => onUpdate({ strokes: [] })}
            disabled={locked || block.strokes.length === 0}
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
                disabled={locked}
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
              disabled={locked}
            >
              <Icon name={option.icon} size={14} />
            </button>
          ))}
          <div className={styles.divider} />
          <button
            type="button"
            className={styles.iconButton}
            aria-label={locked ? 'Unlock sketch' : 'Lock sketch'}
            aria-pressed={locked}
            onClick={handleToggleLock}
          >
            <Icon name={locked ? 'unlock' : 'lock'} size={14} />
          </button>
        </div>
        <svg
          ref={svgRef}
          className={`${styles.canvas} ${isFocused && !locked ? styles.focused : ''} ${locked ? styles.locked : ''}`}
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
        {locked && (
          <div className={styles.lockWatermark}>
            <Icon name="lock" size={48} />
          </div>
        )}
      </div>
    </div>
  )
}
