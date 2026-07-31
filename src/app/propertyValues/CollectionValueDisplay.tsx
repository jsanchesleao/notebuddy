import type { CustomDataType, DataTypeRef, PropertyValueData } from '../../domain/entities.types'
import { PropertyValueDisplay } from './PropertyValueDisplay'
import { PillListEditor } from './PillListEditor'
import { resolvePillItemKind } from './resolvePillItemKind'
import styles from './compositeDisplay.module.css'

interface CollectionValueDisplayProps {
  itemType: DataTypeRef
  value: PropertyValueData[]
  // Forwarded from the owning property row only at the top of the display tree — see
  // PropertyValueDisplay's onChange doc. Absent for any nested collection (e.g. a List of
  // Lists), where items render as fully inert chips regardless of item kind.
  onChange?: (value: PropertyValueData[]) => void
  resolveCustomType: (id: string) => CustomDataType | undefined
  availableCustomTypes: CustomDataType[]
}

// Shared by both List and Set: their read-only rendering is identical (no maxSize-specific
// display behavior), unlike the editors which stay separate files to mirror their differing
// add-item constraints.
export function CollectionValueDisplay({
  itemType,
  value,
  onChange,
  resolveCustomType,
  availableCustomTypes,
}: CollectionValueDisplayProps) {
  if (value.length === 0) {
    return <span className={styles.notSet}>Not set</span>
  }

  if (onChange) {
    const pillKind = resolvePillItemKind(itemType, resolveCustomType)
    if (pillKind) {
      return <PillListEditor pillKind={pillKind} value={value} onChange={onChange} hideControls />
    }
  }

  return (
    <ul className={styles.chipRow}>
      {value.map((item, index) => (
        <li key={index} className={styles.chip}>
          <PropertyValueDisplay
            typeRef={itemType}
            value={item}
            resolveCustomType={resolveCustomType}
            availableCustomTypes={availableCustomTypes}
          />
        </li>
      ))}
    </ul>
  )
}
