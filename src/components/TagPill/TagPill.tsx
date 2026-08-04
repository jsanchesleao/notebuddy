import { getReadableTextColor } from '../../lib/color/contrastColor'
import styles from './TagPill.module.css'

interface TagPillProps {
  name: string
  color: string
}

export function TagPill({ name, color }: TagPillProps) {
  return (
    <span className={styles.pill} style={{ background: color, color: getReadableTextColor(color) }}>
      {name}
    </span>
  )
}
