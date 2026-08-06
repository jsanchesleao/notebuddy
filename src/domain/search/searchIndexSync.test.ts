import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../../db/db'
import { createNote, deleteNote, renameNote, setNoteTags } from '../notes/noteRepository'
import { searchNotes } from './searchIndexStore'

// registerSearchIndexSync() is already called globally in src/test/setup.ts (mirroring
// main.tsx), so the Dexie hooks under test here are already active — this file verifies they
// actually patch the index on real repository writes, not just that the hook functions exist.
beforeEach(async () => {
  await db.notes.clear()
  await db.yjsUpdates.clear()
})

describe('searchIndexSync', () => {
  it('indexes a note as soon as it is created', async () => {
    const note = await createNote({ notebookId: null, title: 'Freshly created' })
    expect(await searchNotes('freshly')).toEqual([note.id])
  })

  it('reindexes a note when its title changes', async () => {
    const note = await createNote({ notebookId: null, title: 'Old title' })
    await renameNote(note.id, 'New title')

    expect(await searchNotes('old')).toEqual([])
    expect(await searchNotes('new')).toEqual([note.id])
  })

  it('reindexes a note when its tags change', async () => {
    const note = await createNote({ notebookId: null, title: 'Tag test' })
    await setNoteTags(note.id, ['urgent'])

    expect(await searchNotes('urgent')).toEqual([note.id])
  })

  it('removes a note from the index once it is deleted', async () => {
    const note = await createNote({ notebookId: null, title: 'Deletable note' })
    expect(await searchNotes('deletable')).toEqual([note.id])

    await deleteNote(note.id)

    expect(await searchNotes('deletable')).toEqual([])
  })
})
