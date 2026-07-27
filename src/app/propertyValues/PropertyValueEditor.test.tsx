import { useState } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PropertyValueEditor } from './PropertyValueEditor'
import type { CustomDataType, DataTypeRef, PropertyValueData } from '../../domain/entities.types'

afterEach(() => {
  cleanup()
})

const noCustomTypes = () => undefined

describe('PropertyValueEditor — primitives', () => {
  it('renders a text input and reports changes', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(
      <PropertyValueEditor
        typeRef={{ kind: 'primitive', primitive: 'text' }}
        value="hello"
        onChange={onChange}
        resolveCustomType={noCustomTypes}
      />,
    )
    await user.type(screen.getByDisplayValue('hello'), '!')
    expect(onChange).toHaveBeenCalled()
  })

  it('renders a number input and coerces to a number', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(
      <PropertyValueEditor
        typeRef={{ kind: 'primitive', primitive: 'number' }}
        value={null}
        onChange={onChange}
        resolveCustomType={noCustomTypes}
      />,
    )
    await user.type(screen.getByRole('spinbutton'), '5')
    expect(onChange).toHaveBeenLastCalledWith(5)
  })

  it('renders a boolean switch and toggles it', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(
      <PropertyValueEditor
        typeRef={{ kind: 'primitive', primitive: 'boolean' }}
        value={false}
        onChange={onChange}
        resolveCustomType={noCustomTypes}
      />,
    )
    await user.click(screen.getByRole('switch'))
    expect(onChange).toHaveBeenCalledWith(true)
  })

  it('renders a select dropdown restricted to declared options', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    const typeRef: DataTypeRef = {
      kind: 'primitive',
      primitive: 'select',
      options: [
        { id: '1', label: 'Low', value: 'low' },
        { id: '2', label: 'High', value: 'high' },
      ],
    }
    render(
      <PropertyValueEditor typeRef={typeRef} value={null} onChange={onChange} resolveCustomType={noCustomTypes} />,
    )
    await user.click(screen.getByRole('button', { name: 'Not set' }))
    await user.click(screen.getByRole('menuitemradio', { name: 'High' }))
    expect(onChange).toHaveBeenCalledWith('high')
  })

  it('resolves and delegates to a referenced custom type', () => {
    const inner: CustomDataType = {
      id: 'inner',
      name: 'Inner',
      schema: { kind: 'primitive', primitive: 'text' },
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    }
    render(
      <PropertyValueEditor
        typeRef={{ kind: 'customTypeRef', customTypeId: 'inner' }}
        value="hi"
        onChange={() => {}}
        resolveCustomType={(id) => (id === 'inner' ? inner : undefined)}
      />,
    )
    expect(screen.getByDisplayValue('hi')).toBeInTheDocument()
  })

  it('shows a fallback for an unresolved custom type reference', () => {
    render(
      <PropertyValueEditor
        typeRef={{ kind: 'customTypeRef', customTypeId: 'missing' }}
        value={null}
        onChange={() => {}}
        resolveCustomType={noCustomTypes}
      />,
    )
    expect(screen.getByText('Unknown type')).toBeInTheDocument()
  })
})

describe('PropertyValueEditor — composites', () => {
  const textType: DataTypeRef = { kind: 'primitive', primitive: 'text' }
  const numberType: DataTypeRef = { kind: 'primitive', primitive: 'number' }

  it('renders a list, adds an item with a default value, and can remove it', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(
      <PropertyValueEditor
        typeRef={{ kind: 'list', itemType: textType }}
        value={[]}
        onChange={onChange}
        resolveCustomType={noCustomTypes}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Add item' }))
    expect(onChange).toHaveBeenLastCalledWith([''])
  })

  it('disables adding to a list once maxSize is reached', () => {
    render(
      <PropertyValueEditor
        typeRef={{ kind: 'list', itemType: textType, maxSize: 1 }}
        value={['already here']}
        onChange={() => {}}
        resolveCustomType={noCustomTypes}
      />,
    )
    expect(screen.getByRole('button', { name: 'Add item' })).toBeDisabled()
  })

  it('renders a tuple as a fixed-length row of typed editors', () => {
    render(
      <PropertyValueEditor
        typeRef={{ kind: 'tuple', itemTypes: [textType, numberType] }}
        value={['step one', 1]}
        onChange={() => {}}
        resolveCustomType={noCustomTypes}
      />,
    )
    expect(screen.getByDisplayValue('step one')).toBeInTheDocument()
    expect(screen.getByRole('spinbutton')).toHaveValue(1)
  })

  it('renders a dictionary nesting a List of Tuples and updates a nested value (acceptance scenario)', async () => {
    const user = userEvent.setup()
    const typeRef: DataTypeRef = {
      kind: 'dictionary',
      fields: [
        {
          key: 'steps',
          typeRef: {
            kind: 'list',
            itemType: { kind: 'tuple', itemTypes: [textType, numberType] },
          },
        },
      ],
    }

    function Harness() {
      const [value, setValue] = useState<PropertyValueData>({ steps: [['Preheat', 1]] })
      return (
        <PropertyValueEditor
          typeRef={typeRef}
          value={value}
          onChange={setValue}
          resolveCustomType={noCustomTypes}
        />
      )
    }

    render(<Harness />)

    expect(screen.getByText('steps')).toBeInTheDocument()
    await user.clear(screen.getByDisplayValue('Preheat'))
    await user.type(screen.getByRole('textbox'), 'Bake')

    expect(screen.getByDisplayValue('Bake')).toBeInTheDocument()
  })
})
