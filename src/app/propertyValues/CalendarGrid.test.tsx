import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CalendarGrid } from './CalendarGrid'
import { MONTH_NAMES, formatDate } from './dateMath'

afterEach(() => {
  cleanup()
})

function focusedRovingKey(): string | null {
  return document.activeElement?.getAttribute('data-roving-key') ?? null
}

describe('CalendarGrid', () => {
  it('defaults to the day view, focused on the selected date', () => {
    render(<CalendarGrid selectedDate="2026-07-15" onPick={() => {}} />)

    expect(screen.getByText('July 2026')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '15', pressed: true })).toBeInTheDocument()
    expect(focusedRovingKey()).toBe('2026-07-15')
  })

  it('focuses today when no date is selected', () => {
    const now = new Date()
    render(<CalendarGrid selectedDate={null} onPick={() => {}} />)

    expect(focusedRovingKey()).toBe(formatDate(now.getFullYear(), now.getMonth(), now.getDate()))
  })

  it('picking a day calls onPick with a YYYY-MM-DD string', async () => {
    const user = userEvent.setup()
    const onPick = vi.fn()
    render(<CalendarGrid selectedDate="2026-07-15" onPick={onPick} />)

    await user.click(screen.getByRole('button', { name: '20', pressed: false }))

    expect(onPick).toHaveBeenCalledWith('2026-07-20')
  })

  it('drills day -> month -> year via header clicks, then cycles year -> month', async () => {
    const user = userEvent.setup()
    render(<CalendarGrid selectedDate="2026-07-15" onPick={() => {}} />)

    await user.click(screen.getByRole('button', { name: 'July 2026' }))
    expect(screen.getByRole('button', { name: 'Jul', pressed: true })).toBeInTheDocument()
    expect(screen.queryByText('15')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '2026' }))
    expect(screen.getByText('2016–2027')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '2026', pressed: true })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '2016–2027' }))
    expect(screen.getByRole('button', { name: 'Jul', pressed: true })).toBeInTheDocument()
  })

  it('picking a month drills to day view of that month without calling onPick', async () => {
    const user = userEvent.setup()
    const onPick = vi.fn()
    render(<CalendarGrid selectedDate="2026-07-15" onPick={onPick} />)

    await user.click(screen.getByRole('button', { name: 'July 2026' }))
    await user.click(screen.getByRole('button', { name: 'Aug' }))

    expect(screen.getByText('August 2026')).toBeInTheDocument()
    expect(onPick).not.toHaveBeenCalled()
  })

  it('picking a year drills to month view of that year without calling onPick', async () => {
    const user = userEvent.setup()
    const onPick = vi.fn()
    render(<CalendarGrid selectedDate="2026-07-15" onPick={onPick} />)

    await user.click(screen.getByRole('button', { name: 'July 2026' }))
    await user.click(screen.getByRole('button', { name: '2026' }))
    await user.click(screen.getByRole('button', { name: '2020' }))

    expect(screen.getByText('2020')).toBeInTheDocument()
    expect(onPick).not.toHaveBeenCalled()
    expect(screen.queryByRole('button', { pressed: true })).not.toBeInTheDocument()
  })

  it('only highlights the month/year containing the selected date', async () => {
    const user = userEvent.setup()
    render(<CalendarGrid selectedDate="2026-07-15" onPick={() => {}} />)

    await user.click(screen.getByRole('button', { name: 'July 2026' }))

    expect(screen.getByRole('button', { name: 'Jul', pressed: true })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Aug', pressed: false })).toBeInTheDocument()
  })

  it('shows a Today link only in day view; clicking it moves the view without picking', async () => {
    const user = userEvent.setup()
    const onPick = vi.fn()
    const now = new Date()
    render(<CalendarGrid selectedDate="2020-01-01" onPick={onPick} />)

    expect(screen.getByRole('button', { name: 'Today' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Today' }))

    expect(
      screen.getByText(`${MONTH_NAMES[now.getMonth()]} ${now.getFullYear()}`),
    ).toBeInTheDocument()
    expect(onPick).not.toHaveBeenCalled()

    await user.click(
      screen.getByRole('button', { name: `${MONTH_NAMES[now.getMonth()]} ${now.getFullYear()}` }),
    )
    expect(screen.queryByRole('button', { name: 'Today' })).not.toBeInTheDocument()
  })

  it('arrow keys move focus day-to-day, paging across a month boundary', async () => {
    const user = userEvent.setup()
    render(<CalendarGrid selectedDate="2026-07-31" onPick={() => {}} />)

    expect(focusedRovingKey()).toBe('2026-07-31')

    await user.keyboard('{ArrowRight}')

    expect(screen.getByText('August 2026')).toBeInTheDocument()
    expect(focusedRovingKey()).toBe('2026-08-01')
  })

  it('PageDown/PageUp change month, clamping day-of-month to the new month length', async () => {
    const user = userEvent.setup()
    render(<CalendarGrid selectedDate="2026-01-31" onPick={() => {}} />)

    await user.keyboard('{PageDown}')
    expect(screen.getByText('February 2026')).toBeInTheDocument()
    expect(focusedRovingKey()).toBe('2026-02-28')

    await user.keyboard('{PageUp}')
    expect(screen.getByText('January 2026')).toBeInTheDocument()
    expect(focusedRovingKey()).toBe('2026-01-28')
  })

  it('Shift+PageDown/PageUp change year, clamping day-of-month to the new month length', async () => {
    const user = userEvent.setup()
    render(<CalendarGrid selectedDate="2024-02-29" onPick={() => {}} />)

    await user.keyboard('{Shift>}{PageDown}{/Shift}')

    expect(screen.getByText('February 2025')).toBeInTheDocument()
    expect(focusedRovingKey()).toBe('2025-02-28')
  })

  it('Home/End move focus to the start/end of the focused week', async () => {
    const user = userEvent.setup()
    render(<CalendarGrid selectedDate="2026-07-15" onPick={() => {}} />)

    await user.keyboard('{Home}')
    expect(focusedRovingKey()).toBe('2026-07-12')

    await user.keyboard('{End}')
    expect(focusedRovingKey()).toBe('2026-07-18')
  })

  it('month grid arrow-key nav moves focus and clamps at the edges', async () => {
    const user = userEvent.setup()
    render(<CalendarGrid selectedDate="2026-01-15" onPick={() => {}} />)

    await user.click(screen.getByRole('button', { name: 'January 2026' }))
    expect(focusedRovingKey()).toBe('0')

    await user.keyboard('{ArrowUp}')
    expect(focusedRovingKey()).toBe('0')

    await user.keyboard('{ArrowDown}')
    expect(focusedRovingKey()).toBe('4')
  })

  it('year grid arrow-key nav moves focus and clamps at page edges', async () => {
    const user = userEvent.setup()
    render(<CalendarGrid selectedDate="2016-01-15" onPick={() => {}} />)

    await user.click(screen.getByRole('button', { name: 'January 2016' }))
    await user.click(screen.getByRole('button', { name: '2016' }))
    expect(focusedRovingKey()).toBe('2016')

    await user.keyboard('{ArrowLeft}')
    expect(focusedRovingKey()).toBe('2016')
  })

  it('always reopens on day view, even if it was left in a drilled-up state', async () => {
    const user = userEvent.setup()
    const { unmount } = render(<CalendarGrid selectedDate="2026-07-15" onPick={() => {}} />)

    await user.click(screen.getByRole('button', { name: 'July 2026' }))
    await user.click(screen.getByRole('button', { name: '2026' }))
    expect(screen.getByText('2016–2027')).toBeInTheDocument()

    unmount()
    render(<CalendarGrid selectedDate="2026-07-15" onPick={() => {}} />)

    expect(screen.getByText('July 2026')).toBeInTheDocument()
  })
})
