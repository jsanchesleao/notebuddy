const INTERACTIVE_SELECTOR = 'button, input, select, textarea, a, svg, [contenteditable="true"]'

export function isInteractiveBlockDescendant(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false
  return target.closest(INTERACTIVE_SELECTOR) !== null
}

const TEXT_ENTRY_SELECTOR = 'input, textarea, select, [contenteditable="true"]'

export function isTextEntryElement(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false
  return target.closest(TEXT_ENTRY_SELECTOR) !== null
}
