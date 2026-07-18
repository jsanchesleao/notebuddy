import getStroke from 'perfect-freehand'
import type { Stroke } from '../../../../domain/blocks/blocks.types'

function outlineToSvgPath(outline: number[][]): string {
  if (!outline.length) return ''

  const d = outline.reduce<(string | number)[]>(
    (acc, [x0, y0], i, arr) => {
      const [x1, y1] = arr[(i + 1) % arr.length]
      acc.push(x0, y0, (x0 + x1) / 2, (y0 + y1) / 2)
      return acc
    },
    ['M', ...outline[0], 'Q'],
  )

  d.push('Z')
  return d.join(' ')
}

export function strokeToPath(stroke: Pick<Stroke, 'points' | 'size'>): string {
  const outline = getStroke(stroke.points, { size: stroke.size })
  return outlineToSvgPath(outline)
}
