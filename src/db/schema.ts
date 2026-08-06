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

export const SCHEMA_V5 = {
  // defaultNoteTypeId is indexed so deleteNoteType can check whether any notebook still
  // references a given note type as its default before allowing its deletion.
  notebooks: 'id, folderId, defaultNoteTypeId',
}

// No index changes — this version only backfills `Notebook.stickyNotesDocId` (added to the
// type after notebooks already existed in persisted databases) via an .upgrade() in db.ts.
export const SCHEMA_V6 = {}

// One row per FlexSearch export() chunk, keyed by chunk name.
export const SCHEMA_V7 = {
  searchIndexSnapshot: 'key',
}

export const SCHEMA_V8 = {
  savedSearches: 'id, notebookId, boardId',
}
