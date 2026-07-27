import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SelectOptionsEditor } from './SelectOptionsEditor'
import type { SelectOption } from '../../domain/entities.types'

afterEach(() => {
  cleanup()
})

describe('SelectOptionsEditor', () => {
  it('adds a new option from the input', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<SelectOptionsEditor options={[]} onChange={onChange} />)

    await user.type(screen.getByLabelText('New option label'), 'Low')
    await user.click(screen.getByRole('button', { name: /Add option/ }))

    expect(onChange).toHaveBeenCalledWith([
      expect.objectContaining({ label: 'Low', value: 'Low' }),
    ])
  })

  it('removes an option', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    const options: SelectOption[] = [{ id: '1', label: 'Low', value: 'low' }]
    render(<SelectOptionsEditor options={options} onChange={onChange} />)

    await user.click(screen.getByRole('button', { name: 'Remove Low' }))
    expect(onChange).toHaveBeenCalledWith([])
  })

  it('reorders options up and down', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    const options: SelectOption[] = [
      { id: '1', label: 'Low', value: 'low' },
      { id: '2', label: 'High', value: 'high' },
    ]
    render(<SelectOptionsEditor options={options} onChange={onChange} />)

    await user.click(screen.getByRole('button', { name: 'Move High up' }))
    expect(onChange).toHaveBeenCalledWith([
      { id: '2', label: 'High', value: 'high' },
      { id: '1', label: 'Low', value: 'low' },
    ])
  })

  it('disables moving the first option up and the last option down', () => {
    const options: SelectOption[] = [
      { id: '1', label: 'Low', value: 'low' },
      { id: '2', label: 'High', value: 'high' },
    ]
    render(<SelectOptionsEditor options={options} onChange={() => {}} />)

    expect(screen.getByRole('button', { name: 'Move Low up' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Move High down' })).toBeDisabled()
  })
})
