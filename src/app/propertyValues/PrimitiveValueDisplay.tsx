import type { PropertyValueData } from '../../domain/entities.types'
import type { SimplePrimitiveKind } from './resolveSimplePrimitiveKind'
import styles from './PrimitiveValueDisplay.module.css'

interface PrimitiveValueDisplayProps {
  kind: SimplePrimitiveKind
  value: PropertyValueData
}

export function PrimitiveValueDisplay({ kind, value }: PrimitiveValueDisplayProps) {
  switch (kind) {
    case 'text': {
      const text = typeof value === 'string' ? value : ''
      if (!text) return <span className={styles.notSet}>Not set</span>
      return <span className={styles.value}>{text}</span>
    }
    case 'number': {
      if (typeof value !== 'number') return <span className={styles.notSet}>Not set</span>
      return <span className={styles.value}>{value}</span>
    }
    case 'link': {
      const url = typeof value === 'string' ? value : ''
      if (!url) return <span className={styles.notSet}>Not set</span>
      return (
        <a className={styles.link} href={url} target="_blank" rel="noopener noreferrer">
          {url}
        </a>
      )
    }
  }
}
