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

function relativeLuminance([r, g, b]: [number, number, number]): number {
  const [rs, gs, bs] = [r, g, b].map((channel) => {
    const c = channel / 255
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  })
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs
}

// Picks a light or dark text color for any hex background by relative luminance, so a pill
// stays readable whether its fill came from the curated palette or a freely typed hex value.
export function getReadableTextColor(hex: string): string {
  const luminance = relativeLuminance(hexToRgb(hex))
  return luminance > 0.5 ? '#1a1a1a' : '#f5f5f5'
}
