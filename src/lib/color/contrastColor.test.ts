import { describe, expect, it } from 'vitest'
import { getReadableTextColor } from './contrastColor'
import { PILL_PALETTE } from '../../domain/tags/tagPalette'

const AA_CONTRAST_THRESHOLD = 4.5

function hexToRgb(hex: string): [number, number, number] {
  const normalized = hex.replace('#', '')
  const int = parseInt(normalized, 16)
  return [(int >> 16) & 255, (int >> 8) & 255, int & 255]
}

function relativeLuminance([r, g, b]: [number, number, number]): number {
  const [rs, gs, bs] = [r, g, b].map((channel) => {
    const c = channel / 255
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  })
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs
}

function contrastRatio(hexA: string, hexB: string): number {
  const l1 = relativeLuminance(hexToRgb(hexA))
  const l2 = relativeLuminance(hexToRgb(hexB))
  const lighter = Math.max(l1, l2)
  const darker = Math.min(l1, l2)
  return (lighter + 0.05) / (darker + 0.05)
}

describe('getReadableTextColor', () => {
  it('keeps the default near-black ink for a clearly light background', () => {
    expect(getReadableTextColor('#f5f5f5')).toBe('#1a1a1a')
  })

  it('keeps the default near-white ink for a clearly dark background', () => {
    expect(getReadableTextColor('#1a1a1a')).toBe('#f5f5f5')
  })

  it('guarantees WCAG AA contrast (4.5:1) for every PILL_PALETTE color', () => {
    for (const color of PILL_PALETTE) {
      const ink = getReadableTextColor(color)
      expect(contrastRatio(color, ink)).toBeGreaterThanOrEqual(AA_CONTRAST_THRESHOLD)
    }
  })

  it('guarantees WCAG AA contrast for a borderline mid-tone background', () => {
    const color = '#8d99ae'
    const ink = getReadableTextColor(color)
    expect(contrastRatio(color, ink)).toBeGreaterThanOrEqual(AA_CONTRAST_THRESHOLD)
  })

  it('guarantees WCAG AA contrast for an arbitrary user-typed hex value', () => {
    const color = '#9fa8b2'
    const ink = getReadableTextColor(color)
    expect(contrastRatio(color, ink)).toBeGreaterThanOrEqual(AA_CONTRAST_THRESHOLD)
  })
})
