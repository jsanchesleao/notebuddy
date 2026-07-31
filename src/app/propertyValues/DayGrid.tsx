import type { KeyboardEvent } from 'react'
import {
  type CalendarDay,
  type DayNavKey,
  WEEKDAY_LABELS,
  moveDayFocus,
  parseDateParts,
} from './dateMath'
import { useRovingGrid } from './useRovingGrid'
import styles from './CalendarGrid.module.css'

const DAY_NAV_KEYS: string[] = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End']

interface DayGridProps {
  weeks: CalendarDay[][]
  selectedDate: string | null
  focusedDate: string
  onPick: (date: string) => void
  onMoveFocus: (next: { year: number; month: number; day: number }) => void
  onPageMonth: (delta: number) => void
  onPageYear: (delta: number) => void
}

export function DayGrid({
  weeks,
  selectedDate,
  focusedDate,
  onPick,
  onMoveFocus,
  onPageMonth,
  onPageYear,
}: DayGridProps) {
  const containerRef = useRovingGrid(focusedDate)

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (DAY_NAV_KEYS.includes(event.key)) {
      event.preventDefault()
      const parts = parseDateParts(focusedDate)
      onMoveFocus(moveDayFocus(parts.year, parts.month, parts.day, event.key as DayNavKey))
    } else if (event.key === 'PageUp') {
      event.preventDefault()
      if (event.shiftKey) onPageYear(-1)
      else onPageMonth(-1)
    } else if (event.key === 'PageDown') {
      event.preventDefault()
      if (event.shiftKey) onPageYear(1)
      else onPageMonth(1)
    }
  }

  return (
    // eslint-disable-next-line jsx-a11y/no-static-element-interactions -- delegated keydown container for the roving-tabindex day grid; the focusable elements are the day buttons inside it
    <div ref={containerRef} onKeyDown={handleKeyDown}>
      <div className={styles.weekdayRow}>
        {WEEKDAY_LABELS.map((label) => (
          <span key={label}>{label}</span>
        ))}
      </div>
      {weeks.map((week, weekIndex) => (
        <div key={weekIndex} className={styles.weekRow}>
          {week.map((cell) => (
            <button
              key={cell.date}
              type="button"
              className={cell.isCurrentMonth ? styles.day : styles.dayMuted}
              aria-pressed={cell.date === selectedDate}
              data-roving-key={cell.date}
              tabIndex={cell.date === focusedDate ? 0 : -1}
              onClick={() => onPick(cell.date)}
            >
              {cell.day}
            </button>
          ))}
        </div>
      ))}
    </div>
  )
}
