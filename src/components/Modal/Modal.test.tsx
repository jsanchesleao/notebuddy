import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Modal } from './Modal'

afterEach(() => {
  cleanup()
})

describe('Modal', () => {
  it('renders nothing when closed', () => {
    render(
      <Modal open={false} onClose={() => {}}>
        <p>Content</p>
      </Modal>,
    )
    expect(screen.queryByText('Content')).not.toBeInTheDocument()
  })

  it('renders children when open', () => {
    render(
      <Modal open onClose={() => {}}>
        <p>Content</p>
      </Modal>,
    )
    expect(screen.getByText('Content')).toBeInTheDocument()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('calls onClose when the backdrop is clicked', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    const { container } = render(
      <Modal open onClose={onClose}>
        <p>Content</p>
      </Modal>,
    )

    await user.click(container.querySelector('[aria-hidden="true"]') as HTMLElement)
    expect(onClose).toHaveBeenCalled()
  })

  it('does not call onClose when clicking inside the panel', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(
      <Modal open onClose={onClose}>
        <p>Content</p>
      </Modal>,
    )

    await user.click(screen.getByText('Content'))
    expect(onClose).not.toHaveBeenCalled()
  })

  it('calls onClose on Escape', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(
      <Modal open onClose={onClose}>
        <p>Content</p>
      </Modal>,
    )

    await user.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalled()
  })
})
