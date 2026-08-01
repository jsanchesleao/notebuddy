export const INDENT_STEP_PX = 16
export const LEAF_ICON_OFFSET_PX = 20

export function getRowPaddingLeft(depth: number): number {
  return depth * INDENT_STEP_PX
}

export function getLeafPaddingLeft(depth: number): number {
  return depth * INDENT_STEP_PX + LEAF_ICON_OFFSET_PX
}
