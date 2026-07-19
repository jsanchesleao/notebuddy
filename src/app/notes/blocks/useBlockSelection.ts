import { useCallback, useMemo, useState } from 'react'
import type { NoteBlock } from '../../../domain/blocks/blocks.types'
import type { BlockRangePosition } from './SortableBlockWrapper'

export interface BlockRange {
  anchorId: string
  focusId: string
}

export interface UseBlockSelectionResult {
  range: BlockRange | null
  // Ordered ids currently covered by the range (anchor..focus inclusive, in
  // document order), or `[]` when nothing is selected.
  selectedIds: string[]
  isRange: boolean
  selectBlock: (id: string) => void
  // Grows/shrinks the range so its focus edge becomes `id`. `anchorFallback`
  // is used as the anchor only when there's no active range yet (i.e. this
  // call is what starts the range) — an already-active range keeps its
  // existing anchor regardless of what's passed here.
  extendTo: (id: string, anchorFallback: string) => void
  clear: () => void
}

export function useBlockSelection(blocks: NoteBlock[]): UseBlockSelectionResult {
  const [range, setRange] = useState<BlockRange | null>(null)

  const selectedIds = useMemo(() => {
    if (!range) return []
    const anchorIndex = blocks.findIndex((block) => block.id === range.anchorId)
    const focusIndex = blocks.findIndex((block) => block.id === range.focusId)
    if (anchorIndex === -1 || focusIndex === -1) return []

    const [start, end] =
      anchorIndex <= focusIndex ? [anchorIndex, focusIndex] : [focusIndex, anchorIndex]
    return blocks.slice(start, end + 1).map((block) => block.id)
  }, [blocks, range])

  const selectBlock = useCallback((id: string) => {
    setRange({ anchorId: id, focusId: id })
  }, [])

  const extendTo = useCallback((id: string, anchorFallback: string) => {
    setRange((current) => ({ anchorId: current?.anchorId ?? anchorFallback, focusId: id }))
  }, [])

  const clear = useCallback(() => setRange(null), [])

  return { range, selectedIds, isRange: selectedIds.length > 1, selectBlock, extendTo, clear }
}

export function getRangePosition(
  selectedIds: string[],
  blockId: string,
): BlockRangePosition | null {
  if (selectedIds.length < 2) return null
  const index = selectedIds.indexOf(blockId)
  if (index === -1) return null
  if (index === 0) return 'top'
  if (index === selectedIds.length - 1) return 'bottom'
  return 'middle'
}
