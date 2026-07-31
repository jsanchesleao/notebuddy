export interface Folder {
  id: string
  parentFolderId: string | null
  title: string
}

export interface Notebook {
  id: string
  folderId: string | null
  title: string
  defaultNoteTypeId: string | null
  encryption: { enabled: boolean; salt?: string } | null
  // Y.Doc id holding this notebook's sticky notes canvas. Notebooks otherwise stay
  // content-free — this doc never holds anything but sticky notes.
  stickyNotesDocId: string
}

export interface BoardColumn {
  id: string
  name: string
  tag: string
  color: string
  visible: boolean
}

export interface Board {
  id: string
  folderId: string | null
  title: string
  columns: BoardColumn[]
  // Y.Doc id holding card ordering + this board's sticky notes canvas, mirrors Note.blockDocId.
  cardsDocId: string
  // Permanent link to the CustomDataType (a "select" option-set schema) backing this
  // board's columns — see optionSets.ts. Each BoardColumn.id matches a SelectOption.id from
  // this type; renaming/retagging a column edits that option, not just the column.
  statusTypeId: string | null
}

export type PrimitiveKind =
  'text' | 'date' | 'time' | 'datetime' | 'boolean' | 'number' | 'select' | 'link' | 'color'

export interface SelectOption {
  id: string
  label: string
  value: string
}

// Recursive schema shape — used both by CustomDataType.schema and by ad hoc note properties
export type DataTypeRef =
  | { kind: 'primitive'; primitive: PrimitiveKind; options?: SelectOption[] }
  | { kind: 'list'; itemType: DataTypeRef; maxSize?: number }
  | { kind: 'set'; itemType: DataTypeRef }
  | { kind: 'tuple'; itemTypes: DataTypeRef[] }
  | { kind: 'dictionary'; fields: DictionaryField[] }
  | { kind: 'customTypeRef'; customTypeId: string }

export interface DictionaryField {
  key: string
  typeRef: DataTypeRef
}

export interface CustomDataType {
  id: string
  name: string
  schema: DataTypeRef
  createdAt: string
  updatedAt: string
}

export interface NoteType {
  id: string
  name: string
  customTypeId: string
  createdAt: string
  updatedAt: string
}

export type PropertyValueData =
  string | number | boolean | null | PropertyValueData[] | { [key: string]: PropertyValueData }

export interface PropertyValue {
  typeRef: DataTypeRef
  value: PropertyValueData
}

export interface NoteMetadata {
  tags: string[]
  createdAt: string
  updatedAt: string
  properties: Record<string, PropertyValue>
}

export interface Note {
  id: string
  notebookId: string | null
  boardId: string | null
  noteTypeId: string | null
  title: string
  // Board-card fields — only meaningful when boardId is set, but not enforced as such
  // (a note removed from a board keeps whatever it had, same as any other stale field).
  description?: string
  cardImagePath?: string
  metadata: NoteMetadata
  blockDocId: string
  createdAt: string
  updatedAt: string
}

export interface Setting {
  key: string
  value: unknown
}

// A global registry of note tag colors, keyed by the tag's literal (case-sensitive) text —
// shared across every note so the same tag name always renders with the same color anywhere
// in the app. Entries are never pruned when a tag falls out of use, so a color is remembered
// even if the tag is removed from every note and later reused.
export interface TagRecord {
  name: string
  color: string
  createdAt: string
}

export interface YjsUpdateRow {
  id?: number
  docId: string
  update: Uint8Array
  createdAt: number
}
