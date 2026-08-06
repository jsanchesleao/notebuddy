import type { JSONContent } from '@tiptap/core'
import type { NoteBlock } from '../blocks/blocks.types'

function extractJSONContentText(node: JSONContent): string {
  const ownText = node.text ?? ''
  const childText = node.content?.map(extractJSONContentText).join(' ') ?? ''
  return [ownText, childText].filter(Boolean).join(' ')
}

// Sketches carry no text content and are not full-text searchable in v1 (spec.md §6).
export function extractBlockText(block: NoteBlock): string {
  switch (block.type) {
    case 'text':
      return extractJSONContentText(block.content)
    case 'code':
      return block.code
    case 'table':
      return block.rows
        .flat()
        .map((cell) => cell.value)
        .join(' ')
    case 'image':
    case 'embed':
      return block.caption ?? ''
    case 'sketch':
      return ''
  }
}

export function extractBlocksText(blocks: NoteBlock[]): string {
  return blocks.map(extractBlockText).filter(Boolean).join(' ')
}
