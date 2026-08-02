import type { BoardColumn, Note } from '../../domain/entities.types'
import type { CardOrderEntry } from '../../domain/boards/boardCardsStore'

// Groups `notes` into their board columns using `cardOrder` for both membership and
// within-column position. A note that isn't in `cardOrder` yet — e.g. just created via a
// separate doc-loading call elsewhere (createNote) while this board is already mounted, so
// this board's own live Y.Doc instance never observed that append — is appended to the end
// of whichever column matches its own `status` property value, purely so it's visible right
// away; the next full board load reconciles proper cardOrder-driven position.
export function groupCardsByColumn(
  columns: BoardColumn[],
  cardOrder: CardOrderEntry[],
  notes: Note[],
): Map<string, Note[]> {
  const noteById = new Map(notes.map((note) => [note.id, note]))
  const seen = new Set<string>()
  const result = new Map<string, Note[]>()

  for (const column of columns) {
    const ordered = cardOrder
      .filter((entry) => entry.columnId === column.id)
      .map((entry) => noteById.get(entry.noteId))
      .filter((note): note is Note => Boolean(note))
    ordered.forEach((note) => seen.add(note.id))
    result.set(column.id, ordered)
  }

  for (const note of notes) {
    if (seen.has(note.id)) continue
    const statusValue = note.metadata.properties.status?.value
    const column = columns.find((candidate) => candidate.tag === statusValue)
    if (!column) continue
    result.get(column.id)?.push(note)
  }

  return result
}
