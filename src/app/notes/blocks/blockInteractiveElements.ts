const INTERACTIVE_SELECTOR = 'button, input, select, textarea, a, svg, [contenteditable="true"]'

export function isInteractiveBlockDescendant(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false
  return target.closest(INTERACTIVE_SELECTOR) !== null
}
