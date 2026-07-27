import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../../db/db'
import { createOpfsMemoryDriver } from '../../lib/opfs/opfsMemoryDriver'
import { setOpfsDriverForTesting } from '../../lib/opfs/opfsDriver'
import {
  createNote,
  deleteNote,
  getNote,
  listNotesByNotebook,
  removeNoteProperty,
  renameNote,
  setNoteProperty,
  setNoteTags,
} from './noteRepository'
import { createNotebook } from '../notebooks/notebookRepository'
import { insertBlock, loadNoteBlocks } from '../blocks/noteBlocksStore'
import { createEmptyBlock } from '../blocks/noteBlocksFactory'
import { appendYDocUpdate, loadYDoc } from '../yjs/yjsDocStore'
import { createCustomDataType } from '../dataTypes/dataTypeRepository'
import { createNoteType } from '../noteTypes/noteTypeRepository'
import * as Y from 'yjs'
import type { DataTypeRef } from '../entities.types'

const textType: DataTypeRef = { kind: 'primitive', primitive: 'text' }

beforeEach(async () => {
  await db.notes.clear()
  await db.notebooks.clear()
  await db.yjsUpdates.clear()
  await db.customDataTypes.clear()
  await db.noteTypes.clear()
  setOpfsDriverForTesting(createOpfsMemoryDriver())
})

