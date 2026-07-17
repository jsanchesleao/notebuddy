export const SCHEMA_V1 = {
  folders: 'id, parentFolderId',
  notebooks: 'id, folderId',
  boards: 'id, folderId',
  notes: 'id, notebookId, boardId',
  settings: 'key',
  yjsUpdates: '++id, docId',
}
