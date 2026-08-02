// Picks a random color among the least-used ones in `palette`, based on how often each
// palette color appears in `usedColors`. Shared by tag colors (usage pool = every TagRecord)
// and board column colors (usage pool = just that board's own BoardColumn list).
export function pickLeastUsedColor(palette: string[], usedColors: string[]): string {
  const counts = new Map(palette.map((color) => [color, 0]))
  for (const color of usedColors) {
    if (counts.has(color)) {
      counts.set(color, (counts.get(color) ?? 0) + 1)
    }
  }

  const minCount = Math.min(...counts.values())
  const leastUsed = palette.filter((color) => counts.get(color) === minCount)
  return leastUsed[Math.floor(Math.random() * leastUsed.length)]
}
