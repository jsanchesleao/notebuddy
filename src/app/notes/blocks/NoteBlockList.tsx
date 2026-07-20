import { useRef, useState, type KeyboardEvent } from 'react'
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import type { JSONContent } from '@tiptap/core'
import { useNoteBlocks } from '../useNoteBlocks'
import { createEmptyBlock } from '../../../domain/blocks/noteBlocksFactory'
import { createId } from '../../../domain/ids'
import type { NoteBlockType } from '../../../domain/blocks/blocks.types'
import { AddBlockMenu } from './AddBlockMenu'
import { SortableBlockWrapper, type SortableBlockWrapperHandle } from './SortableBlockWrapper'
import { TextBlock, type BlockEdge, type TextBlockHandle } from './TextBlock/TextBlock'
import { ImageBlock } from './ImageBlock/ImageBlock'
import { SketchBlock } from './SketchBlock/SketchBlock'
import { CodeBlock } from './CodeBlock/CodeBlock'
import { TableBlock } from './TableBlock/TableBlock'
import { EmbedBlock } from './EmbedBlock/EmbedBlock'
import { TrailingTextBlock } from './TrailingTextBlock'
import { computeMoveIndices } from './reorderBlocks'
import { useBlockSelection, getRangePosition } from './useBlockSelection'
import styles from './NoteBlockList.module.css'

interface NoteBlockListProps {
  noteId: string
  blockDocId: string
}

type Direction = 'backward' | 'forward'

const ARROW_DIRECTIONS: Record<string, Direction> = {
  ArrowUp: 'backward',
  ArrowLeft: 'backward',
  ArrowDown: 'forward',
  ArrowRight: 'forward',
}

