import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { db } from '../../db/db'
import { createCustomDataType } from '../../domain/dataTypes/dataTypeRepository'
import { OptionSetPicker } from './OptionSetPicker'

beforeEach(async () => {
  await db.customDataTypes.clear()
})

afterEach(() => {
  cleanup()
})

describe('OptionSetPicker', () => {
  it('lists only select-shaped custom types', async () => {
    const selectType = await createCustomDataType({
      name: 'Priority',
      schema: { kind: 'primitive', primitive: 'select', options: [] },
    })
    await createCustomDataType({ name: 'Recipe', schema: { kind: 'dictionary', fields: [] } })

    const user = userEvent.setup()
    render(
      <OptionSetPicker
        availableCustomTypes={await db.customDataTypes.toArray()}
        value={null}
        onChange={() => {}}
      />,
    )

    await user.click(screen.getByRole('button', { name: /Choose an option set/ }))
    expect(screen.getByRole('menuitemradio', { name: 'Priority' })).toBeInTheDocument()
    expect(screen.queryByText('Recipe')).not.toBeInTheDocument()
    expect(selectType.name).toBe('Priority')
  })

  it('selects an existing set', async () => {
    const selectType = await createCustomDataType({
      name: 'Priority',
      schema: { kind: 'primitive', primitive: 'select', options: [] },
    })

    const user = userEvent.setup()
    const onChange = vi.fn()
    render(
      <OptionSetPicker
        availableCustomTypes={await db.customDataTypes.toArray()}
        value={null}
        onChange={onChange}
      />,
    )

    await user.click(screen.getByRole('button', { name: /Choose an option set/ }))
    await user.click(screen.getByRole('menuitemradio', { name: 'Priority' }))

    expect(onChange).toHaveBeenCalledWith(selectType.id)
  })

  it('creates a new option set inline and selects it', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<OptionSetPicker availableCustomTypes={[]} value={null} onChange={onChange} />)

    await user.click(screen.getByRole('button', { name: /Choose an option set/ }))
    await user.click(screen.getByRole('button', { name: /New option set/ }))
    await user.type(screen.getByLabelText('New option set name'), 'Priority')
    await user.type(screen.getByLabelText('New option label'), 'Low')
    await user.click(screen.getByRole('button', { name: /Add option/ }))
    await user.click(screen.getByRole('button', { name: 'Create set' }))

    await waitFor(async () => {
      const stored = await db.customDataTypes.toArray()
      expect(stored.map((type) => type.name)).toContain('Priority')
    })
    expect(onChange).toHaveBeenCalled()
    const created = (await db.customDataTypes.toArray()).find((type) => type.name === 'Priority')
    expect(onChange).toHaveBeenCalledWith(created?.id)
  })

  it('edits an existing set’s options', async () => {
    const selectType = await createCustomDataType({
      name: 'Priority',
      schema: {
        kind: 'primitive',
        primitive: 'select',
        options: [{ id: '1', label: 'Low', value: 'low' }],
      },
    })

    const user = userEvent.setup()
    render(
      <OptionSetPicker
        availableCustomTypes={await db.customDataTypes.toArray()}
        value={null}
        onChange={() => {}}
      />,
    )

    await user.click(screen.getByRole('button', { name: /Choose an option set/ }))
    await user.click(screen.getByRole('button', { name: 'Edit Priority' }))
    await user.type(screen.getByLabelText('New option label'), 'High')
    await user.click(screen.getByRole('button', { name: /Add option/ }))
    await user.click(screen.getByRole('button', { name: 'Save changes' }))

    await waitFor(async () => {
      const updated = await db.customDataTypes.get(selectType.id)
      expect(updated?.schema).toMatchObject({
        options: [
          { label: 'Low', value: 'low' },
          { label: 'High', value: 'High' },
        ],
      })
    })
  })

  it('deletes a set after confirmation', async () => {
    await createCustomDataType({
      name: 'Priority',
      schema: { kind: 'primitive', primitive: 'select', options: [] },
    })

    const user = userEvent.setup()
    render(
      <OptionSetPicker
        availableCustomTypes={await db.customDataTypes.toArray()}
        value={null}
        onChange={() => {}}
      />,
    )

    await user.click(screen.getByRole('button', { name: /Choose an option set/ }))
    await user.click(screen.getByRole('button', { name: 'Delete Priority' }))
    await user.click(screen.getByRole('button', { name: 'Confirm' }))

    await waitFor(async () => {
      const stored = await db.customDataTypes.toArray()
      expect(stored).toHaveLength(0)
    })
  })
})
