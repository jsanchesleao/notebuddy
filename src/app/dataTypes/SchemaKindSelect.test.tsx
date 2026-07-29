import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SchemaKindSelect } from './SchemaKindSelect'
import { buildSchemaKindOptions } from './schemaKinds'
import type { DataTypeRef } from '../../domain/entities.types'

afterEach(() => {
  cleanup()
})

const options = buildSchemaKindOptions({
  availableCustomTypes: [],
  includePrimitives: true,
  isCustomTypeSelectable: () => true,
})

function setup(onChange = vi.fn(), value: DataTypeRef = { kind: 'primitive', primitive: 'text' }) {
  render(<SchemaKindSelect value={value} options={options} onChange={onChange} />)
  return { onChange }
}

describe('SchemaKindSelect', () => {
  it('opens the menu with a search box on trigger click', async () => {
    const user = userEvent.setup()
    setup()

    await user.click(screen.getByRole('button', { name: /choose type|text/i }))

    expect(screen.getByRole('menu')).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: /search property types/i })).toHaveFocus()
  })

  it('filters options by a case-insensitive substring match', async () => {
    const user = userEvent.setup()
    setup()

    await user.click(screen.getByRole('button', { name: /text/i }))
    await user.type(screen.getByRole('textbox'), 'TIME')

    expect(screen.getByRole('menuitemradio', { name: 'Time' })).toBeInTheDocument()
    expect(screen.getByRole('menuitemradio', { name: 'Date & Time' })).toBeInTheDocument()
    expect(screen.queryByRole('menuitemradio', { name: 'Number' })).not.toBeInTheDocument()
  })

  it('shows an empty state when nothing matches', async () => {
    const user = userEvent.setup()
    setup()

    await user.click(screen.getByRole('button', { name: /text/i }))
    await user.type(screen.getByRole('textbox'), 'zzzzz')

    expect(screen.getByText('No matching types')).toBeInTheDocument()
    expect(screen.queryByRole('menuitemradio')).not.toBeInTheDocument()
  })

  it('selects the highlighted option with arrow keys + Enter', async () => {
    const user = userEvent.setup()
    const { onChange } = setup()

    await user.click(screen.getByRole('button', { name: /text/i }))
    await user.type(screen.getByRole('textbox'), 'date')
    // Matches in order: Date, Date & Time — arrow down once to reach "Date & Time"
    await user.keyboard('{ArrowDown}{Enter}')

    expect(onChange).toHaveBeenCalledWith({ kind: 'primitive', primitive: 'datetime' })
  })

  it('closes the menu on Escape', async () => {
    const user = userEvent.setup()
    setup()

    await user.click(screen.getByRole('button', { name: /text/i }))
    expect(screen.getByRole('menu')).toBeInTheDocument()

    await user.keyboard('{Escape}')

    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })

  it('closes the menu and applies the change on option click', async () => {
    const user = userEvent.setup()
    const { onChange } = setup()

    await user.click(screen.getByRole('button', { name: /text/i }))
    await user.click(screen.getByRole('menuitemradio', { name: 'Number' }))

    expect(onChange).toHaveBeenCalledWith({ kind: 'primitive', primitive: 'number' })
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })
})
