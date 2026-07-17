import Dexie, { type Table } from 'dexie'
import { SCHEMA_V1 } from './schema'
import type { Board, Folder, Note, Notebook, Setting, YjsUpdateRow } from '../domain/entities.types'

export class NotebuddyDB extends Dexie {
  folders!: Table<Folder, string>
  notebooks!: Table<Notebook, string>
  boards!: Table<Board, string>
  notes!: Table<Note, string>
  settings!: Table<Setting, string>
  yjsUpdates!: Table<YjsUpdateRow, number>

  constructor(name = 'notebuddy') {
    super(name)
    this.version(1).stores(SCHEMA_V1)
  }
}

export const db = new NotebuddyDB()
