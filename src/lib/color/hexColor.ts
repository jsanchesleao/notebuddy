export const HEX_COLOR_REGEX = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/

export function isHexColor(value: string): boolean {
  return HEX_COLOR_REGEX.test(value)
}
