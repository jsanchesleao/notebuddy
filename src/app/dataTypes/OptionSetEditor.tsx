import {
  createCustomDataType,
  updateCustomDataType,
} from '../../domain/dataTypes/dataTypeRepository'
import { OptionSetForm } from './OptionSetForm'
import type { CustomDataType, SelectOption } from '../../domain/entities.types'

interface OptionSetEditorProps {
  editing: CustomDataType | null
  onDone: () => void
}

function optionsOf(type: CustomDataType): SelectOption[] {
  return type.schema.kind === 'primitive' && type.schema.primitive === 'select'
    ? (type.schema.options ?? [])
    : []
}

export function OptionSetEditor({ editing, onDone }: OptionSetEditorProps) {
  const handleSubmit = async (name: string, options: SelectOption[]) => {
    const schema = { kind: 'primitive' as const, primitive: 'select' as const, options }
    if (editing) {
      await updateCustomDataType(editing.id, { name, schema })
    } else {
      await createCustomDataType({ name, schema })
    }
    onDone()
  }

  return (
    <OptionSetForm
      initialName={editing?.name}
      initialOptions={editing ? optionsOf(editing) : []}
      nameLabel="Option set name"
      submitLabel={editing ? 'Save changes' : 'Create set'}
      onSubmit={handleSubmit}
      onCancel={onDone}
    />
  )
}
