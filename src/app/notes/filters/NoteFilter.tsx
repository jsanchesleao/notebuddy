import { useLiveQuery } from 'dexie-react-hooks'
import { listNoteTypes } from '../../../domain/noteTypes/noteTypeRepository'
import { listTags } from '../../../domain/tags/tagRepository'
import { listCustomDataTypes } from '../../../domain/dataTypes/dataTypeRepository'
import { collectFilterableProperties } from '../../../domain/notes/noteFilterMatch'
import { createId } from '../../../domain/ids'
import { Icon } from '../../../components/Icon/Icon'
import { DismissableDropdown } from '../../../components/Menu/DismissableDropdown'
import { FilterBlock } from './FilterBlock'
import type {
  FilterBlock as FilterBlockData,
  FilterState,
} from '../../../domain/notes/noteFilter.types'
import type { Note } from '../../../domain/entities.types'
import styles from './NoteFilter.module.css'

export interface NoteFilterProps {
  notes: Note[]
  value: FilterState
  onChange: (next: FilterState) => void
}

export function NoteFilter({ notes, value, onChange }: NoteFilterProps) {
  const noteTypes = useLiveQuery(() => listNoteTypes(), [], [])
  const tags = useLiveQuery(() => listTags(), [], [])
  const customTypes = useLiveQuery(() => listCustomDataTypes(), [], [])
  const resolveCustomType = (id: string) => customTypes?.find((type) => type.id === id)
  const filterableProperties = collectFilterableProperties(notes, resolveCustomType)

  const activeCriteriaCount = value.blocks.reduce(
    (count, block) => count + block.criteria.length,
    0,
  )

  const updateBlock = (next: FilterBlockData) => {
    onChange({
      ...value,
      blocks: value.blocks.map((block) => (block.id === next.id ? next : block)),
    })
  }

  const removeBlock = (id: string) => {
    onChange({ ...value, blocks: value.blocks.filter((block) => block.id !== id) })
  }

  const addBlock = () => {
    onChange({ ...value, blocks: [...value.blocks, { id: createId(), criteria: [] }] })
  }

  return (
    <DismissableDropdown
      className={styles.container}
      menuClassName={styles.panel}
      trigger={({ toggle, open }) => (
        <button type="button" className={styles.toggle} aria-expanded={open} onClick={toggle}>
          <Icon name="filter" size={14} /> Filter
          {activeCriteriaCount > 0 && <span className={styles.badge}>{activeCriteriaCount}</span>}
        </button>
      )}
    >
      {() => (
        <>
          <div className={styles.modeToggle} role="group" aria-label="Filter mode">
            <button
              type="button"
              className={styles.modeButton}
              aria-pressed={value.mode === 'and'}
              onClick={() => onChange({ ...value, mode: 'and' })}
            >
              AND
            </button>
            <button
              type="button"
              className={styles.modeButton}
              aria-pressed={value.mode === 'or'}
              onClick={() => onChange({ ...value, mode: 'or' })}
            >
              OR
            </button>
          </div>
          <p className={styles.modeHint}>
            {value.mode === 'and'
              ? 'Every condition in a group must match; a note matches if any group matches.'
              : 'Any condition in a group can match; a note must match every group.'}
          </p>
          {value.blocks.map((block) => (
            <FilterBlock
              key={block.id}
              block={block}
              mode={value.mode}
              noteTypes={noteTypes ?? []}
              tags={tags ?? []}
              filterableProperties={filterableProperties}
              resolveCustomType={resolveCustomType}
              onChange={updateBlock}
              onRemove={() => removeBlock(block.id)}
            />
          ))}
          <button type="button" className={styles.addBlockButton} onClick={addBlock}>
            <Icon name="add" size={14} /> Add block
          </button>
        </>
      )}
    </DismissableDropdown>
  )
}
