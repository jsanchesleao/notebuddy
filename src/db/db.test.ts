import Dexie from 'dexie'
import { describe, expect, it } from 'vitest'
import { NotebuddyDB } from './db'
import { createId } from '../domain/ids'
import { SCHEMA_V1, SCHEMA_V2, SCHEMA_V3, SCHEMA_V4, SCHEMA_V5 } from './schema'

describe('NotebuddyDB schema', () => {
  it('declares all nine stores', () => {
    const db = new NotebuddyDB(`test-${createId()}`)
    const tableNames = db.tables.map((table) => table.name).sort()

    expect(tableNames).toEqual(
      [
        'boards',
        'customDataTypes',
        'folders',
        'noteTypes',
        'notebooks',
        'notes',
        'settings',
        'tags',
        'yjsUpdates',
      ].sort(),
    )
  })

  it('indexes yjsUpdates by docId with an auto-incrementing primary key', () => {
    const db = new NotebuddyDB(`test-${createId()}`)
    const table = db.yjsUpdates

    expect(table.schema.primKey.auto).toBe(true)
    expect(table.schema.indexes.map((index) => index.name)).toContain('docId')
  })
})

describe('NotebuddyDB v6 migration', () => {
  it('backfills stickyNotesDocId on notebooks that predate the field, without touching notebooks that already have one', async () => {
    const dbName = `test-${createId()}`

    const legacyDb = new Dexie(dbName)
    legacyDb.version(1).stores(SCHEMA_V1)
    legacyDb.version(2).stores(SCHEMA_V2)
    legacyDb.version(3).stores(SCHEMA_V3)
    legacyDb.version(4).stores(SCHEMA_V4)
    legacyDb.version(5).stores(SCHEMA_V5)
    await legacyDb.open()

    const legacyNotebookId = createId()
    const modernNotebookId = createId()
    await legacyDb.table('notebooks').add({
      id: legacyNotebookId,
      folderId: null,
      title: 'Legacy notebook',
      defaultNoteTypeId: null,
      encryption: null,
    })
    await legacyDb.table('notebooks').add({
      id: modernNotebookId,
      folderId: null,
      title: 'Modern notebook',
      defaultNoteTypeId: null,
      encryption: null,
      stickyNotesDocId: 'already-set',
    })
    legacyDb.close()

    const upgradedDb = new NotebuddyDB(dbName)
    await upgradedDb.open()

    const legacyNotebook = await upgradedDb.notebooks.get(legacyNotebookId)
    const modernNotebook = await upgradedDb.notebooks.get(modernNotebookId)

    expect(legacyNotebook?.stickyNotesDocId).toBeTruthy()
    expect(typeof legacyNotebook?.stickyNotesDocId).toBe('string')
    expect(modernNotebook?.stickyNotesDocId).toBe('already-set')
  })
})
