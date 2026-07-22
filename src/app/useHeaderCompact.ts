import { useEffect, useState, type RefObject } from 'react'

const COMPACT_SCROLL_THRESHOLD = 24

export function useHeaderCompact(
  mainRef: RefObject<HTMLElement | null>,
  enabled: boolean,
): boolean {
  const [compact, setCompact] = useState(false)

  useEffect(() => {
    const main = mainRef.current
    if (!enabled || !main) return

    let frame: number | null = null
    const checkScroll = () => {
      if (frame !== null) return
      frame = requestAnimationFrame(() => {
        frame = null
        setCompact(main.scrollTop > COMPACT_SCROLL_THRESHOLD)
      })
    }

    checkScroll()
    main.addEventListener('scroll', checkScroll, { passive: true })
    return () => {
      main.removeEventListener('scroll', checkScroll)
      if (frame !== null) cancelAnimationFrame(frame)
    }
  }, [mainRef, enabled])

  return enabled && compact
}
