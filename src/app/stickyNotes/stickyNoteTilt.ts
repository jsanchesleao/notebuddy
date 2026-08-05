// A small deterministic (non-cryptographic) hash so each note's tilt is derived purely from its
// id — stable across rerenders/reloads without a new StickyNote field or store/schema change,
// since a note's id never changes for its lifetime.
const TILT_MAX_DEG = 5

export function getStickyNoteTiltDeg(stickyNoteId: string): number {
  let hash = 0
  for (let i = 0; i < stickyNoteId.length; i++) {
    hash = (hash * 31 + stickyNoteId.charCodeAt(i)) | 0
  }
  const unit = (hash >>> 0) / 0xffffffff // [0, 1)
  return unit * (2 * TILT_MAX_DEG) - TILT_MAX_DEG // [-TILT_MAX_DEG, TILT_MAX_DEG]
}
