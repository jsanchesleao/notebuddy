import type { ReactNode } from 'react'
import { useDismissableMenu } from './useDismissableMenu'
import styles from './DismissableDropdown.module.css'

interface DismissableDropdownProps {
  trigger: (state: { open: boolean; toggle: () => void }) => ReactNode
  children: (state: { close: () => void }) => ReactNode
  className?: string
  menuClassName?: string
}

// Generalizes the trigger/menu markup shared by BlockTypeSelect and every new
// picker in Phase 3 (schema kind, select options, note type) rather than
// re-wiring useDismissableMenu's container/menu markup at each call site.
export function DismissableDropdown({
  trigger,
  children,
  className,
  menuClassName,
}: DismissableDropdownProps) {
  const { open, setOpen, containerRef } = useDismissableMenu<HTMLDivElement>()

  return (
    <div className={`${styles.container} ${className ?? ''}`} ref={containerRef}>
      {trigger({ open, toggle: () => setOpen(!open) })}
      {open && (
        <div role="menu" className={`${styles.menu} ${menuClassName ?? ''}`}>
          {children({ close: () => setOpen(false) })}
        </div>
      )}
    </div>
  )
}
