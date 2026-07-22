import {
  useEffect,
  useImperativeHandle,
  useRef,
  type KeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
  type Ref,
} from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Icon } from '../../../components/Icon/Icon'
import { useDismissableMenu } from '../../../components/Menu/useDismissableMenu'
import { BlockActionsMenu, type BlockAction } from './BlockActionsMenu'
import { isTextEntryElement } from './blockInteractiveElements'
import styles from './SortableBlockWrapper.module.css'

export type BlockRangePosition = 'top' | 'middle' | 'bottom'

// A DOM attribute (rather than a class, which also carries drag/selection
// styling) marking the focusable wrapper element itself, so other code can
// tell "focus landed on a block wrapper" apart from "focus landed inside a
// block's own content" without depending on class names.
export const BLOCK_WRAPPER_ATTRIBUTE = 'data-block-wrapper'

export interface SortableBlockWrapperHandle {
  focus: () => void
}

interface SortableBlockWrapperProps {
  id: string
  actions: BlockAction[]
  children: ReactNode
  focusOnMount?: boolean
  onFocused?: () => void
  // Single-block keyboard selection (e.g. an image/code block navigated to
  // with the arrow keys) — draws an outside focus ring on the whole block.
  selected?: boolean
  // This block's position within an active multi-block range selection —
  // draws a contiguous highlighted band instead of the single-block ring.
  rangePosition?: BlockRangePosition | null
  // Fires for keydowns anywhere within this block — the wrapper itself, the
  // drag handle, a menu item, a toolbar button — so arrow-key/Backspace/
  // Delete block navigation keeps working no matter which of the block's own
  // controls currently has focus. The one exception is a genuine text-entry
  // descendant (an input/textarea/select, or a text block's own editor),
  // where arrow keys already have their own native meaning.
  onBlockKeyDown?: (event: KeyboardEvent<HTMLDivElement>) => void
  // Fired on the capture phase, before any native listener inside the block
  // (notably ProseMirror's own mousedown handler) sees the event — lets a
  // Shift+Click be preventDefault()-ed in time to stop a text caret from
  // being placed.
  onBlockMouseDown?: (event: ReactMouseEvent<HTMLDivElement>) => void
  // Fired as the pointer enters this block's content while a mouse button is
  // held down elsewhere — the signal used to grow a drag-selected range.
  onBlockMouseEnter?: (event: ReactMouseEvent<HTMLDivElement>) => void
  onBlockClick?: (event: ReactMouseEvent<HTMLDivElement>) => void
  ref?: Ref<SortableBlockWrapperHandle>
}

export function SortableBlockWrapper({
  id,
  actions,
  children,
  focusOnMount,
  onFocused,
  selected,
  rangePosition,
  onBlockKeyDown,
  onBlockMouseDown,
  onBlockMouseEnter,
  onBlockClick,
  ref,
}: SortableBlockWrapperProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
  })
  const {
    open: menuOpen,
    setOpen: setMenuOpen,
    containerRef,
  } = useDismissableMenu<HTMLDivElement>()
  const contentRef = useRef<HTMLDivElement>(null)
  const wrapperElRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!focusOnMount) return
    const proseMirror = contentRef.current?.querySelector<HTMLElement>('.ProseMirror')
    if (proseMirror) proseMirror.focus()
    else wrapperElRef.current?.focus()
    onFocused?.()
  }, [focusOnMount, onFocused])

  useImperativeHandle(ref, () => ({ focus: () => wrapperElRef.current?.focus() }), [])

  const classNames = [styles.block]
  if (isDragging) classNames.push(styles.dragging)
  if (selected) classNames.push(styles.selected)
  if (rangePosition === 'top') classNames.push(styles.rangeTop)
  if (rangePosition === 'middle') classNames.push(styles.rangeMiddle)
  if (rangePosition === 'bottom') classNames.push(styles.rangeBottom)

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={(node) => {
        setNodeRef(node)
        wrapperElRef.current = node
      }}
      style={style}
      className={classNames.join(' ')}
      role="option"
      aria-selected={selected || rangePosition != null}
      tabIndex={-1}
      data-block-wrapper="true"
      data-block-id={id}
      onKeyDown={(event) => {
        // Ignore keydowns from a focused text-entry descendant (typing inside
        // a text block's own editor, an image caption, a code textarea, a
        // table cell, etc.) — arrow keys there mean caret/selection movement,
        // not block navigation. Any other descendant (buttons, the drag
        // handle, menu items) still forwards up to block-level navigation.
        if (isTextEntryElement(event.target)) return
        onBlockKeyDown?.(event)
      }}
    >
      <div className={styles.chrome}>
        <div className={styles.gripContainer} ref={containerRef}>
          <button
            type="button"
            className={styles.gripButton}
            aria-label="Reorder block"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            {...attributes}
            {...listeners}
            onClick={() => setMenuOpen(!menuOpen)}
          >
            <Icon name="grip" />
          </button>
          {menuOpen && <BlockActionsMenu actions={actions} onClose={() => setMenuOpen(false)} />}
        </div>
      </div>
      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions --
          These are mouse-only affordances layered on the parent wrapper div above, which is already the
          keyboard-accessible interactive element (role="option", tabIndex, onKeyDown). */}
      <div
        className={styles.content}
        ref={contentRef}
        data-block-content="true"
        onMouseDownCapture={onBlockMouseDown}
        onMouseEnter={onBlockMouseEnter}
        onClick={onBlockClick}
      >
        {children}
      </div>
    </div>
  )
}
