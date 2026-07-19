import type { Editor } from '@tiptap/core'
import type { IconName } from '../../../../components/Icon/Icon'
import type { NoteBlockType } from '../../../../domain/blocks/blocks.types'
import { BLOCK_TYPE_CATALOG } from '../blockTypeCatalog'
import { TEXT_BLOCK_TYPE_OPTIONS } from './textBlockTypeOptions'

export type SlashCommandEntry =
  | { kind: 'blockType'; type: NoteBlockType; label: string; icon: IconName }
  | { kind: 'textFormat'; label: string; icon: IconName; apply: (editor: Editor) => void }

const BLOCK_TYPE_ENTRIES: SlashCommandEntry[] = BLOCK_TYPE_CATALOG.map(({ type, label, icon }) => ({
  kind: 'blockType',
  type,
  label,
  icon,
}))

const TEXT_FORMAT_ENTRIES: SlashCommandEntry[] = TEXT_BLOCK_TYPE_OPTIONS.map(
  ({ label, icon, apply }) => ({
    kind: 'textFormat',
    label,
    icon,
    apply,
  }),
)

export const SLASH_COMMAND_CATALOG: SlashCommandEntry[] = [
  ...BLOCK_TYPE_ENTRIES,
  ...TEXT_FORMAT_ENTRIES,
]

export function parseSlashQuery(text: string): string | null {
  const match = /^\/([^\s/]*)$/.exec(text)
  return match ? match[1] : null
}

export function filterSlashCommands(query: string): SlashCommandEntry[] {
  return SLASH_COMMAND_CATALOG.filter(({ label }) =>
    label.toLowerCase().startsWith(query.toLowerCase()),
  )
}
