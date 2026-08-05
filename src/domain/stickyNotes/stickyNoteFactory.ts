import { createId } from '../ids'
import { pickLeastUsedColor } from '../../lib/color/leastUsedColor'
import { PILL_PALETTE } from '../tags/tagPalette'
import type { StickyNote } from '../entities.types'

// Repeated clicks of "+ Add sticky" shouldn't stack notes exactly on top of each other.
const CASCADE_OFFSET_PX = 24
const CASCADE_WRAP_COUNT = 10
const BASE_X = 40
const BASE_Y = 40

export function createEmptyStickyNote(
  kind: 'text' | 'sketch',
  existingStickyNotes: StickyNote[],
): StickyNote {
  const cascadeIndex = existingStickyNotes.length % CASCADE_WRAP_COUNT
  const color = pickLeastUsedColor(
    PILL_PALETTE,
    existingStickyNotes.map((stickyNote) => stickyNote.color),
  )

  return {
    id: createId(),
    x: BASE_X + cascadeIndex * CASCADE_OFFSET_PX,
    y: BASE_Y + cascadeIndex * CASCADE_OFFSET_PX,
    color,
    content: kind === 'text' ? { kind: 'text', text: '' } : { kind: 'sketch', strokes: [] },
  }
}
