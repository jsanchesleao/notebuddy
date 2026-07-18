import type { IconName } from '../../../components/Icon/Icon'
import type { NoteBlockType } from '../../../domain/blocks/blocks.types'

export interface BlockTypeCatalogEntry {
  type: NoteBlockType
  label: string
  icon: IconName
}

export const BLOCK_TYPE_CATALOG: BlockTypeCatalogEntry[] = [
  { type: 'text', label: 'Text', icon: 'text' },
  { type: 'image', label: 'Image', icon: 'image' },
  { type: 'sketch', label: 'Sketch', icon: 'sketch' },
  { type: 'code', label: 'Code', icon: 'code' },
  { type: 'table', label: 'Table', icon: 'table' },
  { type: 'embed', label: 'File', icon: 'embed' },
]
