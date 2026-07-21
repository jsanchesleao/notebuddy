import type { JSONContent } from '@tiptap/core'

export interface Stroke {
  points: [x: number, y: number, pressure: number][]
  color: string
  size: number
}

export interface TableCell {
  value: string
}

export type NoteBlock =
  | { type: 'text'; id: string; content: JSONContent }
  | {
      type: 'image'
      id: string
      opfsPath: string
      caption?: string
      width?: number
      align?: 'left' | 'center' | 'right'
    }
  | {
      type: 'sketch'
      id: string
      strokes: Stroke[]
      width: number
      height: number
      displayWidth?: number
      align?: 'left' | 'center' | 'right'
    }
  | { type: 'code'; id: string; language: string; code: string }
  | { type: 'table'; id: string; rows: TableCell[][] }
  | { type: 'embed'; id: string; opfsPath: string; mimeType: string; caption?: string }

export type NoteBlockType = NoteBlock['type']
