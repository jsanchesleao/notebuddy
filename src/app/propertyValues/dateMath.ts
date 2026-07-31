export interface CalendarDay {
  date: string // YYYY-MM-DD
  day: number
  isCurrentMonth: boolean
}

export const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

export const MONTH_ABBREVIATIONS = MONTH_NAMES.map((name) => name.slice(0, 3))

export const WEEKDAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

export function pad2(value: number): string {
  return value.toString().padStart(2, '0')
}

export function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}

export function clampDay(day: number, year: number, month: number): number {
  return Math.min(day, daysInMonth(year, month))
}

export function addMonths(
  year: number,
  month: number,
  delta: number,
): { year: number; month: number } {
  const next = new Date(year, month + delta, 1)
  return { year: next.getFullYear(), month: next.getMonth() }
}

export function getYearPageStart(year: number, pageSize = 12): number {
  return Math.floor(year / pageSize) * pageSize
}

export function getYearGridYears(pageStartYear: number): number[] {
  return Array.from({ length: 12 }, (_, i) => pageStartYear + i)
}

export type DayNavKey = 'ArrowLeft' | 'ArrowRight' | 'ArrowUp' | 'ArrowDown' | 'Home' | 'End'

export function moveDayFocus(
  year: number,
  month: number,
  day: number,
  key: DayNavKey,
): { year: number; month: number; day: number } {
  const current = new Date(year, month, day)
  if (key === 'ArrowLeft') current.setDate(current.getDate() - 1)
  else if (key === 'ArrowRight') current.setDate(current.getDate() + 1)
  else if (key === 'ArrowUp') current.setDate(current.getDate() - 7)
  else if (key === 'ArrowDown') current.setDate(current.getDate() + 7)
  else if (key === 'Home') current.setDate(current.getDate() - current.getDay())
  else current.setDate(current.getDate() + (6 - current.getDay()))
  return { year: current.getFullYear(), month: current.getMonth(), day: current.getDate() }
}

export type GridNavKey = 'ArrowLeft' | 'ArrowRight' | 'ArrowUp' | 'ArrowDown'

export function moveGridIndex(
  index: number,
  key: GridNavKey,
  columns: number,
  count: number,
): number {
  const delta =
    key === 'ArrowLeft' ? -1 : key === 'ArrowRight' ? 1 : key === 'ArrowUp' ? -columns : columns
  return Math.min(count - 1, Math.max(0, index + delta))
}

export function formatDate(year: number, month: number, day: number): string {
  return `${year}-${pad2(month + 1)}-${pad2(day)}`
}

export function parseDateParts(value: string | null): { year: number; month: number; day: number } {
  if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split('-').map(Number)
    return { year, month: month - 1, day }
  }
  const now = new Date()
  return { year: now.getFullYear(), month: now.getMonth(), day: now.getDate() }
}

// Builds a full 7-column calendar grid for the given month, padded with the
// trailing days of the previous month and the leading days of the next month
// so every week row has exactly 7 cells.
export function getCalendarWeeks(year: number, month: number): CalendarDay[][] {
  const startWeekday = new Date(year, month, 1).getDay()
  const prevMonth = month === 0 ? 11 : month - 1
  const prevYear = month === 0 ? year - 1 : year
  const nextMonth = month === 11 ? 0 : month + 1
  const nextYear = month === 11 ? year + 1 : year
  const daysInPrevMonth = daysInMonth(prevYear, prevMonth)

  const cells: CalendarDay[] = []

  for (let i = 0; i < startWeekday; i++) {
    const day = daysInPrevMonth - startWeekday + 1 + i
    cells.push({ date: formatDate(prevYear, prevMonth, day), day, isCurrentMonth: false })
  }

  for (let day = 1; day <= daysInMonth(year, month); day++) {
    cells.push({ date: formatDate(year, month, day), day, isCurrentMonth: true })
  }

  let trailingDay = 1
  while (cells.length % 7 !== 0) {
    cells.push({
      date: formatDate(nextYear, nextMonth, trailingDay),
      day: trailingDay,
      isCurrentMonth: false,
    })
    trailingDay += 1
  }

  const weeks: CalendarDay[][] = []
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7))
  }
  return weeks
}
