import { useEffect, useRef, useState, type RefObject } from 'react'

interface UseDismissableMenuResult<T extends HTMLElement> {
  open: boolean
  setOpen: (open: boolean) => void
  containerRef: RefObject<T | null>
}

export function useDismissableMenu<
  T extends HTMLElement = HTMLDivElement,
>(): UseDismissableMenuResult<T> {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<T>(null)

  useEffect(() => {
    if (!open) return

    const handlePointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('pointerdown', handlePointerDown, true)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown, true)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  return { open, setOpen, containerRef }
}
