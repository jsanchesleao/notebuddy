import { useState } from 'react'
import { createLocalStorageKey } from '../../lib/storage/localStorageKey'

const WIDE_MODE_VALUES = ['wide', 'normal'] as const
type WideModeValue = (typeof WIDE_MODE_VALUES)[number]

const wideModeStorage = createLocalStorageKey<WideModeValue>(
  'notebuddy:note-wide-mode',
  WIDE_MODE_VALUES,
)

export function useWideMode() {
  const [isWide, setIsWide] = useState(() => wideModeStorage.get('normal') === 'wide')

  const toggleWide = () => {
    const next = !isWide
    wideModeStorage.set(next ? 'wide' : 'normal')
    setIsWide(next)
  }

  return { isWide, toggleWide }
}
