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
}

export type PrimitiveKind =
  | 'text'
  | 'date'
  | 'time'
  | 'datetime'
  | 'boolean'
  | 'number'
  | 'select'
  | 'link'
  | 'color'

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
  | string
  | number
  | boolean
  | null
  | PropertyValueData[]
  | { [key: string]: PropertyValueData }

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
  metadata: NoteMetadata
  blockDocId: string
  createdAt: string
  updatedAt: string
}

export interface Setting {
  key: string
  value: unknown
}

export interface YjsUpdateRow {
  id?: number
  docId: string
  update: Uint8Array
  createdAt: number
}
