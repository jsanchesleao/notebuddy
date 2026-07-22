import { useCallback, useEffect, useRef, useState, type RefObject } from 'react'

interface UseDismissableMenuResult<T extends HTMLElement> {
  open: boolean
  setOpen: (open: boolean) => void
  containerRef: RefObject<T | null>
}

export function useDismissableMenu<
  T extends HTMLElement = HTMLDivElement,
>(): UseDismissableMenuResult<T> {
  const [open, setOpenState] = useState(false)
  const containerRef = useRef<T>(null)
  // Tracks whether the menu's current closed state was caused by an Escape
  // press (as opposed to an outside click or the consumer closing it after
  // an item was selected) — only an Escape-driven close should be undone by
  // a later Escape.
  const dismissedByEscapeRef = useRef(false)

  const setOpen = useCallback((value: boolean) => {
    dismissedByEscapeRef.current = false
    setOpenState(value)
  }, [])

  useEffect(() => {
    if (!open) return

    const handlePointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    document.addEventListener('pointerdown', handlePointerDown, true)
    return () => document.removeEventListener('pointerdown', handlePointerDown, true)
  }, [open, setOpen])

  useEffect(() => {
    // Stays attached even while closed (unlike the pointerdown listener
    // above) so a dismissed menu can still catch the Escape that reopens it.
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      if (open) {
        dismissedByEscapeRef.current = true
        setOpenState(false)
      } else if (dismissedByEscapeRef.current) {
        dismissedByEscapeRef.current = false
        setOpenState(true)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open])

  return { open, setOpen, containerRef }
}
