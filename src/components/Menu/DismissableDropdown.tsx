import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { useDismissableMenu } from './useDismissableMenu'
import { clampMenuLeft, findPositioningBoundary } from './menuBoundary'
import styles from './DismissableDropdown.module.css'

interface DismissableDropdownProps {
  trigger: (state: { open: boolean; toggle: () => void }) => ReactNode
  children: (state: { close: () => void; availableWidth: number }) => ReactNode
  className?: string
  menuClassName?: string
}

// Matches the menu's own padding so the clamp kicks in slightly before the
// menu would actually touch the boundary edge.
const OVERFLOW_BUFFER_PX = 8

// Generalizes the trigger/menu markup shared by BlockTypeSelect and every new
// picker in Phase 3 (schema kind, select options, note type) rather than
// re-wiring useDismissableMenu's container/menu markup at each call site.
export function DismissableDropdown({
  trigger,
  children,
  className,
  menuClassName,
}: DismissableDropdownProps) {
  const { open, setOpen, containerRef } = useDismissableMenu<HTMLDivElement>()
  const menuRef = useRef<HTMLDivElement>(null)
  const [leftOffsetPx, setLeftOffsetPx] = useState(0)
  const [availableWidth, setAvailableWidth] = useState(Number.POSITIVE_INFINITY)

  // The menu defaults to left-aligned under the trigger (left: 0 in CSS),
  // which is correct almost everywhere. But the Drawer panel is pinned to
  // the screen's right edge, so a trigger near its edge needs the menu
  // nudged left to stay inside it — and a menu wide enough to overflow both
  // sides (e.g. the datetime picker) needs clamping rather than a simple
  // flip, since flipping alone would just move the overflow to the other
  // edge instead of removing it.
  useLayoutEffect(() => {
    if (!open) return
    const trigger = containerRef.current
    const menu = menuRef.current
    if (!trigger || !menu) return

    const triggerRect = trigger.getBoundingClientRect()
    const menuRect = menu.getBoundingClientRect()
    const boundary = findPositioningBoundary(trigger)

    const clampedLeft = clampMenuLeft(
      triggerRect.left,
      menuRect.width,
      boundary,
      OVERFLOW_BUFFER_PX,
    )

    setLeftOffsetPx(clampedLeft - triggerRect.left)
    setAvailableWidth(boundary.width)
  }, [open, containerRef])

  return (
    <div className={`${styles.container} ${className ?? ''}`} ref={containerRef}>
      {trigger({ open, toggle: () => setOpen(!open) })}
      {open && (
        <div
          role="menu"
          className={`${styles.menu} ${menuClassName ?? ''}`}
          style={{ left: leftOffsetPx }}
          ref={menuRef}
        >
          {children({ close: () => setOpen(false), availableWidth })}
        </div>
      )}
    </div>
  )
}
