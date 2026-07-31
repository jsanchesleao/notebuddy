import { useState } from 'react'
import { Icon } from '../../components/Icon/Icon'
import { DayGrid } from './DayGrid'
import { MonthGrid } from './MonthGrid'
import { YearGrid } from './YearGrid'
import {
  MONTH_NAMES,
  addMonths,
  clampDay,
  formatDate,
  getCalendarWeeks,
  getYearGridYears,
  getYearPageStart,
  parseDateParts,
} from './dateMath'
import styles from './CalendarGrid.module.css'

type DrillLevel = 'day' | 'month' | 'year'

const NAV_LABELS: Record<DrillLevel, { prev: string; next: string }> = {
  day: { prev: 'Previous month', next: 'Next month' },
  month: { prev: 'Previous year', next: 'Next year' },
  year: { prev: 'Previous 12 years', next: 'Next 12 years' },
}

interface CalendarGridProps {
  selectedDate: string | null
  onPick: (date: string) => void
}

export function CalendarGrid({ selectedDate, onPick }: CalendarGridProps) {
  const initial = parseDateParts(selectedDate)

  const [drillLevel, setDrillLevel] = useState<DrillLevel>('day')
  const [viewYear, setViewYear] = useState(initial.year)
  const [viewMonth, setViewMonth] = useState(initial.month)
  const [focusedDay, setFocusedDay] = useState(initial.day)
  const [focusedMonth, setFocusedMonth] = useState(initial.month)
  const [yearPageStart, setYearPageStart] = useState(() => getYearPageStart(initial.year))
  const [focusedYear, setFocusedYear] = useState(initial.year)

  const weeks = getCalendarWeeks(viewYear, viewMonth)
  const focusedDate = formatDate(viewYear, viewMonth, clampDay(focusedDay, viewYear, viewMonth))
  const selectedParts = selectedDate ? parseDateParts(selectedDate) : null
  const selectedMonth =
    selectedParts && selectedParts.year === viewYear ? selectedParts.month : null
  const yearGridYears = getYearGridYears(yearPageStart)

  function pageDayGrid(monthDelta: number, yearDelta: number) {
    const base = addMonths(viewYear, viewMonth, monthDelta)
    const nextYear = yearDelta ? base.year + yearDelta : base.year
    setViewYear(nextYear)
    setViewMonth(base.month)
    setFocusedDay((day) => clampDay(day, nextYear, base.month))
  }

  function handlePrev() {
    if (drillLevel === 'day') pageDayGrid(-1, 0)
    else if (drillLevel === 'month') setViewYear((year) => year - 1)
    else {
      setYearPageStart((start) => start - 12)
      setFocusedYear((year) => year - 12)
    }
  }

  function handleNext() {
    if (drillLevel === 'day') pageDayGrid(1, 0)
    else if (drillLevel === 'month') setViewYear((year) => year + 1)
    else {
      setYearPageStart((start) => start + 12)
      setFocusedYear((year) => year + 12)
    }
  }

  function handleHeaderClick() {
    if (drillLevel === 'day') {
      setFocusedMonth(viewMonth)
      setDrillLevel('month')
    } else if (drillLevel === 'month') {
      setYearPageStart(getYearPageStart(viewYear))
      setFocusedYear(viewYear)
      setDrillLevel('year')
    } else {
      setDrillLevel('month')
    }
  }

  function handlePickMonth(month: number) {
    setViewMonth(month)
    setFocusedDay((day) => clampDay(day, viewYear, month))
    setDrillLevel('day')
  }

  function handlePickYear(year: number) {
    setViewYear(year)
    setDrillLevel('month')
  }

  function handleToday() {
    const today = parseDateParts(null)
    setViewYear(today.year)
    setViewMonth(today.month)
    setFocusedDay(today.day)
    setDrillLevel('day')
  }

  const headerText =
    drillLevel === 'day'
      ? `${MONTH_NAMES[viewMonth]} ${viewYear}`
      : drillLevel === 'month'
        ? `${viewYear}`
        : `${yearGridYears[0]}–${yearGridYears[11]}`

  return (
    <div className={styles.calendar}>
      <div className={styles.header}>
        <button type="button" aria-label={NAV_LABELS[drillLevel].prev} onClick={handlePrev}>
          <Icon name="chevronLeft" size={14} />
        </button>
        <button type="button" className={styles.headerLabel} onClick={handleHeaderClick}>
          {headerText}
        </button>
        <button type="button" aria-label={NAV_LABELS[drillLevel].next} onClick={handleNext}>
          <Icon name="chevronRight" size={14} />
        </button>
      </div>
      {drillLevel === 'day' && (
        <DayGrid
          weeks={weeks}
          selectedDate={selectedDate}
          focusedDate={focusedDate}
          onPick={onPick}
          onMoveFocus={(next) => {
            setViewYear(next.year)
            setViewMonth(next.month)
            setFocusedDay(next.day)
          }}
          onPageMonth={(delta) => pageDayGrid(delta, 0)}
          onPageYear={(delta) => pageDayGrid(0, delta)}
        />
      )}
      {drillLevel === 'month' && (
        <MonthGrid
          focusedMonth={focusedMonth}
          selectedMonth={selectedMonth}
          onPick={handlePickMonth}
          onMoveFocus={setFocusedMonth}
        />
      )}
      {drillLevel === 'year' && (
        <YearGrid
          years={yearGridYears}
          focusedYear={focusedYear}
          selectedYear={selectedParts?.year ?? null}
          onPick={handlePickYear}
          onMoveFocus={setFocusedYear}
        />
      )}
      {drillLevel === 'day' && (
        <button type="button" className={styles.todayLink} onClick={handleToday}>
          Today
        </button>
      )}
    </div>
  )
}
