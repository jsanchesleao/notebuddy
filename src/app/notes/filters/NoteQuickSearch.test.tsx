import { useState } from 'react'
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { NoteQuickSearch } from './NoteQuickSearch'

function Harness() {
  const [value, setValue] = useState('')
  return <NoteQuickSearch value={value} onChange={setValue} />
}

afterEach(() => {
  cleanup()
})

describe('NoteQuickSearch', () => {
  it('reports typed text via onChange', async () => {
    const user = userEvent.setup()
    render(<Harness />)

    await user.type(screen.getByRole('textbox', { name: 'Search notes by title' }), 'plan')

    expect(screen.getByRole('textbox', { name: 'Search notes by title' })).toHaveValue('plan')
  })

  it('does not show a clear button when empty', () => {
    render(<Harness />)
    expect(screen.queryByRole('button', { name: 'Clear search' })).not.toBeInTheDocument()
  })

  it('clears the value when the clear button is clicked', async () => {
    const user = userEvent.setup()
    render(<Harness />)

    const input = screen.getByRole('textbox', { name: 'Search notes by title' })
    await user.type(input, 'plan')
    expect(input).toHaveValue('plan')

    await user.click(screen.getByRole('button', { name: 'Clear search' }))
    expect(input).toHaveValue('')
  })
})
