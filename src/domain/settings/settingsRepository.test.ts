import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../../db/db'
import { getSetting, setSetting } from './settingsRepository'

beforeEach(async () => {
  await db.settings.clear()
})

describe('settingsRepository', () => {
  it('returns the fallback when a key is absent', async () => {
    expect(await getSetting('missing-key', 'fallback')).toBe('fallback')
  })

  it('round-trips a stored value', async () => {
    await setSetting('view-density', 'compact')
    expect(await getSetting('view-density', 'comfortable')).toBe('compact')
  })

  it('overwrites a previously stored value', async () => {
    await setSetting('view-density', 'compact')
    await setSetting('view-density', 'spacious')
    expect(await getSetting('view-density', 'comfortable')).toBe('spacious')
  })
})
