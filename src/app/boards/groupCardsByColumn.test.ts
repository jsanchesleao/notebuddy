import { describe, expect, it } from 'vitest'
import { groupCardsByColumn } from './groupCardsByColumn'
import { createId } from '../../domain/ids'
import type { BoardColumn, Note } from '../../domain/entities.types'

function makeNote(overrides: Partial<Note> = {}): Note {
  const now = new Date().toISOString()
  return {
    id: createId(),
    notebookId: null,
    boardId: 'board-1',
    noteTypeId: null,
    title: 'Card',
    metadata: { tags: [], createdAt: now, updatedAt: now, properties: {} },
    blockDocId: createId(),
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

function makeColumn(overrides: Partial<BoardColumn> = {}): BoardColumn {
  return { id: createId(), name: 'Todo', tag: 'todo', color: '#111', visible: true, ...overrides }
}

describe('groupCardsByColumn', () => {
  it('groups notes into columns following cardOrder position', () => {
    const todo = makeColumn({ name: 'Todo', tag: 'todo' })
    const done = makeColumn({ name: 'Done', tag: 'done' })
    const a = makeNote({ title: 'A' })
    const b = makeNote({ title: 'B' })
    const c = makeNote({ title: 'C' })

    const grouped = groupCardsByColumn(
      [todo, done],
      [
        { noteId: a.id, columnId: todo.id },
        { noteId: b.id, columnId: done.id },
        { noteId: c.id, columnId: todo.id },
      ],
      [a, b, c],
    )

    expect(grouped.get(todo.id)?.map((n) => n.id)).toEqual([a.id, c.id])
    expect(grouped.get(done.id)?.map((n) => n.id)).toEqual([b.id])
  })

  it('appends a note missing from cardOrder to the column matching its status value', () => {
    const todo = makeColumn({ name: 'Todo', tag: 'todo' })
    const done = makeColumn({ name: 'Done', tag: 'done' })
    const orphan = makeNote({
      title: 'Orphan',
      metadata: {
        tags: [],
        createdAt: '',
        updatedAt: '',
        properties: {
          status: { typeRef: { kind: 'customTypeRef', customTypeId: 'x' }, value: 'done' },
        },
      },
    })

    const grouped = groupCardsByColumn([todo, done], [], [orphan])

    expect(grouped.get(todo.id)).toEqual([])
    expect(grouped.get(done.id)?.map((n) => n.id)).toEqual([orphan.id])
  })

  it('drops a note whose status matches no column', () => {
    const todo = makeColumn({ name: 'Todo', tag: 'todo' })
    const noStatus = makeNote({ title: 'No status' })

    const grouped = groupCardsByColumn([todo], [], [noStatus])

    expect(grouped.get(todo.id)).toEqual([])
  })

  it('ignores a cardOrder entry whose note no longer exists', () => {
    const todo = makeColumn({ name: 'Todo', tag: 'todo' })
    const grouped = groupCardsByColumn([todo], [{ noteId: 'ghost', columnId: todo.id }], [])

    expect(grouped.get(todo.id)).toEqual([])
  })
})
