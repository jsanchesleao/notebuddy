const SCROLLABLE_OVERFLOW = new Set(['auto', 'scroll', 'hidden'])

function isPositioningBoundary(style: CSSStyleDeclaration): boolean {
  if (style.position === 'fixed') return true
  return SCROLLABLE_OVERFLOW.has(style.overflowX) || SCROLLABLE_OVERFLOW.has(style.overflowY)
}

// Walks up from a trigger element to find the nearest ancestor that actually
// constrains layout (Drawer's fixed+scrolling panel, Modal's fixed panel),
// rather than assuming the boundary is always the full browser viewport.
export function findPositioningBoundary(el: Element): DOMRect {
  let current = el.parentElement
  while (current) {
    if (isPositioningBoundary(getComputedStyle(current))) {
      return current.getBoundingClientRect()
    }
    current = current.parentElement
  }

  return new DOMRect(
    0,
    0,
    document.documentElement.clientWidth,
    document.documentElement.clientHeight,
  )
}

// Clamps the menu's left edge so it stays fully inside the boundary rather
// than just flipping between left- and right-aligned (a menu wide enough to
// overflow on both sides, e.g. the datetime picker in the Drawer, would
// still overflow one side after a binary flip). When the menu is wider than
// the boundary itself, this favors not overflowing the right edge further —
// callers with a menu that can exceed the boundary width should shrink the
// menu (e.g. stacking its contents) rather than rely on this alone.
export function clampMenuLeft(
  triggerLeft: number,
  menuWidth: number,
  boundary: { left: number; right: number },
  bufferPx: number,
): number {
  const minLeft = boundary.left + bufferPx
  const maxLeft = boundary.right - bufferPx - menuWidth
  return Math.min(Math.max(triggerLeft, minLeft), maxLeft)
}
