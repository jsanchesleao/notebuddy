import Dexie, { type Table } from 'dexie'
import { SCHEMA_V1, SCHEMA_V2, SCHEMA_V3, SCHEMA_V4 } from './schema'
import type {
  Board,
  CustomDataType,
  Folder,
  Note,
  NoteType,
  Notebook,
  Setting,
  TagRecord,
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
  tags!: Table<TagRecord, string>

  constructor(name = 'notebuddy') {
    super(name)
    this.version(1).stores(SCHEMA_V1)
    this.version(2).stores(SCHEMA_V2)
    this.version(3).stores(SCHEMA_V3)
    this.version(4).stores(SCHEMA_V4)
  }
}

export const db = new NotebuddyDB()
