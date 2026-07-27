import { useEffect, type ReactNode } from 'react'
import styles from './Drawer.module.css'

interface DrawerProps {
  open: boolean
  onClose: () => void
  labelledBy?: string
  children: ReactNode
}

// Slides in from the right without reflowing the page content it overlays
// (unlike the mobile Sidebar, which is the only other fixed-position overlay
// in the app but pushes nothing either — same positioning strategy, opposite edge).
export function Drawer({ open, onClose, labelledBy, children }: DrawerProps) {
  useEffect(() => {
    if (!open) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

  return (
    <>
      <div
        className={`${styles.backdrop} ${open ? styles.backdropOpen : ''}`}
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className={`${styles.panel} ${open ? styles.panelOpen : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        aria-hidden={!open}
      >
        {children}
      </div>
    </>
  )
}
