import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TimeColumns } from './TimeColumns'

afterEach(() => {
  cleanup()
})

describe('TimeColumns', () => {
  it('centers the current hour and minute in the wheel as soon as it renders', () => {
    const scrollIntoView = vi.fn()
    vi.spyOn(HTMLElement.prototype, 'scrollIntoView').mockImplementation(scrollIntoView)

    render(<TimeColumns hour="09" minute="15" onPickHour={() => {}} onPickMinute={() => {}} />)

    expect(scrollIntoView).toHaveBeenCalledWith({ block: 'center' })
    expect(scrollIntoView).toHaveBeenCalledTimes(2)
  })

  it('auto-focuses the selected hour option on mount, so arrow keys work immediately', () => {
    render(<TimeColumns hour="09" minute="15" onPickHour={() => {}} onPickMinute={() => {}} />)

    expect(within(screen.getByLabelText('Hour')).getByRole('button', { name: '09' })).toHaveFocus()
  })

  it('still commits a value by clicking an option, unchanged from the plain-list behavior', async () => {
    const user = userEvent.setup()
    const onPickHour = vi.fn()
    const onPickMinute = vi.fn()
    render(
      <TimeColumns hour="09" minute="15" onPickHour={onPickHour} onPickMinute={onPickMinute} />,
    )

    await user.click(within(screen.getByLabelText('Hour')).getByRole('button', { name: '14' }))
    expect(onPickHour).toHaveBeenCalledWith('14', true)

    await user.click(within(screen.getByLabelText('Minute')).getByRole('button', { name: '30' }))
    expect(onPickMinute).toHaveBeenCalledWith('30', true)
  })

  it('ArrowDown moves to the next hour, and ArrowUp moves back, without committing', async () => {
    const user = userEvent.setup()
    const onPickHour = vi.fn()
    const { rerender } = render(
      <TimeColumns hour="09" minute="15" onPickHour={onPickHour} onPickMinute={() => {}} />,
    )

    await user.keyboard('{ArrowDown}')
    expect(onPickHour).toHaveBeenCalledWith('10', false)

    rerender(<TimeColumns hour="10" minute="15" onPickHour={onPickHour} onPickMinute={() => {}} />)
    expect(within(screen.getByLabelText('Hour')).getByRole('button', { name: '10' })).toHaveFocus()

    await user.keyboard('{ArrowUp}')
    expect(onPickHour).toHaveBeenCalledWith('09', false)
  })

  it('clamps at the boundaries instead of wrapping', async () => {
    const user = userEvent.setup()
    const onPickHour = vi.fn()
    render(<TimeColumns hour="00" minute="15" onPickHour={onPickHour} onPickMinute={() => {}} />)

    await user.keyboard('{ArrowUp}')
    expect(onPickHour).not.toHaveBeenCalled()
  })

  it('ArrowRight from the Hour column focuses the Minute column, and ArrowLeft returns', async () => {
    const user = userEvent.setup()
    render(<TimeColumns hour="09" minute="15" onPickHour={() => {}} onPickMinute={() => {}} />)

    expect(within(screen.getByLabelText('Hour')).getByRole('button', { name: '09' })).toHaveFocus()

    await user.keyboard('{ArrowRight}')
    expect(
      within(screen.getByLabelText('Minute')).getByRole('button', { name: '15' }),
    ).toHaveFocus()

    await user.keyboard('{ArrowLeft}')
    expect(within(screen.getByLabelText('Hour')).getByRole('button', { name: '09' })).toHaveFocus()
  })
})
