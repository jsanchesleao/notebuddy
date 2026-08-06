import { db } from '../../db/db'
import type { Note } from '../entities.types'
import { indexNote, removeNoteFromIndex } from './searchIndexStore'

let registered = false

// Registered once at app init (see main.tsx). Every note-mutating repository function in
// noteRepository.ts goes through db.notes.add/update/delete, so a single Dexie hook here keeps
// the search index in sync without threading index calls through each write path individually.
export function registerSearchIndexSync(): void {
  if (registered) return
  registered = true

  db.notes.hook('creating', (_primaryKey, note) => {
    indexNote(note as Note)
  })

  // `modifications` may use Dexie's dot-path notation (e.g. { 'metadata.tags': [...] }) rather
  // than a deep-mergeable object, so a plain spread over the pre-update `note` would miss nested
  // changes. `onsuccess` gives back the actual post-update record instead of reconstructing it.
  db.notes.hook('updating', function () {
    this.onsuccess = (updatedNote: Note) => {
      indexNote(updatedNote)
    }
  })

  db.notes.hook('deleting', (_primaryKey, note) => {
    removeNoteFromIndex((note as Note).id)
  })
}
