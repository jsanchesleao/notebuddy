import { describe, expect, it } from 'vitest'
import { formatDate, getCalendarWeeks, parseDateParts } from './dateMath'

describe('formatDate', () => {
  it('pads month and day to two digits', () => {
    expect(formatDate(2026, 0, 5)).toBe('2026-01-05')
    expect(formatDate(2026, 11, 27)).toBe('2026-12-27')
  })
})

describe('parseDateParts', () => {
  it('parses a valid YYYY-MM-DD string', () => {
    expect(parseDateParts('2026-07-27')).toEqual({ year: 2026, month: 6, day: 27 })
  })

  it('falls back to today for null or malformed input', () => {
    const now = new Date()
    expect(parseDateParts(null)).toEqual({
      year: now.getFullYear(),
      month: now.getMonth(),
      day: now.getDate(),
    })
    expect(parseDateParts('not-a-date')).toEqual({
      year: now.getFullYear(),
      month: now.getMonth(),
      day: now.getDate(),
    })
  })
})

describe('getCalendarWeeks', () => {
  it('produces full weeks of 7 days each', () => {
    const weeks = getCalendarWeeks(2026, 6) // July 2026
    for (const week of weeks) {
      expect(week).toHaveLength(7)
    }
  })

  it('includes every day of the month exactly once, marked as current month', () => {
    const weeks = getCalendarWeeks(2026, 6) // July 2026 has 31 days
    const currentMonthDays = weeks.flat().filter((cell) => cell.isCurrentMonth)
    expect(currentMonthDays).toHaveLength(31)
    expect(currentMonthDays.map((cell) => cell.date)).toContain('2026-07-01')
    expect(currentMonthDays.map((cell) => cell.date)).toContain('2026-07-31')
  })

  it('pads leading cells from the previous month to align the first weekday', () => {
    const weeks = getCalendarWeeks(2026, 6)
    const expectedLeadingCount = new Date(2026, 6, 1).getDay()
    const leading = weeks[0].filter((cell) => !cell.isCurrentMonth)
    expect(leading).toHaveLength(expectedLeadingCount)
    expect(leading.every((cell) => cell.date.startsWith('2026-06'))).toBe(true)
  })

  it('handles December -> January month rollover for trailing days', () => {
    const weeks = getCalendarWeeks(2026, 11) // December 2026
    const lastWeek = weeks[weeks.length - 1]
    const trailing = lastWeek.filter((cell) => !cell.isCurrentMonth)
    for (const cell of trailing) {
      expect(cell.date.startsWith('2027-01')).toBe(true)
    }
  })
})
