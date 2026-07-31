import { describe, expect, it } from 'vitest'
import {
  addMonths,
  clampDay,
  daysInMonth,
  formatDate,
  getCalendarWeeks,
  getYearGridYears,
  getYearPageStart,
  moveDayFocus,
  moveGridIndex,
  parseDateParts,
} from './dateMath'

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

describe('daysInMonth', () => {
  it('returns 29 for a leap February and 28 otherwise', () => {
    expect(daysInMonth(2024, 1)).toBe(29)
    expect(daysInMonth(2026, 1)).toBe(28)
  })

  it('returns 31/30 for other months', () => {
    expect(daysInMonth(2026, 0)).toBe(31)
    expect(daysInMonth(2026, 3)).toBe(30)
  })
})

describe('clampDay', () => {
  it('leaves the day unchanged when it fits in the month', () => {
    expect(clampDay(15, 2026, 6)).toBe(15)
  })

  it('clamps to the last day of a shorter month, across a leap boundary', () => {
    expect(clampDay(31, 2026, 1)).toBe(28) // Jan 31 -> Feb 2026 (non-leap)
    expect(clampDay(31, 2024, 1)).toBe(29) // Jan 31 -> Feb 2024 (leap)
  })
})

describe('addMonths', () => {
  it('adds within the same year', () => {
    expect(addMonths(2026, 5, 1)).toEqual({ year: 2026, month: 6 })
    expect(addMonths(2026, 5, -1)).toEqual({ year: 2026, month: 4 })
  })

  it('rolls over into the next/previous year', () => {
    expect(addMonths(2026, 11, 1)).toEqual({ year: 2027, month: 0 })
    expect(addMonths(2026, 0, -1)).toEqual({ year: 2025, month: 11 })
  })
})

describe('getYearPageStart', () => {
  it('aligns a year to its 12-year page start', () => {
    expect(getYearPageStart(2026)).toBe(2016)
  })

  it('lands exactly on a page boundary', () => {
    expect(getYearPageStart(2016)).toBe(2016)
    expect(getYearPageStart(2027)).toBe(2016)
    expect(getYearPageStart(2028)).toBe(2028)
  })
})

describe('getYearGridYears', () => {
  it('returns 12 consecutive years starting at the page start', () => {
    expect(getYearGridYears(2016)).toEqual([
      2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026, 2027,
    ])
  })
})

describe('moveDayFocus', () => {
  it('moves by one day left/right', () => {
    expect(moveDayFocus(2026, 6, 15, 'ArrowRight')).toEqual({ year: 2026, month: 6, day: 16 })
    expect(moveDayFocus(2026, 6, 15, 'ArrowLeft')).toEqual({ year: 2026, month: 6, day: 14 })
  })

  it('moves by one week up/down', () => {
    expect(moveDayFocus(2026, 6, 15, 'ArrowDown')).toEqual({ year: 2026, month: 6, day: 22 })
    expect(moveDayFocus(2026, 6, 15, 'ArrowUp')).toEqual({ year: 2026, month: 6, day: 8 })
  })

  it('crosses a year boundary on Dec 31 -> Jan', () => {
    expect(moveDayFocus(2026, 11, 31, 'ArrowRight')).toEqual({ year: 2027, month: 0, day: 1 })
  })

  it('jumps to the Sunday/Saturday of the focused week for Home/End', () => {
    // 2026-07-15 is a Wednesday
    expect(moveDayFocus(2026, 6, 15, 'Home')).toEqual({ year: 2026, month: 6, day: 12 })
    expect(moveDayFocus(2026, 6, 15, 'End')).toEqual({ year: 2026, month: 6, day: 18 })
  })

  it('handles Home/End for a week that spans two months', () => {
    // 2026-07-01 is a Wednesday; its week starts in June and ends in July
    expect(moveDayFocus(2026, 6, 1, 'Home')).toEqual({ year: 2026, month: 5, day: 28 })
    expect(moveDayFocus(2026, 6, 1, 'End')).toEqual({ year: 2026, month: 6, day: 4 })
  })
})

describe('moveGridIndex', () => {
  it('moves left/right by one and up/down by a row', () => {
    expect(moveGridIndex(5, 'ArrowRight', 4, 12)).toBe(6)
    expect(moveGridIndex(5, 'ArrowLeft', 4, 12)).toBe(4)
    expect(moveGridIndex(5, 'ArrowDown', 4, 12)).toBe(9)
    expect(moveGridIndex(5, 'ArrowUp', 4, 12)).toBe(1)
  })

  it('clamps at the first/last index instead of wrapping', () => {
    expect(moveGridIndex(0, 'ArrowLeft', 4, 12)).toBe(0)
    expect(moveGridIndex(0, 'ArrowUp', 4, 12)).toBe(0)
    expect(moveGridIndex(11, 'ArrowRight', 4, 12)).toBe(11)
    expect(moveGridIndex(11, 'ArrowDown', 4, 12)).toBe(11)
  })
})
