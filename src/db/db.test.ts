import { describe, expect, it } from 'vitest'
import { NotebuddyDB } from './db'
import { createId } from '../domain/ids'

describe('NotebuddyDB schema', () => {
  it('declares all six stores', () => {
    const db = new NotebuddyDB(`test-${createId()}`)
    const tableNames = db.tables.map((table) => table.name).sort()

    expect(tableNames).toEqual(
      ['boards', 'folders', 'notebooks', 'notes', 'settings', 'yjsUpdates'].sort(),
    )
  })

  it('indexes yjsUpdates by docId with an auto-incrementing primary key', () => {
    const db = new NotebuddyDB(`test-${createId()}`)
    const table = db.yjsUpdates

    expect(table.schema.primKey.auto).toBe(true)
    expect(table.schema.indexes.map((index) => index.name)).toContain('docId')
  })
})
