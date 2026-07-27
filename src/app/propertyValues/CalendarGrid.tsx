import { Icon } from '../../components/Icon/Icon'
import { MONTH_NAMES, WEEKDAY_LABELS, type CalendarDay } from './dateMath'
import styles from './CalendarGrid.module.css'

interface CalendarGridProps {
  viewYear: number
  viewMonth: number
  weeks: CalendarDay[][]
  selectedDate: string | null
  onNavigate: (direction: -1 | 1) => void
  onPick: (date: string) => void
}

export function CalendarGrid({
  viewYear,
  viewMonth,
  weeks,
  selectedDate,
  onNavigate,
  onPick,
}: CalendarGridProps) {
  return (
    <div className={styles.calendar}>
      <div className={styles.header}>
        <button type="button" aria-label="Previous month" onClick={() => onNavigate(-1)}>
          <Icon name="chevronLeft" size={14} />
        </button>
        <span>
          {MONTH_NAMES[viewMonth]} {viewYear}
        </span>
        <button type="button" aria-label="Next month" onClick={() => onNavigate(1)}>
          <Icon name="chevronRight" size={14} />
        </button>
      </div>
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
