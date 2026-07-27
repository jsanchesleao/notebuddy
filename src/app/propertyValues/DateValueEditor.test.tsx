import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DateValueEditor } from './DateValueEditor'

afterEach(() => {
  cleanup()
})

describe('DateValueEditor', () => {
  it('shows "Not set" with no value, and opens a calendar popover on click', async () => {
    const user = userEvent.setup()
    render(<DateValueEditor value={null} onChange={() => {}} />)

    expect(screen.getByRole('button', { name: 'Not set' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Not set' }))
    expect(screen.getByLabelText('Previous month')).toBeInTheDocument()
  })

  it('picking a day calls onChange with a YYYY-MM-DD string and closes the popover', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<DateValueEditor value="2026-07-15" onChange={onChange} />)

    await user.click(screen.getByRole('button', { name: '2026-07-15' }))
    await user.click(screen.getByRole('button', { name: '20', pressed: false }))

    expect(onChange).toHaveBeenCalledWith('2026-07-20')
    expect(screen.queryByLabelText('Previous month')).not.toBeInTheDocument()
  })

  it('navigating to the next month keeps the popover open', async () => {
    const user = userEvent.setup()
    render(<DateValueEditor value="2026-07-15" onChange={() => {}} />)

    await user.click(screen.getByRole('button', { name: '2026-07-15' }))
    await user.click(screen.getByLabelText('Next month'))

    expect(screen.getByText('August 2026')).toBeInTheDocument()
  })

  it('offers a Clear action that sets the value to null', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<DateValueEditor value="2026-07-15" onChange={onChange} />)

    await user.click(screen.getByRole('button', { name: '2026-07-15' }))
    await user.click(screen.getByRole('button', { name: 'Clear' }))

    expect(onChange).toHaveBeenCalledWith(null)
  })
})
