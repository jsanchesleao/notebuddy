import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ColorValueEditor } from './ColorValueEditor'

afterEach(() => {
  cleanup()
})

describe('ColorValueEditor', () => {
  it('shows "Not set" with no value', () => {
    render(<ColorValueEditor value="" onChange={() => {}} />)
    expect(screen.getByRole('button', { name: 'Not set' })).toBeInTheDocument()
  })

  it('picking a swatch calls onChange with its hex value and closes the popover', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<ColorValueEditor value="" onChange={onChange} />)

    await user.click(screen.getByRole('button', { name: 'Not set' }))
    await user.click(screen.getByRole('button', { name: '#c0392b' }))

    expect(onChange).toHaveBeenCalledWith('#c0392b')
    expect(screen.queryByLabelText('Hex color')).not.toBeInTheDocument()
  })

  it('typing a valid hex value and submitting calls onChange', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<ColorValueEditor value="" onChange={onChange} />)

    await user.click(screen.getByRole('button', { name: 'Not set' }))
    await user.type(screen.getByLabelText('Hex color'), '#123abc')
    await user.click(screen.getByRole('button', { name: 'Set' }))

    expect(onChange).toHaveBeenCalledWith('#123abc')
  })

  it('disables the Set button while the hex value is invalid', async () => {
    const user = userEvent.setup()
    render(<ColorValueEditor value="" onChange={() => {}} />)

    await user.click(screen.getByRole('button', { name: 'Not set' }))
    await user.type(screen.getByLabelText('Hex color'), 'not-a-color')

    expect(screen.getByRole('button', { name: 'Set' })).toBeDisabled()
  })
})
