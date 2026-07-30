import { describe, expect, it } from 'vitest'
import { clampMenuLeft } from './menuBoundary'

describe('clampMenuLeft', () => {
  it('keeps the natural left-aligned position when the menu already fits', () => {
    const left = clampMenuLeft(100, 160, { left: 0, right: 400 }, 8)
    expect(left).toBe(100)
  })

  it('pulls the menu left when it would overflow the right edge', () => {
    // A 160-wide menu opening at x=300 inside a 0-400 boundary would end at
    // 460, past the boundary — it should be pulled back to fit with an
    // 8px buffer from the right edge.
    const left = clampMenuLeft(300, 160, { left: 0, right: 400 }, 8)
    expect(left).toBe(400 - 8 - 160)
  })

  it('prefers flush-right over overflowing the left edge when the menu nearly fills the boundary', () => {
    // Regression case for the datetime picker in the Drawer: a 340px-wide
    // menu opening at x=300 inside a 352px boundary would, under a naive
    // right-align flip (right: 0), overflow past the left edge. Clamping
    // pulls it to the rightmost position that still fits, well clear of
    // the trigger's own naive x=300 starting point.
    const left = clampMenuLeft(300, 340, { left: 0, right: 352 }, 8)
    expect(left).toBe(352 - 8 - 340)
    expect(left).toBeLessThan(300)
  })

  it('holds the right edge at the buffer when the menu is wider than the whole boundary', () => {
    // When the menu can't fit no matter where it's placed, clamping keeps
    // its right edge from overflowing further rather than centering the
    // overflow — some left overflow is unavoidable here (the actual fix for
    // this case is DateTimeValueEditor shrinking the menu via stacking).
    const left = clampMenuLeft(0, 500, { left: 0, right: 352 }, 8)
    expect(left + 500).toBe(352 - 8)
  })
})
