import { useState } from 'react'
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
import { useNoteBlocks } from '../useNoteBlocks'
import { createEmptyBlock } from '../../../domain/blocks/noteBlocksFactory'
import { createId } from '../../../domain/ids'
import type { NoteBlockType } from '../../../domain/blocks/blocks.types'
import { AddBlockMenu } from './AddBlockMenu'
import { SortableBlockWrapper } from './SortableBlockWrapper'
import { TextBlock } from './TextBlock/TextBlock'
import { ImageBlock } from './ImageBlock/ImageBlock'
import { SketchBlock } from './SketchBlock/SketchBlock'
import { CodeBlock } from './CodeBlock/CodeBlock'
import { TableBlock } from './TableBlock/TableBlock'
import { EmbedBlock } from './EmbedBlock/EmbedBlock'
import { TrailingTextBlock } from './TrailingTextBlock'
import { computeMoveIndices } from './reorderBlocks'
import styles from './NoteBlockList.module.css'

interface NoteBlockListProps {
  noteId: string
  blockDocId: string
}

export function NoteBlockList({ noteId, blockDocId }: NoteBlockListProps) {
  const {
    blocks,
    isLoading,
    insertBlock,
    updateBlock,
    deleteBlock,
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

  if (isLoading) return null

  const handleDragEnd = (event: DragEndEvent) => {
    const overId = event.over?.id
    if (overId === undefined) return

    const move = computeMoveIndices(blocks, String(event.active.id), String(overId))
    if (move) moveBlock(move.fromIndex, move.toIndex)
  }

  const handleConvertBlock = (blockId: string, index: number, type: NoteBlockType) => {
    replaceBlock(blockId, createEmptyBlock(type))
    if (index === blocks.length - 1) setAutoFocusTrailing(true)
  }

  const handleSplitBlock = (index: number) => {
    const newBlock = createEmptyBlock('text')
    insertBlock(newBlock, index + 1)
    setFocusBlockId(newBlock.id)
  }

  return (
    <div className={styles.noteBlockList}>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext
          items={blocks.map((block) => block.id)}
          strategy={verticalListSortingStrategy}
        >
          {blocks.map((block, index) => (
            <SortableBlockWrapper
              key={block.id}
              id={block.id}
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
            >
              {block.type === 'text' && (
                <TextBlock
                  block={block}
                  onUpdate={(patch) => updateBlock(block.id, patch)}
                  onConvert={(type) => handleConvertBlock(block.id, index, type)}
                  onSplit={() => handleSplitBlock(index)}
                />
              )}
              {block.type === 'image' && (
                <ImageBlock
                  block={block}
                  noteId={noteId}
                  onUpdate={(patch) => updateBlock(block.id, patch)}
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
        blockId={phantomId}
        focusOnMount={autoFocusTrailing}
        onFocused={() => setAutoFocusTrailing(false)}
        onPromote={(newBlock) => {
          appendBlock(newBlock)
          setPhantomId(createId())
          setAutoFocusTrailing(true)
        }}
        onPromoteAsType={(type) => {
          appendBlock({ ...createEmptyBlock(type), id: phantomId })
          setPhantomId(createId())
          setAutoFocusTrailing(true)
        }}
      />
      <AddBlockMenu
        onInsert={(type: NoteBlockType) => insertBlock(createEmptyBlock(type), blocks.length)}
      />
    </div>
  )
}
