const AA_CONTRAST_THRESHOLD = 4.5
const MAX_NUDGE_STEPS = 20

function hexToRgb(hex: string): [number, number, number] {
  const normalized = hex.replace('#', '')
  const full =
    normalized.length === 3
      ? normalized
          .split('')
          .map((channel) => channel + channel)
          .join('')
      : normalized
  const int = parseInt(full, 16)
  return [(int >> 16) & 255, (int >> 8) & 255, int & 255]
}

function rgbToHex([r, g, b]: [number, number, number]): string {
  return (
    '#' + [r, g, b].map((channel) => Math.round(channel).toString(16).padStart(2, '0')).join('')
  )
}

function relativeLuminance([r, g, b]: [number, number, number]): number {
  const [rs, gs, bs] = [r, g, b].map((channel) => {
    const c = channel / 255
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  })
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs
}

// WCAG 2.x contrast ratio between two relative luminances, order-independent.
function contrastRatio(l1: number, l2: number): number {
  const lighter = Math.max(l1, l2)
  const darker = Math.min(l1, l2)
  return (lighter + 0.05) / (darker + 0.05)
}

// Mixes `from` toward `toward` (pure black or white) in small steps until the result contrasts
// with `bgRgb` at or above the AA threshold. Pure black/white is always sufficient (worst-case
// background luminance still clears ~4.58:1 against either extreme), so this always converges
// within MAX_NUDGE_STEPS.
function nudgeTowardContrast(
  from: [number, number, number],
  toward: [number, number, number],
  bgLuminance: number,
): [number, number, number] {
  let candidate = from
  for (let step = 1; step <= MAX_NUDGE_STEPS; step += 1) {
    if (contrastRatio(bgLuminance, relativeLuminance(candidate)) >= AA_CONTRAST_THRESHOLD) {
      return candidate
    }
    const t = step / MAX_NUDGE_STEPS
    candidate = [
      from[0] + (toward[0] - from[0]) * t,
      from[1] + (toward[1] - from[1]) * t,
      from[2] + (toward[2] - from[2]) * t,
    ]
  }
  return toward
}

// Picks a light or dark text color for any hex background, guaranteeing a real WCAG AA (4.5:1)
// contrast ratio rather than assuming one from a luminance split — so a pill or sticky note stays
// readable whether its fill came from the curated palette or a freely typed hex value. Colors
// that already meet the threshold with the default near-black/near-white ink render unchanged;
// only borderline backgrounds get nudged toward pure black/white.
export function getReadableTextColor(hex: string): string {
  const bgRgb = hexToRgb(hex)
  const bgLuminance = relativeLuminance(bgRgb)

  const darkInk: [number, number, number] = [26, 26, 26] // #1a1a1a
  const lightInk: [number, number, number] = [245, 245, 245] // #f5f5f5
  const darkContrast = contrastRatio(bgLuminance, relativeLuminance(darkInk))
  const lightContrast = contrastRatio(bgLuminance, relativeLuminance(lightInk))

  if (darkContrast >= lightContrast) {
    if (darkContrast >= AA_CONTRAST_THRESHOLD) return rgbToHex(darkInk)
    return rgbToHex(nudgeTowardContrast(darkInk, [0, 0, 0], bgLuminance))
  }

  if (lightContrast >= AA_CONTRAST_THRESHOLD) return rgbToHex(lightInk)
  return rgbToHex(nudgeTowardContrast(lightInk, [255, 255, 255], bgLuminance))
}
