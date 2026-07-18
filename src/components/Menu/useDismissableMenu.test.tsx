import { act, cleanup, render } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import { useDismissableMenu } from './useDismissableMenu'

function Harness() {
  const { open, setOpen, containerRef } = useDismissableMenu<HTMLDivElement>()

  return (
    <div>
      <button type="button" onClick={() => setOpen(true)}>
        Open
      </button>
      <div ref={containerRef} data-testid="container">
        {open && <div data-testid="menu">Menu content</div>}
      </div>
      <button type="button" data-testid="outside">
        Outside
      </button>
    </div>
  )
}

afterEach(() => {
  cleanup()
})

describe('useDismissableMenu', () => {
  it('closes when clicking outside the container', async () => {
    const user = userEvent.setup()
    const { getByText, getByTestId, queryByTestId } = render(<Harness />)

    await user.click(getByText('Open'))
    expect(queryByTestId('menu')).toBeInTheDocument()

    await user.click(getByTestId('outside'))
    expect(queryByTestId('menu')).not.toBeInTheDocument()
  })

  it('stays open when clicking inside the container', async () => {
    const user = userEvent.setup()
    const { getByText, getByTestId, queryByTestId } = render(<Harness />)

    await user.click(getByText('Open'))
    await user.click(getByTestId('container'))
    expect(queryByTestId('menu')).toBeInTheDocument()
  })

  it('closes on Escape', async () => {
    const user = userEvent.setup()
    const { getByText, queryByTestId } = render(<Harness />)

    await user.click(getByText('Open'))
    expect(queryByTestId('menu')).toBeInTheDocument()

    await act(async () => {
      await user.keyboard('{Escape}')
    })
    expect(queryByTestId('menu')).not.toBeInTheDocument()
  })
})
