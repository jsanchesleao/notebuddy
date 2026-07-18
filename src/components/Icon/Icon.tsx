import {
  Folder,
  Book,
  StickyNote,
  LayoutGrid,
  Check,
  X,
  Pencil,
  Trash2,
  Sun,
  Moon,
  Monitor,
  Menu,
  Plus,
  ArrowLeft,
  ArrowUp,
} from 'lucide-react'

const ICONS = {
  folder: Folder,
  book: Book,
  note: StickyNote,
  board: LayoutGrid,
  check: Check,
  close: X,
  edit: Pencil,
  delete: Trash2,
  themeLight: Sun,
  themeDark: Moon,
  themeSystem: Monitor,
  menu: Menu,
  add: Plus,
  back: ArrowLeft,
  up: ArrowUp,
} as const

export type IconName = keyof typeof ICONS

interface IconProps {
  name: IconName
  size?: string | number
  className?: string
}

export function Icon({ name, size = '1em', className }: IconProps) {
  const Component = ICONS[name]
  return <Component size={size} className={className} aria-hidden="true" focusable="false" />
}
