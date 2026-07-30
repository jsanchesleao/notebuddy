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
        availableCustomTypes={[]}
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
        availableCustomTypes={[]}
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
        availableCustomTypes={[]}
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
      <PropertyValueEditor
        typeRef={typeRef}
        value={null}
        onChange={onChange}
        resolveCustomType={noCustomTypes}
        availableCustomTypes={[]}
      />,
    )
    await user.click(screen.getByRole('button', { name: 'Not set' }))
    await user.click(screen.getByRole('menuitemradio', { name: 'High' }))
    expect(onChange).toHaveBeenCalledWith('high')
  })

  it('shows a stored select value that no longer matches any declared option as stale', () => {
    const typeRef: DataTypeRef = {
      kind: 'primitive',
      primitive: 'select',
      options: [{ id: '1', label: 'Low', value: 'low' }],
    }
    render(
      <PropertyValueEditor
        typeRef={typeRef}
        value="archived"
        onChange={() => {}}
        resolveCustomType={noCustomTypes}
        availableCustomTypes={[]}
      />,
    )
    expect(screen.getByRole('button', { name: /archived \(unavailable\)/ })).toBeInTheDocument()
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
        availableCustomTypes={[]}
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
        availableCustomTypes={[]}
      />,
    )
    expect(screen.getByText('Unknown type')).toBeInTheDocument()
  })
})

