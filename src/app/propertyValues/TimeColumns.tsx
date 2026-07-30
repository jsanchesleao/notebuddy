import { useLayoutEffect, useRef, type KeyboardEvent, type RefObject } from 'react'
import { pad2 } from './dateMath'
import styles from './TimeColumns.module.css'

const HOURS = Array.from({ length: 24 }, (_, hour) => pad2(hour))
const MINUTES = ['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55']

interface TimeColumnsProps {
  hour: string | null
  minute: string | null
  onPickHour: (hour: string, commit: boolean) => void
  onPickMinute: (minute: string, commit: boolean) => void
}

interface TimeColumnProps {
  label: string
  options: string[]
  selected: string | null
  onPick: (value: string, commit: boolean) => void
  onEdgeNavigate?: (direction: 'left' | 'right') => void
  containerRef: RefObject<HTMLDivElement | null>
  autoFocusOnMount?: boolean
}

function TimeColumn({
  label,
  options,
  selected,
  onPick,
  onEdgeNavigate,
  containerRef,
  autoFocusOnMount = false,
}: TimeColumnProps) {
  const hasMountedRef = useRef(false)

  // This component only mounts while the dropdown is open, so centering the
  // current value here on mount is equivalent to centering it on open —
  // without it the wheel would start scrolled to the top every time. Moving
  // focus here too (not just scroll) keeps DOM focus tracking the selected
  // option across arrow-key navigation, so repeated arrow presses keep
  // landing on the "current" button. On mount, only the column flagged
  // autoFocusOnMount claims focus — both columns mount simultaneously, and
  // both wanting focus on mount would just make whichever renders last win.
  useLayoutEffect(() => {
    const list = containerRef.current
    if (!list) return
    const target = selected
      ? list.querySelector<HTMLButtonElement>(`[data-value="${selected}"]`)
      : list.firstElementChild
    target?.scrollIntoView({ block: 'center' })
    if (hasMountedRef.current || autoFocusOnMount) {
      ;(target as HTMLElement | null)?.focus()
    }
    hasMountedRef.current = true
  }, [selected, containerRef, autoFocusOnMount])

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>, option: string) {
    const index = options.indexOf(option)
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      const next = options[Math.min(index + 1, options.length - 1)]
      if (next !== option) onPick(next, false)
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      const prev = options[Math.max(index - 1, 0)]
      if (prev !== option) onPick(prev, false)
    } else if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
      if (onEdgeNavigate) {
        event.preventDefault()
        onEdgeNavigate(event.key === 'ArrowRight' ? 'right' : 'left')
      }
    }
  }

  return (
    <div className={styles.wheel}>
      <div className={styles.highlight} aria-hidden="true" />
      <div className={styles.column} aria-label={label} ref={containerRef}>
        {options.map((option) => (
          <button
            key={option}
            type="button"
            data-value={option}
            className={styles.option}
            aria-pressed={option === selected}
            onClick={() => onPick(option, true)}
            onKeyDown={(event) => handleKeyDown(event, option)}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  )
}

export function TimeColumns({ hour, minute, onPickHour, onPickMinute }: TimeColumnsProps) {
  const hourContainerRef = useRef<HTMLDivElement>(null)
  const minuteContainerRef = useRef<HTMLDivElement>(null)

  function focusColumn(containerRef: RefObject<HTMLDivElement | null>, value: string | null) {
    const list = containerRef.current
    if (!list) return
    const target = value
      ? list.querySelector<HTMLButtonElement>(`[data-value="${value}"]`)
      : list.firstElementChild
    ;(target as HTMLElement | null)?.focus()
  }

  return (
    <div className={styles.columns}>
      <TimeColumn
        label="Hour"
        options={HOURS}
        selected={hour}
        onPick={onPickHour}
        onEdgeNavigate={(direction) => {
          if (direction === 'right') focusColumn(minuteContainerRef, minute)
        }}
        containerRef={hourContainerRef}
        autoFocusOnMount
      />
      <TimeColumn
        label="Minute"
        options={MINUTES}
        selected={minute}
        onPick={onPickMinute}
        onEdgeNavigate={(direction) => {
          if (direction === 'left') focusColumn(hourContainerRef, hour)
        }}
        containerRef={minuteContainerRef}
      />
    </div>
  )
}
