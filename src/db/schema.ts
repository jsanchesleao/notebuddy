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

export const SCHEMA_V3 = {
  tags: 'name',
}

export const SCHEMA_V4 = {
  // statusTypeId is indexed so deleteCustomDataType can check whether any board still
  // references a given option-set CustomDataType before allowing its deletion.
  boards: 'id, folderId, statusTypeId',
}
