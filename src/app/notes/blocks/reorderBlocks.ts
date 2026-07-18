import type { NoteBlock } from '../../../domain/blocks/blocks.types'

export interface MoveIndices {
  fromIndex: number
  toIndex: number
}

export function computeMoveIndices(
  blocks: NoteBlock[],
  activeId: string,
  overId: string,
): MoveIndices | null {
  if (activeId === overId) return null

  const fromIndex = blocks.findIndex((block) => block.id === activeId)
  const toIndex = blocks.findIndex((block) => block.id === overId)

  if (fromIndex === -1 || toIndex === -1) return null

  return { fromIndex, toIndex }
}
