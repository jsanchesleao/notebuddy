import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createEmptyBlock } from '../../../../domain/blocks/noteBlocksFactory'
import { CodeBlock } from './CodeBlock'

afterEach(() => {
  cleanup()
})

describe('CodeBlock', () => {
  it('renders the language select and an empty code textarea', () => {
    const block = createEmptyBlock('code')
    render(<CodeBlock block={block} onUpdate={vi.fn()} />)

    expect(screen.getByLabelText('Code language')).toHaveValue('plaintext')
    expect(screen.getByLabelText('Code')).toHaveValue('')
  })

  it('debounces onUpdate after typing code', async () => {
    const block = createEmptyBlock('code')
    const onUpdate = vi.fn()
    const user = userEvent.setup()

    render(<CodeBlock block={block} onUpdate={onUpdate} />)
    await user.type(screen.getByLabelText('Code'), 'const x = 1')

    expect(onUpdate).not.toHaveBeenCalled()

    await waitFor(() => expect(onUpdate).toHaveBeenCalledTimes(1), { timeout: 1000 })
    expect(onUpdate).toHaveBeenCalledWith({ code: 'const x = 1' })
  })

  it('applies a language change immediately, without debounce', async () => {
    const block = createEmptyBlock('code')
    const onUpdate = vi.fn()
    const user = userEvent.setup()

    render(<CodeBlock block={block} onUpdate={onUpdate} />)
    await user.selectOptions(screen.getByLabelText('Code language'), 'javascript')

    expect(onUpdate).toHaveBeenCalledWith({ language: 'javascript' })
  })

  it('renders Prism token spans for a recognized language', () => {
    const block = { ...createEmptyBlock('code'), language: 'javascript', code: 'const x = 1' }
    const { container } = render(<CodeBlock block={block} onUpdate={vi.fn()} />)

    expect(container.querySelector('.token.keyword')).toBeInTheDocument()
  })
})
