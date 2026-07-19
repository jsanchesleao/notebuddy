import {
  useEffect,
  useImperativeHandle,
  useRef,
  type KeyboardEvent,
  type ReactNode,
  type Ref,
} from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Icon } from '../../../components/Icon/Icon'
import { useDismissableMenu } from '../../../components/Menu/useDismissableMenu'
import { BlockActionsMenu, type BlockAction } from './BlockActionsMenu'
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
  // Only fires for keydowns that land directly on the wrapper itself (i.e.
  // this block is keyboard-selected/focused as a whole), not ones bubbling
  // up from a focused descendant such as a text block's own editor.
  onBlockKeyDown?: (event: KeyboardEvent<HTMLDivElement>) => void
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
      onKeyDown={(event) => {
        // Ignore keydowns bubbling up from a focused descendant (e.g. typing
        // inside a text block's own editor) — only react when this wrapper
        // itself is the focused element.
        if (event.target !== event.currentTarget) return
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
      <div className={styles.content} ref={contentRef}>
        {children}
      </div>
    </div>
  )
}
