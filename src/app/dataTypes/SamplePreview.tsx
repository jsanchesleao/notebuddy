import { createDefaultValue } from '../../domain/dataTypes/defaultValueGenerator'
import { PropertyValueEditor } from '../propertyValues/PropertyValueEditor'
import type { CustomDataType, DataTypeRef } from '../../domain/entities.types'
import styles from './SamplePreview.module.css'

interface SamplePreviewProps {
  schema: DataTypeRef
  resolveCustomType: (id: string) => CustomDataType | undefined
  availableCustomTypes: CustomDataType[]
}

export function SamplePreview({
  schema,
  resolveCustomType,
  availableCustomTypes,
}: SamplePreviewProps) {
  const sampleValue = createDefaultValue(schema, { resolveCustomType })

  return (
    <div className={styles.preview}>
      <PropertyValueEditor
        typeRef={schema}
        value={sampleValue}
        onChange={() => {}}
        disabled
        resolveCustomType={resolveCustomType}
        availableCustomTypes={availableCustomTypes}
      />
    </div>
  )
}
