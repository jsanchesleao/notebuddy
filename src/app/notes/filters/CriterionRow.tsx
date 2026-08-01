import { NoteTypeSelect } from '../../dataTypes/NoteTypeSelect'
import { TextValueEditor } from '../../propertyValues/TextValueEditor'
import { PrimitiveValueEditor } from '../../propertyValues/PropertyValueEditor'
import { Icon } from '../../../components/Icon/Icon'
import { OPERATORS_BY_PRIMITIVE } from '../../../domain/notes/noteFilter.types'
import type { FilterCriterion, PropertyOperator } from '../../../domain/notes/noteFilter.types'
import type { NoteType, TagRecord } from '../../../domain/entities.types'
import { TagCriterionSelect } from './TagCriterionSelect'
import styles from './CriterionRow.module.css'

const OPERATOR_LABELS: Record<PropertyOperator, string> = {
  contains: 'contains',
  equals: 'is',
  greaterThan: '>',
  lessThan: '<',
  before: 'before',
  after: 'after',
}

interface CriterionRowProps {
  criterion: FilterCriterion
  noteTypes: NoteType[]
  tags: TagRecord[]
  onChange: (criterion: FilterCriterion) => void
  onRemove: () => void
}

export function CriterionRow({
  criterion,
  noteTypes,
  tags,
  onChange,
  onRemove,
}: CriterionRowProps) {
  return (
    <div className={styles.row}>
      <CriterionOperand
        criterion={criterion}
        noteTypes={noteTypes}
        tags={tags}
        onChange={onChange}
      />
      <button
        type="button"
        className={styles.removeButton}
        aria-label="Remove criterion"
        onClick={onRemove}
      >
        <Icon name="close" size={12} />
      </button>
    </div>
  )
}

function CriterionOperand({
  criterion,
  noteTypes,
  tags,
  onChange,
}: Omit<CriterionRowProps, 'onRemove'>) {
  switch (criterion.kind) {
    case 'tag':
      return (
        <span className={styles.operand}>
          Tag is{' '}
          <TagCriterionSelect
            value={criterion.tag}
            onChange={(tag) => onChange({ ...criterion, tag })}
            tags={tags}
          />
        </span>
      )
    case 'noteType':
      return (
        <span className={styles.operand}>
          Note type is{' '}
          <NoteTypeSelect
            value={criterion.noteTypeId}
            onChange={(noteTypeId) => onChange({ ...criterion, noteTypeId })}
            noteTypes={noteTypes}
          />
        </span>
      )
    case 'title':
      return (
        <span className={styles.operand}>
          Title contains{' '}
          <TextValueEditor
            value={criterion.text}
            onChange={(text) => onChange({ ...criterion, text })}
          />
        </span>
      )
    case 'property': {
      const operators = OPERATORS_BY_PRIMITIVE[criterion.primitive]
      return (
        <span className={styles.operand}>
          <span className={styles.propertyKey}>{criterion.propertyKey}</span>
          {operators.length > 1 && (
            <span className={styles.operatorToggle} role="group" aria-label="Operator">
              {operators.map((operator) => (
                <button
                  key={operator}
                  type="button"
                  className={styles.operatorButton}
                  aria-pressed={criterion.operator === operator}
                  onClick={() => onChange({ ...criterion, operator })}
                >
                  {OPERATOR_LABELS[operator]}
                </button>
              ))}
            </span>
          )}
          <PrimitiveValueEditor
            primitiveType={{
              kind: 'primitive',
              primitive: criterion.primitive,
              options: criterion.options,
            }}
            value={criterion.operand}
            onChange={(operand) => onChange({ ...criterion, operand })}
          />
        </span>
      )
    }
  }
}
