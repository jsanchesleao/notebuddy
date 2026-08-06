import type { Modifier } from '@dnd-kit/core'

const clamp = (min: number, max: number, value: number) => Math.min(Math.max(value, min), max)

// Keeps the dragged note's rendered box within the visible viewport. Without this, a transformed
// box that pokes past the edge of a scrolling ancestor still contributes to that ancestor's
// scrollable overflow region (per the CSS overflow spec), silently growing the scrollable area
// and letting the page drift while the pointer sits near an edge — see the note above.
export const restrictToViewport: Modifier = ({ transform, draggingNodeRect, windowRect }) => {
  if (!draggingNodeRect || !windowRect) return transform
  return {
    ...transform,
    x: clamp(
      windowRect.left - draggingNodeRect.left,
      windowRect.right - draggingNodeRect.right,
      transform.x,
    ),
    y: clamp(
      windowRect.top - draggingNodeRect.top,
      windowRect.bottom - draggingNodeRect.bottom,
      transform.y,
    ),
  }
}
