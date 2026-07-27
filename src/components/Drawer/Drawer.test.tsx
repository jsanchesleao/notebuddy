import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Drawer } from './Drawer'

afterEach(() => {
  cleanup()
})

describe('Drawer', () => {
  it('is hidden from assistive tech when closed but still rendered', () => {
    render(
      <Drawer open={false} onClose={() => {}}>
        <p>Content</p>
      </Drawer>,
    )
    expect(screen.getByRole('dialog', { hidden: true })).toHaveAttribute('aria-hidden', 'true')
  })

  it('is visible when open', () => {
    render(
      <Drawer open onClose={() => {}}>
        <p>Content</p>
      </Drawer>,
    )
    expect(screen.getByRole('dialog')).toHaveAttribute('aria-hidden', 'false')
    expect(screen.getByText('Content')).toBeInTheDocument()
  })

  it('calls onClose when the backdrop is clicked', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    const { container } = render(
      <Drawer open onClose={onClose}>
        <p>Content</p>
      </Drawer>,
    )

    await user.click(container.firstElementChild as HTMLElement)
    expect(onClose).toHaveBeenCalled()
  })

  it('calls onClose on Escape while open', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(
      <Drawer open onClose={onClose}>
        <p>Content</p>
      </Drawer>,
    )

    await user.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalled()
  })
})
