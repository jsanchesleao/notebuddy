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

export type PropertyValue = unknown

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
