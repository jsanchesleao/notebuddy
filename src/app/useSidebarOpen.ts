import { useState } from 'react'
import { createLocalStorageKey } from '../lib/storage/localStorageKey'
import { useIsMobile } from './useIsMobile'

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
  const isMobile = useIsMobile()
  const isDesktop = !isMobile
  const [breakpointDesktop, setBreakpointDesktop] = useState(isDesktop)
  const [open, setOpenState] = useState(() => readOpen(isDesktop))

  if (isDesktop !== breakpointDesktop) {
    setBreakpointDesktop(isDesktop)
    setOpenState(readOpen(isDesktop))
  }

  const setOpen = (value: boolean) => {
    storageFor(isDesktop).set(value ? 'open' : 'closed')
    setOpenState(value)
  }

  const toggle = () => setOpen(!open)

  return { open, toggle, setOpen }
}
