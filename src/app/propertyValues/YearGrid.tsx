import type { KeyboardEvent } from 'react'
import { type GridNavKey, moveGridIndex } from './dateMath'
import { useRovingGrid } from './useRovingGrid'
import styles from './CalendarGrid.module.css'

const GRID_NAV_KEYS: string[] = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown']
const COLUMNS = 4

interface YearGridProps {
  years: number[]
  focusedYear: number
  selectedYear: number | null
  onPick: (year: number) => void
  onMoveFocus: (year: number) => void
}

export function YearGrid({ years, focusedYear, selectedYear, onPick, onMoveFocus }: YearGridProps) {
  const containerRef = useRovingGrid(focusedYear)

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (GRID_NAV_KEYS.includes(event.key)) {
      event.preventDefault()
      const currentIndex = years.indexOf(focusedYear)
      const nextIndex = moveGridIndex(currentIndex, event.key as GridNavKey, COLUMNS, years.length)
      onMoveFocus(years[nextIndex])
    }
  }

  return (
    // eslint-disable-next-line jsx-a11y/no-static-element-interactions -- delegated keydown container for the roving-tabindex year grid; the focusable elements are the year buttons inside it
    <div ref={containerRef} className={styles.monthYearGrid} onKeyDown={handleKeyDown}>
      {years.map((year) => (
        <button
          key={year}
          type="button"
          className={styles.gridCell}
          aria-pressed={year === selectedYear}
          data-roving-key={year}
          tabIndex={year === focusedYear ? 0 : -1}
          onClick={() => onPick(year)}
        >
          {year}
        </button>
      ))}
    </div>
  )
}
