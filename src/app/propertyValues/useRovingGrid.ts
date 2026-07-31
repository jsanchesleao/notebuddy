import { useLayoutEffect, useRef, type RefObject } from 'react'

// Shared by DayGrid/MonthGrid/YearGrid: each cell button carries
// data-roving-key={key} and tabIndex 0 only when key === focusedKey. Since
// only the currently active drill level's grid is mounted at a time, this
// effect (which fires on mount too) moves real DOM focus to the focused cell
// every time focusedKey changes or the grid first appears, following the same
// containerRef + querySelector pattern TimeColumns.tsx already uses.
export function useRovingGrid(focusedKey: string | number): RefObject<HTMLDivElement | null> {
  const containerRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    containerRef.current
      ?.querySelector<HTMLButtonElement>(`[data-roving-key="${focusedKey}"]`)
      ?.focus()
  }, [focusedKey])

  return containerRef
}
