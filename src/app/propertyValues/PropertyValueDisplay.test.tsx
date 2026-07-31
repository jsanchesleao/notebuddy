import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PropertyValueDisplay } from './PropertyValueDisplay'
import { PrimitiveValueDisplay } from './PrimitiveValueDisplay'
import type { CustomDataType, DataTypeRef } from '../../domain/entities.types'

afterEach(() => {
  cleanup()
})

const noCustomTypes = () => undefined

describe('PrimitiveValueDisplay', () => {
  it('shows "Not set" for an empty text/number/link value', () => {
    render(<PrimitiveValueDisplay primitive="text" value={null} />)
    expect(screen.getByText('Not set')).toBeInTheDocument()
  })

  it('renders a link as a clickable anchor', () => {
    render(<PrimitiveValueDisplay primitive="link" value="https://example.com" />)
    const link = screen.getByRole('link', { name: 'https://example.com' })
    expect(link).toHaveAttribute('href', 'https://example.com')
    expect(link).toHaveAttribute('target', '_blank')
  })

  it('renders a boolean as a check or cross icon', () => {
    const { container, rerender } = render(<PrimitiveValueDisplay primitive="boolean" value={true} />)
    expect(container.querySelector('.lucide-check')).toBeInTheDocument()
    rerender(<PrimitiveValueDisplay primitive="boolean" value={false} />)
    expect(container.querySelector('.lucide-x')).toBeInTheDocument()
  })

  it('resolves a select value to its option label, and flags a stale value', () => {
    const options = [{ id: '1', label: 'High', value: 'high' }]
    const { rerender } = render(
      <PrimitiveValueDisplay primitive="select" value="high" options={options} />,
    )
    expect(screen.getByText('High')).toBeInTheDocument()

    rerender(<PrimitiveValueDisplay primitive="select" value="archived" options={options} />)
    expect(screen.getByText('archived (unavailable)')).toBeInTheDocument()
  })

  it('formats date/time/datetime values for display', () => {
    const { rerender } = render(<PrimitiveValueDisplay primitive="date" value="2026-07-31" />)
    expect(screen.getByText(/2026/)).toBeInTheDocument()

    rerender(<PrimitiveValueDisplay primitive="time" value="15:45" />)
    expect(screen.getByText(/3:45|15:45/)).toBeInTheDocument()

    rerender(<PrimitiveValueDisplay primitive="datetime" value="2026-07-31T15:45" />)
    expect(screen.getByText(/2026/)).toBeInTheDocument()
  })

  it('renders a color swatch with its hex text', () => {
    render(<PrimitiveValueDisplay primitive="color" value="#4f46e5" />)
    expect(screen.getByText('#4f46e5')).toBeInTheDocument()
  })
})

describe('PropertyValueDisplay — composites', () => {
  const textType: DataTypeRef = { kind: 'primitive', primitive: 'text' }
  const numberType: DataTypeRef = { kind: 'primitive', primitive: 'number' }
  const linkType: DataTypeRef = { kind: 'primitive', primitive: 'link' }

  it('shows "Not set" for an empty List/Set', () => {
    render(
      <PropertyValueDisplay
        typeRef={{ kind: 'list', itemType: numberType }}
        value={[]}
        resolveCustomType={noCustomTypes}
        availableCustomTypes={[]}
      />,
    )
    expect(screen.getByText('Not set')).toBeInTheDocument()
  })

  it('renders non-pill List items as chips, each using its own primitive display', () => {
    render(
      <PropertyValueDisplay
        typeRef={{ kind: 'list', itemType: linkType }}
        value={['https://a.com', 'https://b.com']}
        resolveCustomType={noCustomTypes}
        availableCustomTypes={[]}
      />,
    )
    expect(screen.getByRole('link', { name: 'https://a.com' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'https://b.com' })).toBeInTheDocument()
  })

  it('keeps pill quick-edit working for a text List when onChange is forwarded, hiding add/remove', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(
      <PropertyValueDisplay
        typeRef={{ kind: 'list', itemType: textType }}
        value={['draft']}
        onChange={onChange}
        resolveCustomType={noCustomTypes}
        availableCustomTypes={[]}
      />,
    )

    expect(screen.queryByRole('button', { name: 'Remove item 1' })).not.toBeInTheDocument()
    expect(screen.queryByLabelText('New item')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'draft' }))
    const editInput = screen.getByLabelText('Edit item')
    await user.clear(editInput)
    await user.type(editInput, 'final')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(onChange).toHaveBeenLastCalledWith(['final'])
  })

  it('renders a Tuple inline, comma-separated, and shows "Not set" for a zero-slot tuple', () => {
    const { rerender } = render(
      <PropertyValueDisplay
        typeRef={{ kind: 'tuple', itemTypes: [textType, numberType] }}
        value={['x', 5]}
        resolveCustomType={noCustomTypes}
        availableCustomTypes={[]}
      />,
    )
    expect(screen.getByText('x')).toBeInTheDocument()
    expect(screen.getByText('5')).toBeInTheDocument()

    rerender(
      <PropertyValueDisplay
        typeRef={{ kind: 'tuple', itemTypes: [] }}
        value={[]}
        resolveCustomType={noCustomTypes}
        availableCustomTypes={[]}
      />,
    )
    expect(screen.getByText('Not set')).toBeInTheDocument()
  })

  it('renders a Dictionary as stacked key: value rows, and "Not set" when it has no fields', () => {
    const { rerender } = render(
      <PropertyValueDisplay
        typeRef={{
          kind: 'dictionary',
          fields: [{ key: 'count', typeRef: numberType }],
        }}
        value={{ count: 3 }}
        resolveCustomType={noCustomTypes}
        availableCustomTypes={[]}
      />,
    )
    expect(screen.getByText('count:')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()

    rerender(
      <PropertyValueDisplay
        typeRef={{ kind: 'dictionary', fields: [] }}
        value={{}}
        resolveCustomType={noCustomTypes}
        availableCustomTypes={[]}
      />,
    )
    expect(screen.getByText('Not set')).toBeInTheDocument()
  })

  it('recursively renders a List of Dictionaries fully expanded, with each field using its own display', () => {
    render(
      <PropertyValueDisplay
        typeRef={{
          kind: 'list',
          itemType: {
            kind: 'dictionary',
            fields: [
              { key: 'lead', typeRef: textType },
              { key: 'size', typeRef: numberType },
            ],
          },
        }}
        value={[
          { lead: 'Alice', size: 4 },
          { lead: 'Bob', size: 2 },
        ]}
        resolveCustomType={noCustomTypes}
        availableCustomTypes={[]}
      />,
    )
    expect(screen.getByText('Alice')).toBeInTheDocument()
    expect(screen.getByText('Bob')).toBeInTheDocument()
    expect(screen.getAllByText('lead:')).toHaveLength(2)
    expect(screen.getAllByText('size:')).toHaveLength(2)
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
      <PropertyValueDisplay
        typeRef={{ kind: 'customTypeRef', customTypeId: 'inner' }}
        value="hi"
        resolveCustomType={(id) => (id === 'inner' ? inner : undefined)}
        availableCustomTypes={[]}
      />,
    )
    expect(screen.getByText('hi')).toBeInTheDocument()
  })

  it('shows a fallback for an unresolved custom type reference', () => {
    render(
      <PropertyValueDisplay
        typeRef={{ kind: 'customTypeRef', customTypeId: 'missing' }}
        value={null}
        resolveCustomType={noCustomTypes}
        availableCustomTypes={[]}
      />,
    )
    expect(screen.getByText('Unknown type')).toBeInTheDocument()
  })
})
