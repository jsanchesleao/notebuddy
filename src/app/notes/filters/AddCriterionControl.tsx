import { useState } from 'react'
import { DismissableDropdown } from '../../../components/Menu/DismissableDropdown'
import dropdownStyles from '../../../components/Menu/DismissableDropdown.module.css'
import { Icon } from '../../../components/Icon/Icon'
import { createDefaultValue } from '../../../domain/dataTypes/defaultValueGenerator'
import { createId } from '../../../domain/ids'
import { OPERATORS_BY_PRIMITIVE } from '../../../domain/notes/noteFilter.types'
import type { FilterCriterion, FilterableProperty } from '../../../domain/notes/noteFilter.types'
import type { CustomDataType } from '../../../domain/entities.types'

interface AddCriterionControlProps {
  filterableProperties: FilterableProperty[]
  resolveCustomType: (id: string) => CustomDataType | undefined
  onAdd: (criterion: FilterCriterion) => void
}

type Stage = 'root' | 'property'

export function AddCriterionControl({
  filterableProperties,
  resolveCustomType,
  onAdd,
}: AddCriterionControlProps) {
  const [stage, setStage] = useState<Stage>('root')

  const addAndClose = (criterion: FilterCriterion, close: () => void) => {
    onAdd(criterion)
    close()
  }

  const addProperty = (property: FilterableProperty, close: () => void) => {
    const operand = createDefaultValue(
      { kind: 'primitive', primitive: property.primitive, options: property.options },
      { resolveCustomType },
    )
    addAndClose(
      {
        id: createId(),
        kind: 'property',
        propertyKey: property.key,
        primitive: property.primitive,
        options: property.options,
        operator: OPERATORS_BY_PRIMITIVE[property.primitive][0],
        operand,
      },
      close,
    )
  }

  return (
    <DismissableDropdown
      trigger={({ toggle, open }) => (
        <button
          type="button"
          className={dropdownStyles.trigger}
          aria-expanded={open}
          onClick={() => {
            if (!open) setStage('root')
            toggle()
          }}
        >
          <Icon name="add" size={12} /> Add criterion
        </button>
      )}
    >
      {({ close }) =>
        stage === 'root' ? (
          <>
            <button
              type="button"
              role="menuitem"
              className={dropdownStyles.menuItem}
              onClick={() => addAndClose({ id: createId(), kind: 'tag', tag: '' }, close)}
            >
              Tag
            </button>
            <button
              type="button"
              role="menuitem"
              className={dropdownStyles.menuItem}
              onClick={() =>
                addAndClose({ id: createId(), kind: 'noteType', noteTypeId: null }, close)
              }
            >
              Note type
            </button>
            <button
              type="button"
              role="menuitem"
              className={dropdownStyles.menuItem}
              onClick={() => addAndClose({ id: createId(), kind: 'title', text: '' }, close)}
            >
              Title
            </button>
            <button
              type="button"
              role="menuitem"
              className={dropdownStyles.menuItem}
              disabled={filterableProperties.length === 0}
              onClick={() => setStage('property')}
            >
              Property…
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              className={dropdownStyles.menuItem}
              onClick={() => setStage('root')}
            >
              <Icon name="back" size={12} /> Back
            </button>
            {filterableProperties.map((property) => (
              <button
                key={property.key}
                type="button"
                role="menuitem"
                className={dropdownStyles.menuItem}
                onClick={() => addProperty(property, close)}
              >
                {property.key}
              </button>
            ))}
          </>
        )
      }
    </DismissableDropdown>
  )
}
