import { useEffect, useState } from 'react'

const DESKTOP_MEDIA_QUERY = '(min-width: 1024px)'

function isDesktopViewport(): boolean {
  return window.matchMedia(DESKTOP_MEDIA_QUERY).matches
}

export function useIsDesktop(): boolean {
  const [isDesktop, setIsDesktop] = useState(isDesktopViewport)

  useEffect(() => {
    const mediaQuery = window.matchMedia(DESKTOP_MEDIA_QUERY)
    const handleChange = (event: MediaQueryListEvent) => setIsDesktop(event.matches)
    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  return isDesktop
}
