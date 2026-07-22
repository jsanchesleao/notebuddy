import { useLiveQuery } from 'dexie-react-hooks'
import { getNote } from '../../domain/notes/noteRepository'
import { SidebarNotebookView } from './SidebarNotebookView'

interface SidebarNoteResolverProps {
  noteId: string
}

export function SidebarNoteResolver({ noteId }: SidebarNoteResolverProps) {
  const note = useLiveQuery(() => getNote(noteId), [noteId])

  if (!note?.notebookId) return null

  return <SidebarNotebookView notebookId={note.notebookId} activeNoteId={noteId} />
}
