import type { KeyboardEvent } from 'react'
import { MONTH_ABBREVIATIONS, type GridNavKey, moveGridIndex } from './dateMath'
import { useRovingGrid } from './useRovingGrid'
import styles from './CalendarGrid.module.css'

const GRID_NAV_KEYS: string[] = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown']
const COLUMNS = 4

interface MonthGridProps {
  focusedMonth: number
  selectedMonth: number | null
  onPick: (month: number) => void
  onMoveFocus: (month: number) => void
}

export function MonthGrid({ focusedMonth, selectedMonth, onPick, onMoveFocus }: MonthGridProps) {
  const containerRef = useRovingGrid(focusedMonth)

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (GRID_NAV_KEYS.includes(event.key)) {
      event.preventDefault()
      onMoveFocus(
        moveGridIndex(focusedMonth, event.key as GridNavKey, COLUMNS, MONTH_ABBREVIATIONS.length),
      )
    }
  }

  return (
    // eslint-disable-next-line jsx-a11y/no-static-element-interactions -- delegated keydown container for the roving-tabindex month grid; the focusable elements are the month buttons inside it
    <div ref={containerRef} className={styles.monthYearGrid} onKeyDown={handleKeyDown}>
      {MONTH_ABBREVIATIONS.map((label, index) => (
        <button
          key={label}
          type="button"
          className={styles.gridCell}
          aria-pressed={index === selectedMonth}
          data-roving-key={index}
          tabIndex={index === focusedMonth ? 0 : -1}
          onClick={() => onPick(index)}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
