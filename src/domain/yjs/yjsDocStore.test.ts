import { beforeEach, describe, expect, it } from 'vitest'
import * as Y from 'yjs'
import { createId } from '../ids'
import { db } from '../../db/db'
import { appendYDocUpdate, compactYDoc, createYDoc, loadYDoc } from './yjsDocStore'
import { COMPACTION_UPDATE_COUNT_THRESHOLD } from './yjsCompaction.constants'

beforeEach(async () => {
  await db.yjsUpdates.clear()
})

describe('yjsDocStore', () => {
  it('round-trips a mutation into a fresh Y.Doc', async () => {
    const { docId, doc } = createYDoc()
    doc.getMap('meta').set('title', 'Hello')

    await appendYDocUpdate(docId, doc, Y.encodeStateAsUpdate(doc))

    const reloaded = await loadYDoc(docId)
    expect(reloaded.getMap('meta').get('title')).toBe('Hello')
  })

  it('merges updates accumulated across separate load sessions ("reload the page")', async () => {
    const docId = createId()

    const doc1 = new Y.Doc()
    doc1.getMap('meta').set('title', 'First')
    await appendYDocUpdate(docId, doc1, Y.encodeStateAsUpdate(doc1))

    const doc2 = await loadYDoc(docId)
    expect(doc2.getMap('meta').get('title')).toBe('First')

    const stateBeforeSecondEdit = Y.encodeStateVector(doc2)
    doc2.getMap('meta').set('body', 'Second')
    const diff = Y.encodeStateAsUpdate(doc2, stateBeforeSecondEdit)
    await appendYDocUpdate(docId, doc2, diff)

    const doc3 = await loadYDoc(docId)
    expect(doc3.getMap('meta').get('title')).toBe('First')
    expect(doc3.getMap('meta').get('body')).toBe('Second')
  })

  it('compacts multiple rows into a single lossless snapshot row', async () => {
    const docId = createId()
    const doc = new Y.Doc()
    doc.getMap('meta').set('title', 'Compact me')
    await appendYDocUpdate(docId, doc, Y.encodeStateAsUpdate(doc))

    const stateVectorBeforeCompaction = Y.encodeStateVector(doc)
    await compactYDoc(docId, doc)

    const rowCount = await db.yjsUpdates.where('docId').equals(docId).count()
    expect(rowCount).toBe(1)

    const reloaded = await loadYDoc(docId)
    expect(reloaded.getMap('meta').get('title')).toBe('Compact me')
    expect(Y.encodeStateVector(reloaded)).toEqual(stateVectorBeforeCompaction)
  })

  it('auto-compacts once appended updates cross the count threshold', async () => {
    const docId = createId()
    const doc = new Y.Doc()
    const counter = doc.getMap('meta')

    for (let i = 0; i < COMPACTION_UPDATE_COUNT_THRESHOLD + 1; i++) {
      const before = Y.encodeStateVector(doc)
      counter.set('count', i)
      const update = Y.encodeStateAsUpdate(doc, before)
      await appendYDocUpdate(docId, doc, update)
    }

    const rowCount = await db.yjsUpdates.where('docId').equals(docId).count()
    expect(rowCount).toBe(1)

    const reloaded = await loadYDoc(docId)
    expect(reloaded.getMap('meta').get('count')).toBe(COMPACTION_UPDATE_COUNT_THRESHOLD)
  })
})
