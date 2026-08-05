import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { EntityPageHeader } from './EntityPageHeader'

afterEach(() => {
  cleanup()
})

describe('EntityPageHeader', () => {
  it('turns sticky notes visible when adding one while hidden', async () => {
    const user = userEvent.setup()
    const onToggleVisibility = vi.fn()
    const onAdd = vi.fn()

    render(
      <EntityPageHeader
        title="Note"
        icon="note"
        entityLabel="note"
        onRename={() => {}}
        onDelete={() => {}}
        stickyNotes={{ visible: false, onToggleVisibility, onAdd }}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Add sticky note' }))
    await user.click(screen.getByRole('button', { name: 'Text note' }))

    expect(onToggleVisibility).toHaveBeenCalledTimes(1)
    expect(onAdd).toHaveBeenCalledWith('text')
  })

  it('does not toggle visibility again when sticky notes are already visible', async () => {
    const user = userEvent.setup()
    const onToggleVisibility = vi.fn()
    const onAdd = vi.fn()

    render(
      <EntityPageHeader
        title="Note"
        icon="note"
        entityLabel="note"
        onRename={() => {}}
        onDelete={() => {}}
        stickyNotes={{ visible: true, onToggleVisibility, onAdd }}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Add sticky note' }))
    await user.click(screen.getByRole('button', { name: 'Sketch note' }))

    expect(onToggleVisibility).not.toHaveBeenCalled()
    expect(onAdd).toHaveBeenCalledWith('sketch')
  })
})
