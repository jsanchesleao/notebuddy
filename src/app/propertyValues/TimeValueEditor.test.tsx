import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TimeValueEditor } from './TimeValueEditor'

afterEach(() => {
  cleanup()
})

describe('TimeValueEditor', () => {
  it('shows "Not set" with no value, and opens hour/minute columns on click', async () => {
    const user = userEvent.setup()
    render(<TimeValueEditor value={null} onChange={() => {}} />)

    expect(screen.getByRole('button', { name: 'Not set' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Not set' }))

    expect(screen.getByLabelText('Hour')).toBeInTheDocument()
    expect(screen.getByLabelText('Minute')).toBeInTheDocument()
  })

  it('picking an hour calls onChange with the combined value and keeps the popover open', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<TimeValueEditor value="09:15" onChange={onChange} />)

    await user.click(screen.getByRole('button', { name: '09:15' }))
    await user.click(within(screen.getByLabelText('Hour')).getByRole('button', { name: '14' }))

    expect(onChange).toHaveBeenCalledWith('14:15')
    expect(screen.getByLabelText('Hour')).toBeInTheDocument()
  })

  it('picking a minute calls onChange with the combined value and closes the popover', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<TimeValueEditor value="09:15" onChange={onChange} />)

    await user.click(screen.getByRole('button', { name: '09:15' }))
    await user.click(within(screen.getByLabelText('Minute')).getByRole('button', { name: '30' }))

    expect(onChange).toHaveBeenCalledWith('09:30')
    expect(screen.queryByLabelText('Hour')).not.toBeInTheDocument()
  })

  it('arrow-key stepping the minute wheel updates the value but keeps the popover open', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<TimeValueEditor value="09:15" onChange={onChange} />)

    await user.click(screen.getByRole('button', { name: '09:15' }))
    within(screen.getByLabelText('Minute')).getByRole('button', { name: '15' }).focus()
    await user.keyboard('{ArrowDown}')

    expect(onChange).toHaveBeenCalledWith('09:20')
    expect(screen.getByLabelText('Hour')).toBeInTheDocument()
  })
})
