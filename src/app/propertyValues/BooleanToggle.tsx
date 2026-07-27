import styles from './BooleanToggle.module.css'

interface BooleanToggleProps {
  value: boolean
  onChange: (value: boolean) => void
  disabled?: boolean
}

export function BooleanToggle({ value, onChange, disabled }: BooleanToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={value}
      className={`${styles.toggle} ${value ? styles.toggleOn : ''}`}
      onClick={() => onChange(!value)}
      disabled={disabled}
    >
      <span className={styles.knob} />
    </button>
  )
}
