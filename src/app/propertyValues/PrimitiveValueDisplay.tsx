import { Icon } from '../../components/Icon/Icon'
import type { PrimitiveKind, PropertyValueData, SelectOption } from '../../domain/entities.types'
import { formatDateDisplay, formatDateTimeDisplay, formatTimeDisplay } from './formatDateTimeDisplay'
import styles from './PrimitiveValueDisplay.module.css'

interface PrimitiveValueDisplayProps {
  primitive: PrimitiveKind
  value: PropertyValueData
  // Only meaningful for `select` — the declared option set, used to resolve the stored value
  // to its label (mirroring SelectValueEditor's active/stale resolution).
  options?: SelectOption[]
}

export function PrimitiveValueDisplay({ primitive, value, options }: PrimitiveValueDisplayProps) {
  switch (primitive) {
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
    case 'boolean': {
      const checked = value === true
      return (
        <Icon
          name={checked ? 'check' : 'close'}
          size={14}
          className={checked ? styles.booleanTrue : styles.booleanFalse}
        />
      )
    }
    case 'select': {
      const stored = typeof value === 'string' ? value : null
      const active = options?.find((option) => option.value === stored)
      if (!stored) return <span className={styles.notSet}>Not set</span>
      if (!active) return <span className={styles.notSet}>{stored} (unavailable)</span>
      return <span className={styles.value}>{active.label}</span>
    }
    case 'date': {
      if (typeof value !== 'string' || !value) return <span className={styles.notSet}>Not set</span>
      return <span className={styles.value}>{formatDateDisplay(value)}</span>
    }
    case 'time': {
      if (typeof value !== 'string' || !value) return <span className={styles.notSet}>Not set</span>
      return <span className={styles.value}>{formatTimeDisplay(value)}</span>
    }
    case 'datetime': {
      if (typeof value !== 'string' || !value) return <span className={styles.notSet}>Not set</span>
      return <span className={styles.value}>{formatDateTimeDisplay(value)}</span>
    }
    case 'color': {
      const hex = typeof value === 'string' ? value : ''
      if (!hex) return <span className={styles.notSet}>Not set</span>
      return (
        <span className={styles.colorValue}>
          <span className={styles.swatch} style={{ background: hex }} />
          {hex}
        </span>
      )
    }
  }
}
