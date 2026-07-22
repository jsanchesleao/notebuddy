import { useEffect, useState } from 'react'

const MOBILE_MEDIA_QUERY = '(max-width: 767px)'

function isMobileViewport(): boolean {
  return window.matchMedia(MOBILE_MEDIA_QUERY).matches
}

export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(isMobileViewport)

  useEffect(() => {
    const mediaQuery = window.matchMedia(MOBILE_MEDIA_QUERY)
    const handleChange = (event: MediaQueryListEvent) => setIsMobile(event.matches)
    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  return isMobile
}
