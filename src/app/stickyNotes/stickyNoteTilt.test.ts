import { describe, expect, it } from 'vitest'
import { createId } from '../../domain/ids'
import { getStickyNoteTiltDeg } from './stickyNoteTilt'

describe('getStickyNoteTiltDeg', () => {
  it('is deterministic for a given id', () => {
    const id = createId()
    expect(getStickyNoteTiltDeg(id)).toBe(getStickyNoteTiltDeg(id))
  })

  it('stays within the [-5, 5] degree range', () => {
    for (let i = 0; i < 50; i++) {
      const deg = getStickyNoteTiltDeg(createId())
      expect(deg).toBeGreaterThanOrEqual(-5)
      expect(deg).toBeLessThanOrEqual(5)
    }
  })

  it('produces different values for different ids', () => {
    const degs = new Set(Array.from({ length: 20 }, () => getStickyNoteTiltDeg(createId())))
    expect(degs.size).toBeGreaterThan(1)
  })
})
