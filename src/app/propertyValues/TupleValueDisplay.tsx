import type { CustomDataType, DataTypeRef, PropertyValueData } from '../../domain/entities.types'
import { PropertyValueDisplay } from './PropertyValueDisplay'
import styles from './compositeDisplay.module.css'

interface TupleValueDisplayProps {
  itemTypes: DataTypeRef[]
  value: PropertyValueData[]
  resolveCustomType: (id: string) => CustomDataType | undefined
  availableCustomTypes: CustomDataType[]
}

export function TupleValueDisplay({
  itemTypes,
  value,
  resolveCustomType,
  availableCustomTypes,
}: TupleValueDisplayProps) {
  if (itemTypes.length === 0) {
    return <span className={styles.notSet}>Not set</span>
  }

  return (
    <span className={styles.tuple}>
      <span className={styles.tupleSeparator}>(</span>
      {itemTypes.map((itemType, index) => (
        <span key={index}>
          <PropertyValueDisplay
            typeRef={itemType}
            value={value[index] ?? null}
            resolveCustomType={resolveCustomType}
            availableCustomTypes={availableCustomTypes}
          />
          {index < itemTypes.length - 1 && <span className={styles.tupleSeparator}>, </span>}
        </span>
      ))}
      <span className={styles.tupleSeparator}>)</span>
    </span>
  )
}
