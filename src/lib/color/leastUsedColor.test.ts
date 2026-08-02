import { describe, expect, it } from 'vitest'
import { pickLeastUsedColor } from './leastUsedColor'

describe('pickLeastUsedColor', () => {
  it('picks the only unused color when the rest are used', () => {
    const palette = ['#a', '#b', '#c']
    const result = pickLeastUsedColor(palette, ['#a', '#a', '#b'])
    expect(result).toBe('#c')
  })

  it('picks the least-used color among ties', () => {
    const palette = ['#a', '#b', '#c']
    const result = pickLeastUsedColor(palette, ['#a', '#a'])
    expect(['#b', '#c']).toContain(result)
  })

  it('spreads picks evenly across an unused palette', () => {
    const palette = ['#a', '#b', '#c']
    const picks = new Set<string>()
    for (let i = 0; i < 20; i++) {
      picks.add(pickLeastUsedColor(palette, []))
    }
    expect(picks.size).toBeGreaterThan(1)
  })

  it('ignores colors outside the palette when counting usage', () => {
    const palette = ['#a', '#b']
    const result = pickLeastUsedColor(palette, ['#unrelated', '#unrelated', '#a'])
    expect(result).toBe('#b')
  })
})
