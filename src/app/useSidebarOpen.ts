import { useEffect, useState } from 'react'
import { createLocalStorageKey } from '../lib/storage/localStorageKey'

type SidebarOpenValue = 'open' | 'closed'

const SIDEBAR_OPEN_VALUES: readonly SidebarOpenValue[] = ['open', 'closed']

const desktopStorage = createLocalStorageKey<SidebarOpenValue>(
  'notebuddy:sidebar-open-desktop',
  SIDEBAR_OPEN_VALUES,
)
const mobileStorage = createLocalStorageKey<SidebarOpenValue>(
  'notebuddy:sidebar-open-mobile',
  SIDEBAR_OPEN_VALUES,
)

const DESKTOP_MEDIA_QUERY = '(min-width: 768px)'

function isDesktopViewport(): boolean {
  return window.matchMedia(DESKTOP_MEDIA_QUERY).matches
}

function storageFor(isDesktop: boolean) {
  return isDesktop ? desktopStorage : mobileStorage
}

function readOpen(isDesktop: boolean): boolean {
  return storageFor(isDesktop).get(isDesktop ? 'open' : 'closed') === 'open'
}

interface SidebarOpenState {
  open: boolean
  toggle: () => void
  setOpen: (value: boolean) => void
}

export function useSidebarOpen(): SidebarOpenState {
  const [isDesktop, setIsDesktop] = useState(isDesktopViewport)
  const [open, setOpenState] = useState(() => readOpen(isDesktop))

  useEffect(() => {
    const mediaQuery = window.matchMedia(DESKTOP_MEDIA_QUERY)
    const handleChange = (event: MediaQueryListEvent) => {
      setIsDesktop(event.matches)
      setOpenState(readOpen(event.matches))
    }
    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  const setOpen = (value: boolean) => {
    storageFor(isDesktop).set(value ? 'open' : 'closed')
    setOpenState(value)
  }

  const toggle = () => setOpen(!open)

  return { open, toggle, setOpen }
}
