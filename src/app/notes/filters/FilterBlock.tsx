import { CriterionRow } from './CriterionRow'
import { AddCriterionControl } from './AddCriterionControl'
import { Icon } from '../../../components/Icon/Icon'
import type {
  FilterBlock as FilterBlockData,
  FilterCriterion,
  FilterableProperty,
} from '../../../domain/notes/noteFilter.types'
import type { CustomDataType, NoteType, TagRecord } from '../../../domain/entities.types'
import styles from './FilterBlock.module.css'

interface FilterBlockProps {
  block: FilterBlockData
  mode: 'and' | 'or'
  noteTypes: NoteType[]
  tags: TagRecord[]
  filterableProperties: FilterableProperty[]
  resolveCustomType: (id: string) => CustomDataType | undefined
  onChange: (block: FilterBlockData) => void
  onRemove: () => void
}

export function FilterBlock({
  block,
  mode,
  noteTypes,
  tags,
  filterableProperties,
  resolveCustomType,
  onChange,
  onRemove,
}: FilterBlockProps) {
  const updateCriterion = (next: FilterCriterion) => {
    onChange({
      ...block,
      criteria: block.criteria.map((criterion) => (criterion.id === next.id ? next : criterion)),
    })
  }

  const removeCriterion = (id: string) => {
    onChange({ ...block, criteria: block.criteria.filter((criterion) => criterion.id !== id) })
  }

  const addCriterion = (criterion: FilterCriterion) => {
    onChange({ ...block, criteria: [...block.criteria, criterion] })
  }

  return (
    <div className={styles.block}>
      <div className={styles.header}>
        <span className={styles.combinatorLabel}>
          {block.criteria.length > 1 ? (mode === 'and' ? 'All of' : 'Any of') : 'Match'}
        </span>
        <button
          type="button"
          className={styles.removeBlockButton}
          aria-label="Remove block"
          onClick={onRemove}
        >
          <Icon name="close" size={12} />
        </button>
      </div>
      <div className={styles.criteria}>
        {block.criteria.map((criterion) => (
          <CriterionRow
            key={criterion.id}
            criterion={criterion}
            noteTypes={noteTypes}
            tags={tags}
            onChange={updateCriterion}
            onRemove={() => removeCriterion(criterion.id)}
          />
        ))}
      </div>
      <AddCriterionControl
        filterableProperties={filterableProperties}
        resolveCustomType={resolveCustomType}
        onAdd={addCriterion}
      />
    </div>
  )
}
