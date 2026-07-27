import { pad2 } from './dateMath'
import styles from './TimeColumns.module.css'

const HOURS = Array.from({ length: 24 }, (_, hour) => pad2(hour))
const MINUTES = ['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55']

interface TimeColumnsProps {
  hour: string | null
  minute: string | null
  onPickHour: (hour: string) => void
  onPickMinute: (minute: string) => void
}

export function TimeColumns({ hour, minute, onPickHour, onPickMinute }: TimeColumnsProps) {
  return (
    <div className={styles.columns}>
      <div className={styles.column} aria-label="Hour">
        {HOURS.map((option) => (
          <button
            key={option}
            type="button"
            className={styles.option}
            aria-pressed={option === hour}
            onClick={() => onPickHour(option)}
          >
            {option}
          </button>
        ))}
      </div>
      <div className={styles.column} aria-label="Minute">
        {MINUTES.map((option) => (
          <button
            key={option}
            type="button"
            className={styles.option}
            aria-pressed={option === minute}
            onClick={() => onPickMinute(option)}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  )
}
