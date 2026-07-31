import { useEffect, useRef, type RefObject } from 'react'

// Unlike useDismissableMenu, this hook owns no open/closed state of its own — the
// caller controls that by conditionally mounting the component that calls it, and
// onDismiss just asks the caller to close it (e.g. by clearing a piece of state one
// level up).
export function useDismissOnOutsideOrEscape<T extends HTMLElement = HTMLDivElement>(
  onDismiss: () => void,
  ignoreRef?: RefObject<HTMLElement | null>,
): RefObject<T | null> {
  const containerRef = useRef<T>(null)
  const onDismissRef = useRef(onDismiss)

  useEffect(() => {
    onDismissRef.current = onDismiss
  })

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node
      if (containerRef.current?.contains(target)) return
      // Lets a trigger button own its own re-click behavior deterministically instead
      // of racing this listener: without this, a pointerdown on the trigger would
      // dismiss via "outside click" before the trigger's own onClick runs.
      if (ignoreRef?.current?.contains(target)) return
      onDismissRef.current()
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      if (event.defaultPrevented) return
      // Capture phase + stopPropagation: the enclosing Drawer/Modal also closes on
      // Escape via its own document-level bubble-phase listener, so this must win
      // the race and stop the event before it gets there, or Escape would dismiss
      // both the form and the whole panel in one press.
      event.stopPropagation()
      onDismissRef.current()
    }

    document.addEventListener('pointerdown', handlePointerDown, true)
    document.addEventListener('keydown', handleKeyDown, true)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown, true)
      document.removeEventListener('keydown', handleKeyDown, true)
    }
  }, [ignoreRef])

  return containerRef
}
