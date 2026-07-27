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

export const WEEKDAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

export function pad2(value: number): string {
  return value.toString().padStart(2, '0')
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
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const daysInPrevMonth = new Date(year, month, 0).getDate()
  const prevMonth = month === 0 ? 11 : month - 1
  const prevYear = month === 0 ? year - 1 : year
  const nextMonth = month === 11 ? 0 : month + 1
  const nextYear = month === 11 ? year + 1 : year

  const cells: CalendarDay[] = []

  for (let i = 0; i < startWeekday; i++) {
    const day = daysInPrevMonth - startWeekday + 1 + i
    cells.push({ date: formatDate(prevYear, prevMonth, day), day, isCurrentMonth: false })
  }

  for (let day = 1; day <= daysInMonth; day++) {
    cells.push({ date: formatDate(year, month, day), day, isCurrentMonth: true })
  }

  let trailingDay = 1
  while (cells.length % 7 !== 0) {
    cells.push({ date: formatDate(nextYear, nextMonth, trailingDay), day: trailingDay, isCurrentMonth: false })
    trailingDay += 1
  }

  const weeks: CalendarDay[][] = []
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7))
  }
  return weeks
}