export function NoteBlockList({ noteId, blockDocId }: NoteBlockListProps) {
  const {
    blocks,
    isLoading,
    insertBlock,
    updateBlock,
    deleteBlock,
    deleteBlocks,
    moveBlock,
    replaceBlock,
    appendBlock,
  } = useNoteBlocks(blockDocId)
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor),
  )
  const [phantomId, setPhantomId] = useState(() => createId())
  const [autoFocusTrailing, setAutoFocusTrailing] = useState(false)
  const [focusBlockId, setFocusBlockId] = useState<string | null>(null)
  const [autoOpenImageBlockId, setAutoOpenImageBlockId] = useState<string | null>(null)
  const selection = useBlockSelection(blocks)

  const textBlockHandles = useRef(new Map<string, TextBlockHandle>())
  const wrapperHandles = useRef(new Map<string, SortableBlockWrapperHandle>())
  const phantomRef = useRef<TextBlockHandle>(null)
  // Set by `onPromote` below when a just-promoted block should keep focus at
  // its end instead of losing it to the new trailing phantom. Consumed
  // imperatively from the block's own ref callback below (rather than a
  // state + effect pair) once it actually mounts as a real block.
  const pendingFocusEndIdRef = useRef<string | null>(null)

  if (isLoading) return null

  // Focuses/selects whatever is at `index` (a real block index, or
  // `blocks.length` for the always-present trailing phantom), arriving from
  // `direction` — i.e. landing at the end of a text block when arriving
  // "backward" (from below), or its start when arriving "forward".
  const landOn = (index: number, direction: Direction) => {
    if (index < 0 || index > blocks.length) return
    if (index === blocks.length) {
      phantomRef.current?.focusStart()
      return
    }
    const target = blocks[index]
    if (target.type === 'text') {
      const handle = textBlockHandles.current.get(target.id)
      if (direction === 'backward') handle?.focusEnd()
      else handle?.focusStart()
    } else {
      selection.selectBlock(target.id)
      wrapperHandles.current.get(target.id)?.focus()
    }
  }

  const moveFocus = (fromIndex: number, direction: Direction) => {
    selection.clear()
    landOn(direction === 'backward' ? fromIndex - 1 : fromIndex + 1, direction)
  }

  // After deleting the (contiguous) blocks at `deletedIndices` (indices from
  // before the deletion), focuses whatever now sits immediately before that
  // span — or, if the deletion started at the very top of the list, whatever
  // now sits right after it.
  const landAfterDeletion = (deletedIndices: number[]) => {
    const first = deletedIndices[0]
    const last = deletedIndices[deletedIndices.length - 1]
    if (first > 0) landOn(first - 1, 'backward')
    else landOn(last + 1, 'forward')
  }

  const handleShiftNavigate = (blockIndex: number, direction: Direction) => {
    const targetIndex = direction === 'backward' ? blockIndex - 1 : blockIndex + 1
    if (targetIndex < 0 || targetIndex >= blocks.length) return

    const currentId = blocks[blockIndex].id
    const targetId = blocks[targetIndex].id
    const anchorId = selection.range?.anchorId ?? currentId

    if (targetId === anchorId) {
      // Shrunk the range back down to just the anchor block: exit range mode
      // and return to normal single-block cursor/selection focus.
      selection.clear()
      landOn(targetIndex, direction)
      return
    }

    selection.extendTo(targetId, anchorId)
    wrapperHandles.current.get(targetId)?.focus()
  }

  const handleDeleteSelection = () => {
    if (selection.selectedIds.length === 0) return
    const indices = selection.selectedIds
      .map((id) => blocks.findIndex((block) => block.id === id))
      .filter((index) => index !== -1)
      .sort((a, b) => a - b)
    if (indices.length === 0) return

    if (indices.length === 1) deleteBlock(selection.selectedIds[0])
    else deleteBlocks(selection.selectedIds)
    selection.clear()
    landAfterDeletion(indices)
  }

  const handleEscapeFromText = (index: number, edge: BlockEdge, extend: boolean) => {
    const direction: Direction = edge === 'start' ? 'backward' : 'forward'
    if (extend) handleShiftNavigate(index, direction)
    else moveFocus(index, direction)
  }

  const handleBackspaceAtStart = (index: number, isEmpty: boolean, content: JSONContent) => {
    const block = blocks[index]
    if (isEmpty) {
      deleteBlock(block.id)
      landAfterDeletion([index])
      return
    }

    const prevIndex = index - 1
    if (prevIndex < 0) return
    const prevBlock = blocks[prevIndex]
    if (prevBlock.type === 'text') {
      textBlockHandles.current.get(prevBlock.id)?.appendContent(content)
      deleteBlock(block.id)
    } else {
      selection.selectBlock(prevBlock.id)
      wrapperHandles.current.get(prevBlock.id)?.focus()
    }
  }

  const handleDeleteAtEnd = (index: number) => {
    const nextIndex = index + 1
    if (nextIndex >= blocks.length) return // trailing phantom is always empty — nothing to merge

    const block = blocks[index]
    const nextBlock = blocks[nextIndex]
    if (nextBlock.type === 'text') {
      const nextContent = textBlockHandles.current.get(nextBlock.id)?.getContent()
      if (nextContent) textBlockHandles.current.get(block.id)?.appendContent(nextContent)
      deleteBlock(nextBlock.id)
    } else {
      selection.selectBlock(nextBlock.id)
      wrapperHandles.current.get(nextBlock.id)?.focus()
    }
  }

  const handleWrapperKeyDown = (index: number, event: KeyboardEvent<HTMLDivElement>) => {
    const noModifiers = !event.altKey && !event.metaKey && !event.ctrlKey
    if (!noModifiers) return

    if (event.key in ARROW_DIRECTIONS) {
      const direction = ARROW_DIRECTIONS[event.key]
      event.preventDefault()
      if (event.shiftKey) {
        handleShiftNavigate(index, direction)
        return
      }
      if (selection.isRange) {
        const edgeId =
          direction === 'backward'
            ? selection.selectedIds[0]
            : selection.selectedIds[selection.selectedIds.length - 1]
        const edgeIndex = blocks.findIndex((block) => block.id === edgeId)
        selection.clear()
        if (edgeIndex !== -1) moveFocus(edgeIndex, direction)
        return
      }
      moveFocus(index, direction)
      return
    }

    if (!event.shiftKey && (event.key === 'Backspace' || event.key === 'Delete')) {
      event.preventDefault()
      if (selection.selectedIds.length > 0) handleDeleteSelection()
    }
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const overId = event.over?.id
    if (overId === undefined) return

    const move = computeMoveIndices(blocks, String(event.active.id), String(overId))
    if (move) moveBlock(move.fromIndex, move.toIndex)
  }

  const handleConvertBlock = (blockId: string, index: number, type: NoteBlockType) => {
    const newBlock = createEmptyBlock(type)
    replaceBlock(blockId, newBlock)
    if (type === 'image') {
      setFocusBlockId(newBlock.id)
      setAutoOpenImageBlockId(newBlock.id)
    } else if (index === blocks.length - 1) {
      setAutoFocusTrailing(true)
    }
  }

  const handleInsertBlock = (type: NoteBlockType) => {
    const newBlock = createEmptyBlock(type)
    insertBlock(newBlock, blocks.length)
    if (type === 'image') {
      setFocusBlockId(newBlock.id)
      setAutoOpenImageBlockId(newBlock.id)
    }
  }

  const handleSplitBlock = (index: number) => {
    const newBlock = createEmptyBlock('text')
    insertBlock(newBlock, index + 1)
    setFocusBlockId(newBlock.id)
  }

  return (
    <div
      className={styles.noteBlockList}
      onFocusCapture={(event) => {
        // Only a block wrapper receiving focus directly means "this block is
        // keyboard-selected as a whole" — any other focus target (typing into
        // a text block, clicking a button inside a block, etc.) means the
        // user moved on with the mouse/Tab, so any stale selection is cleared.
        const target = event.target as HTMLElement
        if (!target.hasAttribute('data-block-wrapper')) selection.clear()
      }}
    >
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext
          items={blocks.map((block) => block.id)}
          strategy={verticalListSortingStrategy}
        >
          {blocks.map((block, index) => (
            <SortableBlockWrapper
              key={block.id}
              id={block.id}
              ref={(handle) => {
                if (handle) wrapperHandles.current.set(block.id, handle)
                else wrapperHandles.current.delete(block.id)
              }}
              actions={[
                {
                  key: 'delete',
                  label: 'Delete',
                  icon: 'delete',
                  onSelect: () => deleteBlock(block.id),
                  danger: true,
                },
              ]}
              focusOnMount={block.id === focusBlockId}
              onFocused={() => setFocusBlockId(null)}
              selected={selection.selectedIds.length === 1 && selection.selectedIds[0] === block.id}
              rangePosition={getRangePosition(selection.selectedIds, block.id)}
              onBlockKeyDown={(event) => handleWrapperKeyDown(index, event)}
            >
              {block.type === 'text' && (
                <TextBlock
                  ref={(handle) => {
                    if (handle) {
                      textBlockHandles.current.set(block.id, handle)
                      if (pendingFocusEndIdRef.current === block.id) {
                        handle.focusEnd()
                        pendingFocusEndIdRef.current = null
                      }
                    } else {
                      textBlockHandles.current.delete(block.id)
                    }
                  }}
                  block={block}
                  onUpdate={(patch) => updateBlock(block.id, patch)}
                  onConvert={(type) => handleConvertBlock(block.id, index, type)}
                  onSplit={() => handleSplitBlock(index)}
                  onEscape={(edge, extend) => handleEscapeFromText(index, edge, extend)}
                  onBackspaceAtStart={(isEmpty, content) =>
                    handleBackspaceAtStart(index, isEmpty, content)
                  }
                  onDeleteAtEnd={() => handleDeleteAtEnd(index)}
                />
              )}
              {block.type === 'image' && (
                <ImageBlock
                  block={block}
                  noteId={noteId}
                  onUpdate={(patch) => updateBlock(block.id, patch)}
                  autoOpenPicker={block.id === autoOpenImageBlockId}
                  onPickerOpened={() => setAutoOpenImageBlockId(null)}
                />
              )}
              {block.type === 'sketch' && (
                <SketchBlock block={block} onUpdate={(patch) => updateBlock(block.id, patch)} />
              )}
              {block.type === 'code' && (
                <CodeBlock block={block} onUpdate={(patch) => updateBlock(block.id, patch)} />
              )}
              {block.type === 'table' && (
                <TableBlock block={block} onUpdate={(patch) => updateBlock(block.id, patch)} />
              )}
              {block.type === 'embed' && (
                <EmbedBlock
                  block={block}
                  noteId={noteId}
                  onUpdate={(patch) => updateBlock(block.id, patch)}
                />
              )}
            </SortableBlockWrapper>
          ))}
        </SortableContext>
      </DndContext>
      <TrailingTextBlock
        key={phantomId}
        ref={phantomRef}
        blockId={phantomId}
        focusOnMount={autoFocusTrailing}
        onFocused={() => setAutoFocusTrailing(false)}
        onPromote={(newBlock, meta) => {
          appendBlock(newBlock)
          setPhantomId(createId())
          // If the debounce timer promoted this block while the user was
          // still actively typing in it (as opposed to Enter/Backspace/
          // Delete, which have their own deliberate "move on" semantics),
          // keep their cursor on the now-real block instead of yanking focus
          // to the new, unrelated empty phantom.
          if (meta?.isIdleFlush && phantomRef.current?.hasFocus()) {
            pendingFocusEndIdRef.current = newBlock.id
          } else {
            setAutoFocusTrailing(true)
          }
        }}
        onPromoteAsType={(type) => {
          const newBlock = { ...createEmptyBlock(type), id: phantomId }
          appendBlock(newBlock)
          setPhantomId(createId())
          if (type === 'image') {
            setFocusBlockId(newBlock.id)
            setAutoOpenImageBlockId(newBlock.id)
          } else {
            setAutoFocusTrailing(true)
          }
        }}
        onEscape={(edge) => {
          if (edge !== 'start') return
          moveFocus(blocks.length, 'backward')
        }}
        onBackspaceAtStart={(isEmpty, content) => {
          if (isEmpty) {
            moveFocus(blocks.length, 'backward')
            return
          }
          const prevIndex = blocks.length - 1
          if (prevIndex < 0) return
          const prevBlock = blocks[prevIndex]
          if (prevBlock.type === 'text') {
            textBlockHandles.current.get(prevBlock.id)?.appendContent(content)
            setPhantomId(createId())
          } else {
            selection.selectBlock(prevBlock.id)
            wrapperHandles.current.get(prevBlock.id)?.focus()
          }
        }}
      />
      <AddBlockMenu onInsert={handleInsertBlock} />
    </div>
  )
}
