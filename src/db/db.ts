import Dexie, { type Table } from 'dexie'
import { SCHEMA_V1, SCHEMA_V2 } from './schema'
import type {
  Board,
  CustomDataType,
  Folder,
  Note,
  NoteType,
  Notebook,
  Setting,
  YjsUpdateRow,
} from '../domain/entities.types'

export class NotebuddyDB extends Dexie {
  folders!: Table<Folder, string>
  notebooks!: Table<Notebook, string>
  boards!: Table<Board, string>
  notes!: Table<Note, string>
  settings!: Table<Setting, string>
  yjsUpdates!: Table<YjsUpdateRow, number>
  customDataTypes!: Table<CustomDataType, string>
  noteTypes!: Table<NoteType, string>

  constructor(name = 'notebuddy') {
    super(name)
    this.version(1).stores(SCHEMA_V1)
    this.version(2).stores(SCHEMA_V2)
  }
}

export const db = new NotebuddyDB()
