import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DateTimeValueEditor } from './DateTimeValueEditor'

afterEach(() => {
  cleanup()
})

// DismissableDropdown measures the nearest positioning boundary via
// findPositioningBoundary, which falls back to the documentElement's size
// when no ancestor constrains layout (as in these tests) — overriding
// clientWidth simulates rendering inside a narrow Drawer vs. a wide Modal.
function mockBoundaryWidth(width: number) {
  Object.defineProperty(document.documentElement, 'clientWidth', {
    value: width,
    configurable: true,
  })
}

describe('DateTimeValueEditor', () => {
  it('stacks the calendar above the time columns when the boundary is narrow (e.g. the Drawer)', async () => {
    mockBoundaryWidth(320)
    const user = userEvent.setup()
    const { container } = render(<DateTimeValueEditor value={null} onChange={() => {}} />)

    await user.click(screen.getByRole('button', { name: 'Not set' }))

    expect(container.querySelector('[data-stacked]')).toHaveAttribute('data-stacked', 'true')
  })

  it('keeps the calendar and time columns side by side when there is enough room (e.g. the Modal)', async () => {
    mockBoundaryWidth(1000)
    const user = userEvent.setup()
    const { container } = render(<DateTimeValueEditor value={null} onChange={() => {}} />)

    await user.click(screen.getByRole('button', { name: 'Not set' }))

    expect(container.querySelector('[data-stacked]')).toHaveAttribute('data-stacked', 'false')
  })

  it('picking a day commits a combined date+time value and closes the popover', async () => {
    mockBoundaryWidth(1000)
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<DateTimeValueEditor value="2026-07-15T09:15" onChange={onChange} />)

    await user.click(screen.getByRole('button', { name: '2026-07-15 09:15' }))
    // 27 avoids colliding with any Hour (00-23), Minute (multiples of 5), or
    // muted adjacent-month day button also rendered in the same popover.
    await user.click(screen.getByRole('button', { name: '27' }))

    expect(onChange).toHaveBeenCalledWith('2026-07-27T09:15')
  })

  it('focuses the Hour column immediately after opening, not a calendar day', async () => {
    mockBoundaryWidth(1000)
    const user = userEvent.setup()
    render(<DateTimeValueEditor value="2026-07-15T09:15" onChange={() => {}} />)

    await user.click(screen.getByRole('button', { name: '2026-07-15 09:15' }))

    expect(screen.getByRole('button', { name: '09' })).toHaveFocus()
  })
})
