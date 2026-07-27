import { useEffect, type ReactNode } from 'react'
import styles from './Modal.module.css'

interface ModalProps {
  open: boolean
  onClose: () => void
  labelledBy?: string
  children: ReactNode
}

export function Modal({ open, onClose, labelledBy, children }: ModalProps) {
  useEffect(() => {
    if (!open) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

  if (!open) return null

  return (
    <>
      <div className={styles.backdrop} onClick={onClose} aria-hidden="true" />
      <div className={styles.panel} role="dialog" aria-modal="true" aria-labelledby={labelledBy}>
        {children}
      </div>
    </>
  )
}
