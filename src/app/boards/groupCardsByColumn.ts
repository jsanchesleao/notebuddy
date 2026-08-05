import type { BoardColumn, Note } from '../../domain/entities.types'

// A card's column is always derived from its own `status` property value (matched against
// `column.tag`) — `cardOrder` never stores column membership, only relative ordering, so there's
// nothing here that can drift out of sync with a note's status however it was last edited (drag
// and drop, the properties drawer, column-delete reassignment, ...). Notes are placed in
// `cardOrder` order first; any note not yet in `cardOrder` (e.g. just created, or synced from
// elsewhere while this board's own doc instance hasn't observed the append yet) is appended
// after, in its own array order.
export function groupCardsByColumn(
  columns: BoardColumn[],
  cardOrder: string[],
  notes: Note[],
): Map<string, Note[]> {
  const noteById = new Map(notes.map((note) => [note.id, note]))
  const columnByTag = new Map(columns.map((column) => [column.tag, column]))
  const result = new Map<string, Note[]>(columns.map((column) => [column.id, []]))
  const seen = new Set<string>()

  const placeNote = (note: Note) => {
    const statusValue = note.metadata.properties.status?.value
    const column = typeof statusValue === 'string' ? columnByTag.get(statusValue) : undefined
    if (!column) return
    result.get(column.id)?.push(note)
  }

  for (const noteId of cardOrder) {
    const note = noteById.get(noteId)
    if (!note) continue
    seen.add(noteId)
    placeNote(note)
  }

  for (const note of notes) {
    if (seen.has(note.id)) continue
    placeNote(note)
  }

  return result
}
