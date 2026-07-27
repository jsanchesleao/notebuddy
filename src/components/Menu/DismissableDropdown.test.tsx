import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DismissableDropdown } from './DismissableDropdown'

afterEach(() => {
  cleanup()
})

describe('DismissableDropdown', () => {
  it('opens the menu when the trigger is clicked and closes on item selection', async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()

    render(
      <DismissableDropdown
        trigger={({ toggle }) => (
          <button type="button" onClick={toggle}>
            Open
          </button>
        )}
      >
        {({ close }) => (
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              onSelect()
              close()
            }}
          >
            Option A
          </button>
        )}
      </DismissableDropdown>,
    )

    expect(screen.queryByRole('menuitem')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Open' }))
    expect(screen.getByRole('menuitem')).toBeInTheDocument()

    await user.click(screen.getByRole('menuitem'))
    expect(onSelect).toHaveBeenCalled()
    expect(screen.queryByRole('menuitem')).not.toBeInTheDocument()
  })

  it('closes when clicking outside the dropdown', async () => {
    const user = userEvent.setup()

    render(
      <div>
        <DismissableDropdown
          trigger={({ toggle }) => (
            <button type="button" onClick={toggle}>
              Open
            </button>
          )}
        >
          {() => <div role="menuitem">Option A</div>}
        </DismissableDropdown>
        <button type="button">Outside</button>
      </div>,
    )

    await user.click(screen.getByRole('button', { name: 'Open' }))
    expect(screen.getByRole('menuitem')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Outside' }))
    expect(screen.queryByRole('menuitem')).not.toBeInTheDocument()
  })
})
