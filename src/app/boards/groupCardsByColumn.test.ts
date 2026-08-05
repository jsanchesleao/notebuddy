import { describe, expect, it } from 'vitest'
import { groupCardsByColumn } from './groupCardsByColumn'
import { createId } from '../../domain/ids'
import type { BoardColumn, Note } from '../../domain/entities.types'

function makeNote(overrides: Partial<Note> = {}, statusValue?: string): Note {
  const now = new Date().toISOString()
  return {
    id: createId(),
    notebookId: null,
    boardId: 'board-1',
    noteTypeId: null,
    title: 'Card',
    metadata: {
      tags: [],
      createdAt: now,
      updatedAt: now,
      properties: statusValue
        ? { status: { typeRef: { kind: 'customTypeRef', customTypeId: 'x' }, value: statusValue } }
        : {},
    },
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
  it('groups notes into their status-matching column, ordered by cardOrder', () => {
    const todo = makeColumn({ name: 'Todo', tag: 'todo' })
    const done = makeColumn({ name: 'Done', tag: 'done' })
    const a = makeNote({ title: 'A' }, 'todo')
    const b = makeNote({ title: 'B' }, 'done')
    const c = makeNote({ title: 'C' }, 'todo')

    const grouped = groupCardsByColumn([todo, done], [a.id, c.id, b.id], [a, b, c])

    expect(grouped.get(todo.id)?.map((n) => n.id)).toEqual([a.id, c.id])
    expect(grouped.get(done.id)?.map((n) => n.id)).toEqual([b.id])
  })

  it('appends a note missing from cardOrder to the column matching its status value', () => {
    const todo = makeColumn({ name: 'Todo', tag: 'todo' })
    const done = makeColumn({ name: 'Done', tag: 'done' })
    const orphan = makeNote({ title: 'Orphan' }, 'done')

    const grouped = groupCardsByColumn([todo, done], [], [orphan])

    expect(grouped.get(todo.id)).toEqual([])
    expect(grouped.get(done.id)?.map((n) => n.id)).toEqual([orphan.id])
  })

  it("reflects a note's current status even when cardOrder hasn't changed", () => {
    const todo = makeColumn({ name: 'Todo', tag: 'todo' })
    const done = makeColumn({ name: 'Done', tag: 'done' })
    const note = makeNote({ title: 'Moved' }, 'done')

    // cardOrder still lists the note — status alone determines its column now.
    const grouped = groupCardsByColumn([todo, done], [note.id], [note])

    expect(grouped.get(todo.id)).toEqual([])
    expect(grouped.get(done.id)?.map((n) => n.id)).toEqual([note.id])
  })

  it('drops a note whose status matches no column', () => {
    const todo = makeColumn({ name: 'Todo', tag: 'todo' })
    const noStatus = makeNote({ title: 'No status' })

    const grouped = groupCardsByColumn([todo], [], [noStatus])

    expect(grouped.get(todo.id)).toEqual([])
  })

  it('ignores a cardOrder entry whose note no longer exists', () => {
    const todo = makeColumn({ name: 'Todo', tag: 'todo' })
    const grouped = groupCardsByColumn([todo], ['ghost'], [])

    expect(grouped.get(todo.id)).toEqual([])
  })
})