describe('noteRepository', () => {
  it('creates a note with default metadata and a fresh blockDocId', async () => {
    const notebook = await createNotebook({ folderId: null, title: 'Notebook' })
    const note = await createNote({ notebookId: notebook.id, title: 'My note' })

    expect(note.title).toBe('My note')
    expect(note.notebookId).toBe(notebook.id)
    expect(note.boardId).toBeNull()
    expect(note.noteTypeId).toBeNull()
    expect(note.metadata).toEqual({
      tags: [],
      createdAt: note.createdAt,
      updatedAt: note.updatedAt,
      properties: {},
    })
    expect(note.blockDocId).toBeTruthy()

    const stored = await getNote(note.id)
    expect(stored).toEqual(note)
  })

  it('lists notes scoped to a notebook', async () => {
    const notebookA = await createNotebook({ folderId: null, title: 'A' })
    const notebookB = await createNotebook({ folderId: null, title: 'B' })
    await createNote({ notebookId: notebookA.id, title: 'A1' })
    await createNote({ notebookId: notebookA.id, title: 'A2' })
    await createNote({ notebookId: notebookB.id, title: 'B1' })

    const notesInA = await listNotesByNotebook(notebookA.id)
    expect(notesInA.map((note) => note.title).sort()).toEqual(['A1', 'A2'])
  })

  it('renames a note and bumps updatedAt', async () => {
    const notebook = await createNotebook({ folderId: null, title: 'Notebook' })
    const note = await createNote({ notebookId: notebook.id, title: 'Old title' })

    await renameNote(note.id, 'New title')

    const updated = await getNote(note.id)
    expect(updated?.title).toBe('New title')
    expect(updated?.metadata.updatedAt).toBe(updated?.updatedAt)
  })

  it('deletes a note along with its yjsUpdates rows', async () => {
    const notebook = await createNotebook({ folderId: null, title: 'Notebook' })
    const note = await createNote({ notebookId: notebook.id, title: 'Note' })

    const doc = await loadYDoc(note.blockDocId)
    doc.getMap('meta').set('title', 'content')
    await appendYDocUpdate(note.blockDocId, doc, Y.encodeStateAsUpdate(doc))

    expect(await db.yjsUpdates.where('docId').equals(note.blockDocId).count()).toBeGreaterThan(0)

    await deleteNote(note.id)

    expect(await getNote(note.id)).toBeUndefined()
    expect(await db.yjsUpdates.where('docId').equals(note.blockDocId).count()).toBe(0)
  })

  it('deletes OPFS files referenced by image/embed blocks when a note is deleted', async () => {
    const notebook = await createNotebook({ folderId: null, title: 'Notebook' })
    const note = await createNote({ notebookId: notebook.id, title: 'Note' })

    const { doc } = await loadNoteBlocks(note.blockDocId)
    const driver = createOpfsMemoryDriver()
    setOpfsDriverForTesting(driver)
    await driver.writeFile('notes/n/asset.png', new Blob(['x']))

    const imageBlock = { ...createEmptyBlock('image'), opfsPath: 'notes/n/asset.png' }
    await insertBlock(note.blockDocId, doc, imageBlock, 0)

    expect(await driver.exists('notes/n/asset.png')).toBe(true)

    await deleteNote(note.id)

    expect(await driver.exists('notes/n/asset.png')).toBe(false)
  })

  it('pre-fills properties from a Note Type blueprint nesting a List of Tuples', async () => {
    const notebook = await createNotebook({ folderId: null, title: 'Notebook' })
    const customType = await createCustomDataType({
      name: 'Recipe',
      schema: {
        kind: 'dictionary',
        fields: [
          {
            key: 'steps',
            typeRef: {
              kind: 'list',
              itemType: { kind: 'tuple', itemTypes: [textType, { kind: 'primitive', primitive: 'number' }] },
            },
          },
        ],
      },
    })
    const noteType = await createNoteType({ name: 'Recipe', customTypeId: customType.id })

    const note = await createNote({ notebookId: notebook.id, title: 'Pancakes', noteTypeId: noteType.id })

    expect(note.noteTypeId).toBe(noteType.id)
    expect(note.metadata.properties).toEqual({
      steps: { typeRef: expect.objectContaining({ kind: 'list' }), value: [] },
    })
  })

  it('creates a blank note unaffected when no noteTypeId is given', async () => {
    const notebook = await createNotebook({ folderId: null, title: 'Notebook' })
    const note = await createNote({ notebookId: notebook.id, title: 'Blank' })
    expect(note.noteTypeId).toBeNull()
    expect(note.metadata.properties).toEqual({})
  })

  it('sets a valid typed property and rejects an invalid one without mutating state', async () => {
    const notebook = await createNotebook({ folderId: null, title: 'Notebook' })
    const note = await createNote({ notebookId: notebook.id, title: 'Note' })

    await setNoteProperty(note.id, 'priority', {
      typeRef: { kind: 'primitive', primitive: 'number' },
      value: 5,
    })
    const withProperty = await getNote(note.id)
    expect(withProperty?.metadata.properties.priority).toEqual({
      typeRef: { kind: 'primitive', primitive: 'number' },
      value: 5,
    })

    await expect(
      setNoteProperty(note.id, 'priority', {
        typeRef: { kind: 'primitive', primitive: 'number' },
        value: 'not a number' as never,
      }),
    ).rejects.toThrow()

    const unchanged = await getNote(note.id)
    expect(unchanged?.metadata.properties.priority.value).toBe(5)
  })

  it('adds an ad hoc property not derived from any blueprint with no validation error (acceptance scenario)', async () => {
    const notebook = await createNotebook({ folderId: null, title: 'Notebook' })
    const note = await createNote({ notebookId: notebook.id, title: 'Note' })

    await setNoteProperty(note.id, 'favoriteColor', {
      typeRef: { kind: 'primitive', primitive: 'color' },
      value: '#ff0000',
    })

    const updated = await getNote(note.id)
    expect(updated?.metadata.properties.favoriteColor.value).toBe('#ff0000')
  })

  it('removes a property', async () => {
    const notebook = await createNotebook({ folderId: null, title: 'Notebook' })
    const note = await createNote({ notebookId: notebook.id, title: 'Note' })
    await setNoteProperty(note.id, 'temp', { typeRef: textType, value: 'x' })

    await removeNoteProperty(note.id, 'temp')

    const updated = await getNote(note.id)
    expect(updated?.metadata.properties.temp).toBeUndefined()
  })

  it('sets tags, trimming and de-duplicating', async () => {
    const notebook = await createNotebook({ folderId: null, title: 'Notebook' })
    const note = await createNote({ notebookId: notebook.id, title: 'Note' })

    await setNoteTags(note.id, [' recipe ', 'recipe', 'dinner', ''])

    const updated = await getNote(note.id)
    expect(updated?.metadata.tags).toEqual(['recipe', 'dinner'])
  })
})
