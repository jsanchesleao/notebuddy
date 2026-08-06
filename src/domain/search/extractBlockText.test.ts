import { describe, expect, it } from 'vitest'
import { extractBlockText, extractBlocksText } from './extractBlockText'
import type { NoteBlock } from '../blocks/blocks.types'

describe('extractBlockText', () => {
  it('text: concatenates text nodes recursively from the TipTap document', () => {
    const block: NoteBlock = {
      type: 'text',
      id: 'b1',
      content: {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              { type: 'text', text: 'Hello ' },
              { type: 'text', text: 'world' },
            ],
          },
          {
            type: 'paragraph',
            content: [{ type: 'text', text: 'Second line' }],
          },
        ],
      },
    }
    expect(extractBlockText(block)).toBe('Hello  world Second line')
  })

  it('text: returns empty string for a block with no text nodes', () => {
    const block: NoteBlock = { type: 'text', id: 'b1', content: { type: 'doc', content: [] } }
    expect(extractBlockText(block)).toBe('')
  })

  it('code: returns the raw code string', () => {
    const block: NoteBlock = { type: 'code', id: 'b1', language: 'ts', code: 'const x = 1' }
    expect(extractBlockText(block)).toBe('const x = 1')
  })

  it('table: joins every cell value across rows', () => {
    const block: NoteBlock = {
      type: 'table',
      id: 'b1',
      rows: [
        [{ value: 'a' }, { value: 'b' }],
        [{ value: 'c' }, { value: 'd' }],
      ],
    }
    expect(extractBlockText(block)).toBe('a b c d')
  })

  it('image: returns the caption, or empty string if unset', () => {
    const withCaption: NoteBlock = {
      type: 'image',
      id: 'b1',
      opfsPath: 'x',
      caption: 'A photo',
    }
    const withoutCaption: NoteBlock = { type: 'image', id: 'b2', opfsPath: 'x' }
    expect(extractBlockText(withCaption)).toBe('A photo')
    expect(extractBlockText(withoutCaption)).toBe('')
  })

  it('embed: returns the caption, or empty string if unset', () => {
    const withCaption: NoteBlock = {
      type: 'embed',
      id: 'b1',
      opfsPath: 'x',
      mimeType: 'application/pdf',
      caption: 'A document',
    }
    expect(extractBlockText(withCaption)).toBe('A document')
  })

  it('sketch: is never searchable, always returns empty string', () => {
    const block: NoteBlock = { type: 'sketch', id: 'b1', strokes: [], width: 10, height: 10 }
    expect(extractBlockText(block)).toBe('')
  })
})

describe('extractBlocksText', () => {
  it('joins non-empty block text across a mixed set of blocks, skipping empty ones', () => {
    const blocks: NoteBlock[] = [
      { type: 'code', id: 'b1', language: 'ts', code: 'first' },
      { type: 'sketch', id: 'b2', strokes: [], width: 10, height: 10 },
      { type: 'code', id: 'b3', language: 'ts', code: 'second' },
    ]
    expect(extractBlocksText(blocks)).toBe('first second')
  })

  it('returns an empty string for an empty block list', () => {
    expect(extractBlocksText([])).toBe('')
  })
})
