export const SCHEMA_V1 = {
  folders: 'id, parentFolderId',
  notebooks: 'id, folderId',
  boards: 'id, folderId',
  notes: 'id, notebookId, boardId',
  settings: 'key',
  yjsUpdates: '++id, docId',
}

export const SCHEMA_V2 = {
  notes: 'id, notebookId, boardId, noteTypeId',
  customDataTypes: 'id, name',
  noteTypes: 'id, customTypeId',
}