describe('PropertyValueEditor — composites', () => {
  const textType: DataTypeRef = { kind: 'primitive', primitive: 'text' }
  const numberType: DataTypeRef = { kind: 'primitive', primitive: 'number' }

  it('renders a text list as pills and adds a new item via the trailing input', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(
      <PropertyValueEditor
        typeRef={{ kind: 'list', itemType: textType }}
        value={[]}
        onChange={onChange}
        resolveCustomType={noCustomTypes}
        availableCustomTypes={[]}
      />,
    )

    await user.type(screen.getByLabelText('New item'), 'urgent')
    await user.click(screen.getByRole('button', { name: 'Add item' }))
    expect(onChange).toHaveBeenLastCalledWith(['urgent'])
  })

  it('edits a text list pill in place via its popover', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(
      <PropertyValueEditor
        typeRef={{ kind: 'list', itemType: textType }}
        value={['draft']}
        onChange={onChange}
        resolveCustomType={noCustomTypes}
        availableCustomTypes={[]}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'draft' }))
    const editInput = screen.getByLabelText('Edit item')
    await user.clear(editInput)
    await user.type(editInput, 'final')
    await user.click(screen.getByRole('button', { name: 'Save' }))
    expect(onChange).toHaveBeenLastCalledWith(['final'])
  })

  it('removes a text list pill', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(
      <PropertyValueEditor
        typeRef={{ kind: 'list', itemType: textType }}
        value={['draft']}
        onChange={onChange}
        resolveCustomType={noCustomTypes}
        availableCustomTypes={[]}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Remove item 1' }))
    expect(onChange).toHaveBeenLastCalledWith([])
  })

  it('disables adding to a list once maxSize is reached', () => {
    render(
      <PropertyValueEditor
        typeRef={{ kind: 'list', itemType: textType, maxSize: 1 }}
        value={['already here']}
        onChange={() => {}}
        resolveCustomType={noCustomTypes}
        availableCustomTypes={[]}
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
        availableCustomTypes={[]}
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
          availableCustomTypes={[]}
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

describe('PropertyValueEditor — dictionary schema editing (onSchemaChange)', () => {
  function DictionaryHarness({
    initialTypeRef,
    initialValue,
  }: {
    initialTypeRef: DataTypeRef
    initialValue: PropertyValueData
  }) {
    const [typeRef, setTypeRef] = useState(initialTypeRef)
    const [value, setValue] = useState(initialValue)
    return (
      <PropertyValueEditor
        typeRef={typeRef}
        value={value}
        onChange={setValue}
        onSchemaChange={(nextTypeRef, nextValue) => {
          setTypeRef(nextTypeRef)
          setValue(nextValue)
        }}
        resolveCustomType={noCustomTypes}
        availableCustomTypes={[]}
      />
    )
  }

  it('shows just the add-entry button on an empty dictionary', () => {
    render(
      <DictionaryHarness initialTypeRef={{ kind: 'dictionary', fields: [] }} initialValue={{}} />,
    )
    expect(screen.getByRole('button', { name: 'Add entry' })).toBeInTheDocument()
  })

  it('adds an entry defaulting to Text, renames its key, and edits its value', async () => {
    const user = userEvent.setup()
    render(
      <DictionaryHarness initialTypeRef={{ kind: 'dictionary', fields: [] }} initialValue={{}} />,
    )

    await user.click(screen.getByRole('button', { name: 'Add entry' }))
    const keyInput = screen.getByLabelText('Entry key 1')
    expect(keyInput).toHaveValue('')

    await user.type(keyInput, 'color')
    expect(screen.getByLabelText('Entry key 1')).toHaveValue('color')

    const valueInput = screen
      .getAllByRole('textbox')
      .find((el) => el !== screen.getByLabelText('Entry key 1'))
    await user.type(valueInput!, 'blue')
    expect(valueInput).toHaveValue('blue')
  })

  it('retypes an entry, resetting its value to the new type default', async () => {
    const user = userEvent.setup()
    render(
      <DictionaryHarness
        initialTypeRef={{
          kind: 'dictionary',
          fields: [{ key: 'count', typeRef: { kind: 'primitive', primitive: 'text' } }],
        }}
        initialValue={{ count: 'three' }}
      />,
    )

    await user.click(screen.getByRole('button', { name: /^Text/ }))
    await user.click(screen.getByRole('menuitemradio', { name: 'Number' }))

    expect(screen.getByRole('spinbutton')).toHaveValue(null)
  })

  it('removes an entry', async () => {
    const user = userEvent.setup()
    render(
      <DictionaryHarness
        initialTypeRef={{
          kind: 'dictionary',
          fields: [{ key: 'color', typeRef: { kind: 'primitive', primitive: 'text' } }],
        }}
        initialValue={{ color: 'blue' }}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Remove entry 1' }))
    expect(screen.queryByLabelText('Entry key 1')).not.toBeInTheDocument()
  })

  it('reorders entries via the move-down/move-up buttons', async () => {
    const user = userEvent.setup()
    render(
      <DictionaryHarness
        initialTypeRef={{
          kind: 'dictionary',
          fields: [
            { key: 'first', typeRef: { kind: 'primitive', primitive: 'text' } },
            { key: 'second', typeRef: { kind: 'primitive', primitive: 'text' } },
          ],
        }}
        initialValue={{ first: '1', second: '2' }}
      />,
    )

    expect(screen.getByLabelText('Entry key 1')).toHaveValue('first')
    await user.click(screen.getByRole('button', { name: 'Move entry 1 down' }))
    expect(screen.getByLabelText('Entry key 1')).toHaveValue('second')
    expect(screen.getByLabelText('Entry key 2')).toHaveValue('first')
  })

  it('flags duplicate keys without blocking editing', async () => {
    const user = userEvent.setup()
    render(
      <DictionaryHarness
        initialTypeRef={{
          kind: 'dictionary',
          fields: [{ key: 'a', typeRef: { kind: 'primitive', primitive: 'text' } }],
        }}
        initialValue={{ a: '' }}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Add entry' }))
    await user.type(screen.getByLabelText('Entry key 2'), 'a')

    expect(screen.getByText('Field names must be unique.')).toBeInTheDocument()
  })

  it('does not forward schema editing through a customTypeRef boundary', () => {
    const inner: CustomDataType = {
      id: 'inner',
      name: 'Inner',
      schema: {
        kind: 'dictionary',
        fields: [{ key: 'note', typeRef: { kind: 'primitive', primitive: 'text' } }],
      },
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    }
    render(
      <PropertyValueEditor
        typeRef={{ kind: 'customTypeRef', customTypeId: 'inner' }}
        value={{ note: 'hi' }}
        onChange={() => {}}
        onSchemaChange={() => {}}
        resolveCustomType={(id) => (id === 'inner' ? inner : undefined)}
        availableCustomTypes={[]}
      />,
    )

    expect(screen.queryByRole('button', { name: 'Add entry' })).not.toBeInTheDocument()
    expect(screen.getByText('note')).toBeInTheDocument()
  })
})

describe('PropertyValueEditor — list/set item type editing (onSchemaChange)', () => {
  function ItemTypeHarness({
    initialTypeRef,
    initialValue,
    availableCustomTypes = [],
  }: {
    initialTypeRef: DataTypeRef
    initialValue: PropertyValueData
    availableCustomTypes?: CustomDataType[]
  }) {
    const [typeRef, setTypeRef] = useState(initialTypeRef)
    const [value, setValue] = useState(initialValue)
    return (
      <PropertyValueEditor
        typeRef={typeRef}
        value={value}
        onChange={setValue}
        onSchemaChange={(nextTypeRef, nextValue) => {
          setTypeRef(nextTypeRef)
          setValue(nextValue)
        }}
        resolveCustomType={(id) => availableCustomTypes.find((type) => type.id === id)}
        availableCustomTypes={availableCustomTypes}
      />
    )
  }

  it('retypes a list item type and clears existing items', async () => {
    const user = userEvent.setup()
    render(
      <ItemTypeHarness
        initialTypeRef={{ kind: 'list', itemType: { kind: 'primitive', primitive: 'text' } }}
        initialValue={['a', 'b']}
      />,
    )

    expect(screen.getByRole('button', { name: 'a' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /^Text/ }))
    await user.click(screen.getByRole('menuitemradio', { name: 'Number' }))

    expect(screen.queryByRole('button', { name: 'a' })).not.toBeInTheDocument()
    expect(screen.queryByRole('spinbutton')).not.toBeInTheDocument()
  })

  it('retypes a set item type and clears existing items', async () => {
    const user = userEvent.setup()
    render(
      <ItemTypeHarness
        initialTypeRef={{ kind: 'set', itemType: { kind: 'primitive', primitive: 'text' } }}
        initialValue={['a', 'b']}
      />,
    )

    await user.click(screen.getByRole('button', { name: /^Text/ }))
    await user.click(screen.getByRole('menuitemradio', { name: 'Number' }))

    expect(screen.queryByRole('button', { name: 'a' })).not.toBeInTheDocument()
    expect(screen.queryByRole('spinbutton')).not.toBeInTheDocument()
  })

  it('offers a custom type as a selectable list item type', async () => {
    const user = userEvent.setup()
    const address: CustomDataType = {
      id: 'addr',
      name: 'Address',
      schema: { kind: 'primitive', primitive: 'text' },
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    }
    render(
      <ItemTypeHarness
        initialTypeRef={{ kind: 'list', itemType: { kind: 'primitive', primitive: 'number' } }}
        initialValue={[]}
        availableCustomTypes={[address]}
      />,
    )

    await user.click(screen.getByRole('button', { name: /^Number/ }))
    expect(screen.getByRole('menuitemradio', { name: 'Address' })).toBeInTheDocument()
  })

  it('does not show an item-type picker for a list reached through a customTypeRef', () => {
    const inner: CustomDataType = {
      id: 'inner',
      name: 'Inner',
      schema: { kind: 'list', itemType: { kind: 'primitive', primitive: 'text' } },
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    }
    render(
      <PropertyValueEditor
        typeRef={{ kind: 'customTypeRef', customTypeId: 'inner' }}
        value={[]}
        onChange={() => {}}
        onSchemaChange={() => {}}
        resolveCustomType={(id) => (id === 'inner' ? inner : undefined)}
        availableCustomTypes={[]}
      />,
    )

    expect(screen.queryByText('Item type')).not.toBeInTheDocument()
  })
})

describe('PropertyValueEditor — tuple slot editing (onSchemaChange)', () => {
  const textType: DataTypeRef = { kind: 'primitive', primitive: 'text' }
  const numberType: DataTypeRef = { kind: 'primitive', primitive: 'number' }

  function TupleHarness({
    initialTypeRef,
    initialValue,
  }: {
    initialTypeRef: DataTypeRef
    initialValue: PropertyValueData
  }) {
    const [typeRef, setTypeRef] = useState(initialTypeRef)
    const [value, setValue] = useState(initialValue)
    return (
      <PropertyValueEditor
        typeRef={typeRef}
        value={value}
        onChange={setValue}
        onSchemaChange={(nextTypeRef, nextValue) => {
          setTypeRef(nextTypeRef)
          setValue(nextValue)
        }}
        resolveCustomType={noCustomTypes}
        availableCustomTypes={[]}
      />
    )
  }

  it('adds a tuple position defaulting to Text', async () => {
    const user = userEvent.setup()
    render(
      <TupleHarness
        initialTypeRef={{ kind: 'tuple', itemTypes: [textType] }}
        initialValue={['first']}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Add position' }))

    expect(screen.getAllByRole('textbox')).toHaveLength(2)
  })

  it('retypes a tuple slot, resetting only that slot value', async () => {
    const user = userEvent.setup()
    render(
      <TupleHarness
        initialTypeRef={{ kind: 'tuple', itemTypes: [textType, numberType] }}
        initialValue={['x', 5]}
      />,
    )

    await user.click(screen.getByRole('button', { name: /^Text/ }))
    await user.click(screen.getByRole('menuitemradio', { name: 'Number' }))

    const spinbuttons = screen.getAllByRole('spinbutton')
    expect(spinbuttons).toHaveLength(2)
    expect(spinbuttons[0]).toHaveValue(null)
    expect(spinbuttons[1]).toHaveValue(5)
  })

  it('removes a tuple position', async () => {
    const user = userEvent.setup()
    render(
      <TupleHarness
        initialTypeRef={{ kind: 'tuple', itemTypes: [textType, numberType] }}
        initialValue={['x', 5]}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Remove position 1' }))

    expect(screen.queryByDisplayValue('x')).not.toBeInTheDocument()
    expect(screen.getByRole('spinbutton')).toHaveValue(5)
  })

  it('renders a tuple read-only with no controls when onSchemaChange is absent', () => {
    render(
      <PropertyValueEditor
        typeRef={{ kind: 'tuple', itemTypes: [textType, numberType] }}
        value={['x', 5]}
        onChange={() => {}}
        resolveCustomType={noCustomTypes}
        availableCustomTypes={[]}
      />,
    )

    expect(screen.queryByRole('button', { name: 'Add position' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Remove position/ })).not.toBeInTheDocument()
  })
})
