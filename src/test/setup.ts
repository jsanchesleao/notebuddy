import '@testing-library/jest-dom/vitest'
import 'fake-indexeddb/auto'

// jsdom doesn't implement layout, so ProseMirror (used by the TipTap text block)
// crashes computing selection coordinates unless these are stubbed out.
const emptyClientRect: DOMRect = {
  bottom: 0,
  height: 0,
  left: 0,
  right: 0,
  top: 0,
  width: 0,
  x: 0,
  y: 0,
  toJSON: () => {},
}

Range.prototype.getBoundingClientRect = () => emptyClientRect
Range.prototype.getClientRects = () =>
  ({
    length: 0,
    item: () => null,
    [Symbol.iterator]: function* () {},
  }) as unknown as DOMRectList

if (!window.HTMLElement.prototype.scrollIntoView) {
  window.HTMLElement.prototype.scrollIntoView = () => {}
}
if (!document.elementFromPoint) {
  document.elementFromPoint = () => null
}

// jsdom doesn't implement the Pointer Capture APIs used by the sketch block's
// drawing surface.
if (!window.Element.prototype.setPointerCapture) {
  window.Element.prototype.setPointerCapture = () => {}
}
if (!window.Element.prototype.releasePointerCapture) {
  window.Element.prototype.releasePointerCapture = () => {}
}

// jsdom doesn't implement ResizeObserver, used by the code block to sync its
// wrapper's height with the textarea's native resize handle.
if (!window.ResizeObserver) {
  window.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver
}

if (!window.matchMedia) {
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }) as unknown as MediaQueryList
}
