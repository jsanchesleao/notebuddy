import { useTheme } from './useTheme'
import { THEME_MODES, type ThemeMode } from './theme.types'
import styles from './ThemeToggle.module.css'

const LABELS: Record<ThemeMode, string> = {
  light: 'Light',
  dark: 'Dark',
  system: 'Match system',
}

const ICONS: Record<ThemeMode, string> = {
  light: '☀',
  dark: '☾',
  system: '🖥',
}

export function ThemeToggle() {
  const { mode, setMode } = useTheme()

  return (
    <div className={styles.group} role="radiogroup" aria-label="Theme">
      {THEME_MODES.map((option) => {
        const isActive = option === mode
        return (
          <button
            key={option}
            type="button"
            role="radio"
            aria-checked={isActive}
            aria-label={LABELS[option]}
            title={LABELS[option]}
            className={isActive ? styles.optionActive : styles.option}
            onClick={() => setMode(option)}
          >
            {ICONS[option]}
          </button>
        )
      })}
    </div>
  )
}
