import { createId } from '../ids'
import type { NoteBlock, NoteBlockType, TableCell } from './blocks.types'

function emptyTableRows(rowCount: number, columnCount: number): TableCell[][] {
  return Array.from({ length: rowCount }, () =>
    Array.from({ length: columnCount }, () => ({ value: '' })),
  )
}

export function createEmptyBlock(type: 'text'): Extract<NoteBlock, { type: 'text' }>
export function createEmptyBlock(type: 'image'): Extract<NoteBlock, { type: 'image' }>
export function createEmptyBlock(type: 'sketch'): Extract<NoteBlock, { type: 'sketch' }>
export function createEmptyBlock(type: 'code'): Extract<NoteBlock, { type: 'code' }>
export function createEmptyBlock(type: 'table'): Extract<NoteBlock, { type: 'table' }>
export function createEmptyBlock(type: 'embed'): Extract<NoteBlock, { type: 'embed' }>
export function createEmptyBlock(type: NoteBlockType): NoteBlock
export function createEmptyBlock(type: NoteBlockType): NoteBlock {
  const id = createId()

  switch (type) {
    case 'text':
      return { type, id, content: { type: 'doc', content: [{ type: 'paragraph' }] } }
    case 'image':
      return { type, id, opfsPath: '', align: 'left' }
    case 'sketch':
      return { type, id, strokes: [], width: 600, height: 400 }
    case 'code':
      return { type, id, language: 'plaintext', code: '' }
    case 'table':
      return { type, id, rows: emptyTableRows(2, 2) }
    case 'embed':
      return { type, id, opfsPath: '', mimeType: '' }
  }
}
