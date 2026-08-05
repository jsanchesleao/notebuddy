import { useImperativeHandle, type Ref } from 'react'
import { useStickyNotes } from './useStickyNotes'
import { StickyNoteLayer } from './StickyNoteLayer'
import { StickyNoteGallery } from './StickyNoteGallery'
import type { StickyNote } from '../../domain/entities.types'

export interface StickyNotesSectionHandle {
  addStickyNote: (kind: 'text' | 'sketch') => void
}

interface StickyNotesSectionProps {
  docId: string
  visible: boolean
  isMobile: boolean
  onCloseGallery: () => void
  ref?: Ref<StickyNotesSectionHandle>
}

// The single point where useStickyNotes(docId) is called, shared by NotePage/BoardPage/
// NotebookPage. Callers must remount this component (`key={docId}`) on doc change, same
// convention as NoteBlockList/useNoteBlocks — the hook doesn't reset state on a docId change
// itself. Exposes addStickyNote imperatively so a sibling EntityPageHeader (which isn't
// remounted per-entity, unlike this component) can trigger creation without lifting the
// docId-scoped hook state up to a shared ancestor.
export function StickyNotesSection({
  docId,
  visible,
  isMobile,
  onCloseGallery,
  ref,
}: StickyNotesSectionProps) {
  const {
    stickyNotes,
    addStickyNote,
    updateStickyNote,
    deleteStickyNote,
    moveStickyNote,
    bringStickyNoteToFront,
  } = useStickyNotes(docId)

  useImperativeHandle(ref, () => ({ addStickyNote: (kind) => void addStickyNote(kind) }), [
    addStickyNote,
  ])

  const handleChangeContent = (stickyNoteId: string, content: StickyNote['content']) =>
    updateStickyNote(stickyNoteId, { content })

  const handleChangeColor = (stickyNoteId: string, color: string) =>
    updateStickyNote(stickyNoteId, { color })

  if (isMobile) {
    return (
      <StickyNoteGallery
        open={visible}
        onClose={onCloseGallery}
        stickyNotes={stickyNotes}
        onChangeContent={handleChangeContent}
        onDelete={deleteStickyNote}
      />
    )
  }

  if (!visible) return null

  return (
    <StickyNoteLayer
      stickyNotes={stickyNotes}
      onChangeContent={handleChangeContent}
      onChangeColor={handleChangeColor}
      onDelete={deleteStickyNote}
      onMove={moveStickyNote}
      onBringToFront={bringStickyNoteToFront}
    />
  )
}
